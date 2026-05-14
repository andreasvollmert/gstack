#!/usr/bin/env bun
/**
 * Dashboard-Server für den YouTube Video Generator
 *
 * Verwendung:
 *   bun src/server.ts [--port 3000]
 */

import { existsSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";
import { loadConfig, saveConfig } from "./config-store.js";
import {
  createJob,
  deleteJob,
  getJob,
  getJobs,
  loadPersistedJobs,
  reRenderJob,
  runJob,
  subscribe,
  unsubscribe,
} from "./job-runner.js";

const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const PORT = portIdx >= 0 ? parseInt(args[portIdx + 1] ?? "3000", 10) : 3000;

const ROOT_DIR = path.join(
  path.dirname(import.meta.url.replace("file://", "")),
  ".."
);
const OUTPUT_DIR = path.join(ROOT_DIR, "output");
const DASHBOARD_DIR = path.join(ROOT_DIR, "dashboard");

loadPersistedJobs();

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400): Response {
  return json({ error: msg }, status);
}

function cors(res: Response): Response {
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;
  const method = req.method;

  // ── Static dashboard ────────────────────────────────────────────────────
  if (pathname === "/" || pathname === "/index.html") {
    const html = readFileSync(path.join(DASHBOARD_DIR, "index.html"), "utf-8");
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  // ── Serve output files (videos, etc.) ───────────────────────────────────
  if (pathname.startsWith("/output/")) {
    const filename = decodeURIComponent(pathname.slice("/output/".length));
    const filePath = path.join(OUTPUT_DIR, filename);
    if (!existsSync(filePath) || !filePath.startsWith(OUTPUT_DIR)) {
      return err("Datei nicht gefunden", 404);
    }
    const ext = path.extname(filename).toLowerCase();
    const mime =
      ext === ".mp4"
        ? "video/mp4"
        : ext === ".json"
        ? "application/json"
        : ext === ".md"
        ? "text/markdown"
        : ext === ".mp3"
        ? "audio/mpeg"
        : "application/octet-stream";
    const file = Bun.file(filePath);
    return new Response(file, { headers: { "Content-Type": mime } });
  }

  // ── API ──────────────────────────────────────────────────────────────────
  if (!pathname.startsWith("/api/")) {
    return err("Nicht gefunden", 404);
  }

  // OPTIONS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // GET /api/config
  if (pathname === "/api/config" && method === "GET") {
    const cfg = loadConfig();
    return cors(
      json({
        openaiApiKey: cfg.openaiApiKey ? "••••" + cfg.openaiApiKey.slice(-4) : "",
        anthropicApiKey: cfg.anthropicApiKey
          ? "••••" + cfg.anthropicApiKey.slice(-4)
          : "",
        openaiKeySet: !!cfg.openaiApiKey,
        anthropicKeySet: !!cfg.anthropicApiKey,
      })
    );
  }

  // POST /api/config
  if (pathname === "/api/config" && method === "POST") {
    const body = await req.json().catch(() => ({}));
    const existing = loadConfig();
    const updated = {
      openaiApiKey:
        body.openaiApiKey && !body.openaiApiKey.startsWith("••••")
          ? body.openaiApiKey
          : existing.openaiApiKey,
      anthropicApiKey:
        body.anthropicApiKey && !body.anthropicApiKey.startsWith("••••")
          ? body.anthropicApiKey
          : existing.anthropicApiKey,
    };
    saveConfig(updated);
    return cors(json({ success: true }));
  }

  // GET /api/jobs
  if (pathname === "/api/jobs" && method === "GET") {
    return cors(json(getJobs().map((j) => ({ ...j, logs: undefined }))));
  }

  // POST /api/jobs
  if (pathname === "/api/jobs" && method === "POST") {
    const body = await req.json().catch(() => ({}));
    const { url, product } = body;
    if (!url) return err("url erforderlich");

    const cfg = loadConfig();
    if (!cfg.openaiApiKey) return err("OpenAI API Key nicht konfiguriert");
    if (!cfg.anthropicApiKey) return err("Anthropic API Key nicht konfiguriert");

    const job = createJob(url, product ?? "Seedance 2");
    // Run asynchronously
    runJob(job.id, cfg.openaiApiKey, cfg.anthropicApiKey).catch(() => {});
    return cors(json(job));
  }

  // GET /api/jobs/:id
  const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)$/);
  if (jobMatch && method === "GET") {
    const job = getJob(jobMatch[1]);
    if (!job) return err("Job nicht gefunden", 404);
    return cors(json(job));
  }

  // DELETE /api/jobs/:id
  if (jobMatch && method === "DELETE") {
    const deleted = deleteJob(jobMatch[1]);
    return cors(json({ success: deleted }));
  }

  // GET /api/jobs/:id/events (SSE)
  const eventsMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/events$/);
  if (eventsMatch && method === "GET") {
    const jobId = eventsMatch[1];
    const job = getJob(jobId);
    if (!job) return err("Job nicht gefunden", 404);

    let controller: ReadableStreamDefaultController;
    const stream = new ReadableStream({
      start(ctrl) {
        controller = ctrl;
        subscribe(jobId, ctrl);

        // Send buffered logs immediately
        const enc = new TextEncoder();
        for (const log of job.logs) {
          ctrl.enqueue(
            enc.encode(`event: log\ndata: ${JSON.stringify(log)}\n\n`)
          );
        }
        // Send current status
        const { logs: _, ...summary } = job;
        ctrl.enqueue(
          enc.encode(`event: status\ndata: ${JSON.stringify(summary)}\n\n`)
        );

        if (job.status === "done" || job.status === "error") {
          ctrl.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
        }
      },
      cancel() {
        unsubscribe(jobId, controller);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // POST /api/jobs/:id/rerender
  const rerenderMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/rerender$/);
  if (rerenderMatch && method === "POST") {
    const jobId = rerenderMatch[1];
    const job = getJob(jobId);
    if (!job) return err("Job nicht gefunden", 404);
    if (!job.files.scriptJson) return err("Kein Skript vorhanden");
    reRenderJob(jobId).catch(() => {});
    return cors(json({ success: true }));
  }

  // GET /api/jobs/:id/script
  const scriptMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/script$/);
  if (scriptMatch && method === "GET") {
    const job = getJob(scriptMatch[1]);
    if (!job) return err("Job nicht gefunden", 404);
    if (!job.files.scriptJson || !existsSync(job.files.scriptJson)) {
      return err("Skript nicht gefunden", 404);
    }
    const content = readFileSync(job.files.scriptJson, "utf-8");
    return cors(
      new Response(content, { headers: { "Content-Type": "application/json" } })
    );
  }

  // PUT /api/jobs/:id/script
  if (scriptMatch && method === "PUT") {
    const job = getJob(scriptMatch[1]);
    if (!job) return err("Job nicht gefunden", 404);
    if (!job.files.scriptJson) return err("Kein Skript vorhanden");
    const body = await req.text();
    try {
      JSON.parse(body); // validate JSON
    } catch {
      return err("Ungültiges JSON");
    }
    writeFileSync(job.files.scriptJson, body, "utf-8");
    return cors(json({ success: true }));
  }

  return err("Nicht gefunden", 404);
}

const server = Bun.serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`\n🎬 YouTube Video Generator — Dashboard\n`);
console.log(`   → http://localhost:${PORT}\n`);
console.log(`   Ctrl+C zum Beenden\n`);
