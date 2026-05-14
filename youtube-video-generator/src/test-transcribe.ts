#!/usr/bin/env bun
/**
 * Standalone-Test für die Transkription ohne YouTube-Download.
 * Verwendung: bun src/test-transcribe.ts <audio-datei.mp3>
 */
import { writeFileSync } from "fs";
import path from "path";
import { transcribeAudio, formatTranscriptWithTimestamps } from "./transcribe.js";

const audioPath = process.argv[2];
if (!audioPath) {
  console.error("Verwendung: bun src/test-transcribe.ts <audio-datei.mp3>");
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌ OPENAI_API_KEY nicht gesetzt");
  process.exit(1);
}

const result = await transcribeAudio(audioPath, apiKey);

const base = audioPath.replace(/\.[^.]+$/, "");
writeFileSync(`${base}_transcript.txt`, result.text, "utf-8");
writeFileSync(`${base}_transcript_timestamps.txt`, formatTranscriptWithTimestamps(result), "utf-8");
writeFileSync(`${base}_transcript.json`, JSON.stringify(result, null, 2), "utf-8");

console.log(`\nGespeichert: ${base}_transcript.{txt,json}`);
