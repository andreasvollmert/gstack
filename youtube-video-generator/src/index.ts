#!/usr/bin/env bun
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { downloadYouTubeAudio } from "./download.js";
import { transcribeAudio, formatTranscriptWithTimestamps } from "./transcribe.js";

const HELP = `
youtube-video-generator — Schritt 1: Download + Transkription

Verwendung:
  bun src/index.ts <youtube-url> [optionen]

Optionen:
  --out <verzeichnis>   Ausgabeverzeichnis (Standard: ./output)
  --no-transcribe       Nur Audio herunterladen, nicht transkribieren
  --help                Diese Hilfe

Umgebungsvariablen:
  OPENAI_API_KEY        Benötigt für Transkription (Whisper API)

Beispiel:
  bun src/index.ts https://www.youtube.com/watch?v=dQw4w9WgXcQ
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const url = args.find((a) => a.startsWith("http"));
  if (!url) {
    console.error("❌ Keine YouTube-URL angegeben.");
    console.log(HELP);
    process.exit(1);
  }

  const outIndex = args.indexOf("--out");
  const outputDir = outIndex !== -1 ? args[outIndex + 1] : "./output";
  const skipTranscribe = args.includes("--no-transcribe");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!skipTranscribe && !apiKey) {
    console.error(
      "❌ OPENAI_API_KEY nicht gesetzt. Transkription nicht möglich.\n" +
        "   Tipp: export OPENAI_API_KEY=sk-... oder --no-transcribe verwenden."
    );
    process.exit(1);
  }

  console.log("\n🎬 YouTube Video Generator — Schritt 1: Download + Transkription\n");
  console.log(`   URL: ${url}`);
  console.log(`   Ausgabe: ${path.resolve(outputDir)}\n`);

  // Schritt 1: Download
  const download = await downloadYouTubeAudio(url, outputDir);
  console.log(`\n✅ Audio gespeichert: ${download.audioPath}\n`);

  // Schritt 2: Transkription
  if (!skipTranscribe && apiKey) {
    const transcript = await transcribeAudio(download.audioPath, apiKey);

    // Volltext speichern
    const textPath = download.audioPath.replace(/\.mp3$/, "_transcript.txt");
    writeFileSync(textPath, transcript.text, "utf-8");

    // Mit Timestamps speichern
    const timestampPath = download.audioPath.replace(
      /\.mp3$/,
      "_transcript_timestamps.txt"
    );
    writeFileSync(
      timestampPath,
      formatTranscriptWithTimestamps(transcript),
      "utf-8"
    );

    // JSON für nächste Pipeline-Schritte
    const jsonPath = download.audioPath.replace(/\.mp3$/, "_transcript.json");
    writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          url,
          title: download.title,
          duration: download.duration,
          description: download.description,
          language: transcript.language,
          text: transcript.text,
          segments: transcript.segments,
        },
        null,
        2
      ),
      "utf-8"
    );

    console.log(`\n📄 Dateien gespeichert:`);
    console.log(`   Transkript:            ${textPath}`);
    console.log(`   Mit Timestamps:        ${timestampPath}`);
    console.log(`   JSON (für Schritt 2):  ${jsonPath}`);
    console.log(`\n🚀 Bereit für Schritt 2: Skript-Generierung via Claude API`);
  } else {
    console.log("ℹ️  Transkription übersprungen (--no-transcribe)");
  }
}

main().catch((err) => {
  console.error(`\n❌ Fehler: ${err.message}`);
  process.exit(1);
});
