import OpenAI from "openai";
import { createReadStream, statSync } from "fs";
import path from "path";

const MAX_FILE_SIZE_MB = 25; // OpenAI Whisper API limit

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  text: string;
  segments: TranscriptSegment[];
  language: string;
  duration: number;
}

export async function transcribeAudio(
  audioPath: string,
  apiKey: string
): Promise<TranscriptResult> {
  const client = new OpenAI({ apiKey });

  const fileSizeMB = statSync(audioPath).size / (1024 * 1024);
  console.log(`🎙️  Transkribiere Audio (${fileSizeMB.toFixed(1)} MB)...`);

  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    throw new Error(
      `Datei zu groß (${fileSizeMB.toFixed(1)} MB). Maximum: ${MAX_FILE_SIZE_MB} MB. ` +
        `Für lange Videos bitte in Segmente aufteilen.`
    );
  }

  const response = await client.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  const segments: TranscriptSegment[] =
    (response as any).segments?.map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    })) ?? [];

  const duration = segments.at(-1)?.end ?? 0;

  console.log(`✅ Transkription abgeschlossen`);
  console.log(`   Sprache: ${(response as any).language ?? "unbekannt"}`);
  console.log(`   Segmente: ${segments.length}`);
  console.log(`   Dauer: ${Math.round(duration / 60)} Min`);

  return {
    text: response.text,
    segments,
    language: (response as any).language ?? "unknown",
    duration,
  };
}

export function formatTranscriptWithTimestamps(
  result: TranscriptResult
): string {
  return result.segments
    .map((s) => {
      const start = formatTime(s.start);
      return `[${start}] ${s.text}`;
    })
    .join("\n");
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}
