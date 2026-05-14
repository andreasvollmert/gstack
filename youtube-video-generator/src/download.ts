import { spawn, execFileSync } from "child_process";
import { mkdirSync } from "fs";
import path from "path";

export interface DownloadResult {
  audioPath: string;
  title: string;
  duration: number;
  description: string;
}

export async function downloadYouTubeAudio(
  url: string,
  outputDir: string
): Promise<DownloadResult> {
  mkdirSync(outputDir, { recursive: true });

  // First fetch metadata
  const meta = await getVideoMetadata(url);

  const safeName = meta.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
  const audioPath = path.join(outputDir, `${safeName}.mp3`);

  console.log(`📥 Lade Audio herunter: "${meta.title}"`);
  console.log(`   Dauer: ${Math.round(meta.duration / 60)} Min`);

  await runYtDlp([
    "--extract-audio",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "0",
    "--output",
    audioPath,
    "--no-playlist",
    "--no-check-certificate",
    url,
  ]);

  return {
    audioPath,
    title: meta.title,
    duration: meta.duration,
    description: meta.description,
  };
}

async function getVideoMetadata(url: string): Promise<{
  title: string;
  duration: number;
  description: string;
}> {
  const output = await runYtDlp([
    "--dump-json",
    "--no-playlist",
    "--no-check-certificate",
    url,
  ]);

  const data = JSON.parse(output);
  return {
    title: data.title ?? "Unbekannt",
    duration: data.duration ?? 0,
    description: data.description ?? "",
  };
}

function getBunPath(): string | null {
  try {
    const result = execFileSync("which", ["bun"], { encoding: "utf-8" }).trim();
    return result || null;
  } catch {
    return null;
  }
}

function buildYtDlpArgs(args: string[]): string[] {
  // Bun als JS-Runtime einbinden wenn verfügbar (benötigt für moderne YouTube-Formate)
  const bunPath = getBunPath();
  const runtimeArgs = bunPath ? ["--js-runtimes", `bun:${bunPath}`] : [];
  return [...runtimeArgs, ...args];
}

function runYtDlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn("yt-dlp", buildYtDlpArgs(args));

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      process.stderr.write(d);
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp fehlgeschlagen (Code ${code}): ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`yt-dlp nicht gefunden: ${err.message}`));
    });
  });
}
