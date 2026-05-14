import { spawn } from "child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import path from "path";
import { randomUUID } from "crypto";

const SRC_DIR = path.dirname(import.meta.url.replace("file://", ""));
const ROOT_DIR = path.join(SRC_DIR, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "output");
const JOBS_FILE = path.join(OUTPUT_DIR, ".jobs.json");

export type StepStatus = "pending" | "running" | "done" | "error";
export type JobStatus = "pending" | "running" | "done" | "error";

export interface JobStep {
  step: number;
  name: string;
  status: StepStatus;
  startedAt?: number;
  finishedAt?: number;
}

export interface LogEntry {
  ts: number;
  text: string;
  stream: "stdout" | "stderr";
}

export interface JobFiles {
  audio?: string;
  transcriptJson?: string;
  scriptJson?: string;
  scriptMd?: string;
  video?: string;
}

export interface Job {
  id: string;
  url: string;
  product: string;
  title: string;
  status: JobStatus;
  currentStep: number;
  steps: JobStep[];
  logs: LogEntry[];
  files: JobFiles;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// In-memory store
const jobs = new Map<string, Job>();

// SSE subscribers: jobId -> Set of controllers
const subscribers = new Map<string, Set<ReadableStreamDefaultController>>();

export function getJobs(): Job[] {
  return Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function deleteJob(id: string): boolean {
  return jobs.delete(id);
}

export function subscribe(
  jobId: string,
  controller: ReadableStreamDefaultController
): void {
  if (!subscribers.has(jobId)) subscribers.set(jobId, new Set());
  subscribers.get(jobId)!.add(controller);
}

export function unsubscribe(
  jobId: string,
  controller: ReadableStreamDefaultController
): void {
  subscribers.get(jobId)?.delete(controller);
}

function emit(jobId: string, event: string, data: unknown): void {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const ctrl of subscribers.get(jobId) ?? []) {
    try {
      ctrl.enqueue(new TextEncoder().encode(msg));
    } catch {
      // client disconnected
    }
  }
}

function updateJob(job: Job, patch: Partial<Job>): void {
  Object.assign(job, patch, { updatedAt: Date.now() });
  persistJobs();
  emit(job.id, "status", jobToSummary(job));
}

function addLog(job: Job, text: string, stream: "stdout" | "stderr" = "stdout"): void {
  const entry: LogEntry = { ts: Date.now(), text: text.trimEnd(), stream };
  job.logs.push(entry);
  job.updatedAt = Date.now();
  emit(job.id, "log", entry);
}

function jobToSummary(job: Job) {
  const { logs: _, ...rest } = job;
  return rest;
}

function persistJobs(): void {
  try {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const data = Array.from(jobs.values()).map((j) => ({ ...j, logs: [] }));
    writeFileSync(JOBS_FILE, JSON.stringify(data, null, 2));
  } catch {
    // non-critical
  }
}

export function loadPersistedJobs(): void {
  if (!existsSync(JOBS_FILE)) return;
  try {
    const data: Job[] = JSON.parse(readFileSync(JOBS_FILE, "utf-8"));
    for (const job of data) {
      job.logs = [];
      if (job.status === "running") {
        job.status = "error";
        job.error = "Server wurde neu gestartet";
        for (const step of job.steps) {
          if (step.status === "running") step.status = "error";
        }
      }
      jobs.set(job.id, job);
    }
  } catch {
    // corrupt file, ignore
  }
}

function findNewestFile(dir: string, suffix: string, since: number): string | undefined {
  if (!existsSync(dir)) return undefined;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(suffix))
    .map((f) => ({ name: f, mtime: statSync(path.join(dir, f)).mtimeMs }))
    .filter((f) => f.mtime >= since)
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ? path.join(dir, files[0].name) : undefined;
}

function runProcess(
  job: Job,
  cmd: string,
  args: string[],
  env: Record<string, string>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      env: { ...process.env, ...env },
      cwd: ROOT_DIR,
    });

    proc.stdout.on("data", (d: Buffer) => {
      for (const line of d.toString().split("\n")) {
        if (line.trim()) addLog(job, line, "stdout");
      }
    });

    proc.stderr.on("data", (d: Buffer) => {
      for (const line of d.toString().split("\n")) {
        if (line.trim()) addLog(job, line, "stderr");
      }
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Prozess beendet mit Code ${code}`));
    });

    proc.on("error", (err) => reject(err));
  });
}

export function createJob(url: string, product: string): Job {
  const id = randomUUID();
  const job: Job = {
    id,
    url,
    product,
    title: url,
    status: "pending",
    currentStep: 0,
    steps: [
      { step: 1, name: "Download & Transkription", status: "pending" },
      { step: 2, name: "Skript-Generierung (Claude)", status: "pending" },
      { step: 3, name: "Video-Rendering (Remotion)", status: "pending" },
    ],
    logs: [],
    files: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(id, job);
  persistJobs();
  return job;
}

export async function runJob(
  jobId: string,
  openaiKey: string,
  anthropicKey: string
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) throw new Error("Job nicht gefunden");

  updateJob(job, { status: "running", currentStep: 1 });

  // ── Step 1: Download + Transcribe ──────────────────────────────────────
  const step1 = job.steps[0];
  updateJob(job, { steps: [...job.steps] });
  step1.status = "running";
  step1.startedAt = Date.now();
  updateJob(job, { steps: [...job.steps] });

  addLog(job, "▶ Schritt 1: Download & Transkription");

  const before1 = Date.now();
  try {
    await runProcess(
      job,
      "bun",
      ["src/index.ts", job.url, "--out", OUTPUT_DIR],
      { OPENAI_API_KEY: openaiKey }
    );
  } catch (err: any) {
    step1.status = "error";
    step1.finishedAt = Date.now();
    updateJob(job, { status: "error", error: err.message, steps: [...job.steps] });
    emit(job.id, "done", { error: err.message });
    return;
  }

  const transcriptJson = findNewestFile(OUTPUT_DIR, "_transcript.json", before1);
  if (!transcriptJson) {
    const msg = "Transkript-Datei nicht gefunden nach Schritt 1";
    step1.status = "error";
    step1.finishedAt = Date.now();
    updateJob(job, { status: "error", error: msg, steps: [...job.steps] });
    emit(job.id, "done", { error: msg });
    return;
  }

  // Extract title from transcript
  try {
    const td = JSON.parse(readFileSync(transcriptJson, "utf-8"));
    updateJob(job, { title: td.title ?? job.url });
  } catch {
    // ignore
  }

  step1.status = "done";
  step1.finishedAt = Date.now();
  updateJob(job, {
    currentStep: 2,
    files: { ...job.files, transcriptJson },
    steps: [...job.steps],
  });
  addLog(job, `✅ Schritt 1 abgeschlossen: ${path.basename(transcriptJson)}`);

  // ── Step 2: Script Generation ───────────────────────────────────────────
  const step2 = job.steps[1];
  step2.status = "running";
  step2.startedAt = Date.now();
  updateJob(job, { steps: [...job.steps] });

  addLog(job, "▶ Schritt 2: Skript-Generierung mit Claude");

  const before2 = Date.now();
  try {
    await runProcess(
      job,
      "bun",
      ["src/generate-script.ts", transcriptJson, "--product", job.product],
      { ANTHROPIC_API_KEY: anthropicKey }
    );
  } catch (err: any) {
    step2.status = "error";
    step2.finishedAt = Date.now();
    updateJob(job, { status: "error", error: err.message, steps: [...job.steps] });
    emit(job.id, "done", { error: err.message });
    return;
  }

  const scriptJson = findNewestFile(OUTPUT_DIR, "_script.json", before2);
  const scriptMd = findNewestFile(OUTPUT_DIR, "_script.md", before2);
  if (!scriptJson) {
    const msg = "Skript-Datei nicht gefunden nach Schritt 2";
    step2.status = "error";
    step2.finishedAt = Date.now();
    updateJob(job, { status: "error", error: msg, steps: [...job.steps] });
    emit(job.id, "done", { error: msg });
    return;
  }

  step2.status = "done";
  step2.finishedAt = Date.now();
  updateJob(job, {
    currentStep: 3,
    files: { ...job.files, scriptJson, scriptMd },
    steps: [...job.steps],
  });
  addLog(job, `✅ Schritt 2 abgeschlossen: ${path.basename(scriptJson)}`);

  // ── Step 3: Render ──────────────────────────────────────────────────────
  const step3 = job.steps[2];
  step3.status = "running";
  step3.startedAt = Date.now();
  updateJob(job, { steps: [...job.steps] });

  addLog(job, "▶ Schritt 3: Video-Rendering mit Remotion");

  const before3 = Date.now();
  try {
    await runProcess(
      job,
      "bun",
      ["src/render.ts", scriptJson],
      {}
    );
  } catch (err: any) {
    step3.status = "error";
    step3.finishedAt = Date.now();
    updateJob(job, { status: "error", error: err.message, steps: [...job.steps] });
    emit(job.id, "done", { error: err.message });
    return;
  }

  const video = findNewestFile(OUTPUT_DIR, ".mp4", before3);

  step3.status = "done";
  step3.finishedAt = Date.now();
  updateJob(job, {
    status: "done",
    currentStep: 3,
    files: { ...job.files, video },
    steps: [...job.steps],
  });
  addLog(job, video ? `✅ Video fertig: ${path.basename(video)}` : "✅ Schritt 3 abgeschlossen");
  emit(job.id, "done", { success: true });
}

export async function reRenderJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job || !job.files.scriptJson) throw new Error("Skript nicht gefunden");

  const step3 = job.steps[2];
  step3.status = "running";
  step3.startedAt = Date.now();
  step3.finishedAt = undefined;
  updateJob(job, { status: "running", currentStep: 3, steps: [...job.steps] });

  addLog(job, "▶ Re-Render: Video-Rendering mit Remotion");

  const before = Date.now();
  try {
    await runProcess(job, "bun", ["src/render.ts", job.files.scriptJson], {});
  } catch (err: any) {
    step3.status = "error";
    step3.finishedAt = Date.now();
    updateJob(job, { status: "error", error: err.message, steps: [...job.steps] });
    emit(job.id, "done", { error: err.message });
    return;
  }

  const video = findNewestFile(OUTPUT_DIR, ".mp4", before) ?? job.files.video;
  step3.status = "done";
  step3.finishedAt = Date.now();
  updateJob(job, {
    status: "done",
    files: { ...job.files, video },
    steps: [...job.steps],
  });
  addLog(job, video ? `✅ Video fertig: ${path.basename(video)}` : "✅ Re-Render abgeschlossen");
  emit(job.id, "done", { success: true });
}
