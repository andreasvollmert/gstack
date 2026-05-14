#!/usr/bin/env bun
/**
 * Schritt 2: Transkript analysieren + Video-Skript generieren (Claude API)
 *
 * Verwendung:
 *   ANTHROPIC_API_KEY=sk-... bun src/generate-script.ts <transcript.json> [--product "Seedance 2"] [--out ./output]
 */
import { writeFileSync } from "fs";
import path from "path";
import {
  analyzeAndGenerateScript,
  formatScriptMarkdown,
} from "./analyze.js";

const HELP = `
youtube-video-generator — Schritt 2: Inhaltsanalyse + Skript-Generierung

Verwendung:
  ANTHROPIC_API_KEY=sk-... bun src/generate-script.ts <transcript.json> [optionen]

Optionen:
  --product <name>     Ziel-Produkt/Thema des neuen Videos (Standard: "Seedance 2 / Remotion")
  --out <verzeichnis>  Ausgabeverzeichnis (Standard: gleicher Ordner wie Transkript)
  --help               Diese Hilfe

Eingabe:
  Das *_transcript.json aus Schritt 1 (bun src/index.ts <youtube-url>)

Ausgabe:
  *_script.json    — Strukturiertes Skript (JSON) für Schritt 3 (Rendering)
  *_script.md      — Lesbares Markdown-Skript

Beispiel:
  ANTHROPIC_API_KEY=sk-... bun src/generate-script.ts ./output/video_transcript.json --product "Remotion"
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const transcriptPath = args.find(
    (a) => !a.startsWith("--") && a.endsWith(".json")
  );
  if (!transcriptPath) {
    console.error("❌ Kein Transkript-Pfad angegeben (*.json erwartet).");
    console.log(HELP);
    process.exit(1);
  }

  const productIdx = args.indexOf("--product");
  const product =
    productIdx !== -1 ? args[productIdx + 1] : "Seedance 2 / Remotion";

  const outIdx = args.indexOf("--out");
  const outputDir =
    outIdx !== -1 ? args[outIdx + 1] : path.dirname(transcriptPath);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ ANTHROPIC_API_KEY nicht gesetzt.\n" +
        "   Tipp: export ANTHROPIC_API_KEY=sk-ant-..."
    );
    process.exit(1);
  }

  console.log("\n🎬 YouTube Video Generator — Schritt 2: Skript-Generierung\n");
  console.log(`   Transkript: ${transcriptPath}`);
  console.log(`   Produkt:    ${product}`);
  console.log(`   Ausgabe:    ${path.resolve(outputDir)}\n`);

  const script = await analyzeAndGenerateScript(transcriptPath, apiKey, product);

  const base = transcriptPath.replace(/_transcript\.json$/, "");
  const scriptJsonPath = path.join(outputDir, path.basename(`${base}_script.json`));
  const scriptMdPath = path.join(outputDir, path.basename(`${base}_script.md`));

  writeFileSync(scriptJsonPath, JSON.stringify(script, null, 2), "utf-8");
  writeFileSync(scriptMdPath, formatScriptMarkdown(script), "utf-8");

  console.log(`✅ Skript generiert: "${script.title}"`);
  console.log(`   Szenen:    ${script.scenes.length}`);
  console.log(
    `   Dauer:     ${Math.round(script.totalDurationSeconds / 60)} Min`
  );
  console.log(`\n📄 Dateien gespeichert:`);
  console.log(`   JSON:     ${scriptJsonPath}`);
  console.log(`   Markdown: ${scriptMdPath}`);
  console.log(
    `\n🚀 Bereit für Schritt 3: Video-Rendering (Remotion / Seedance 2)`
  );

  // Vorschau der ersten Szene
  if (script.scenes.length > 0) {
    const s = script.scenes[0];
    console.log(`\n📋 Vorschau — Szene 1: "${s.title}"`);
    console.log(`   Narration: ${s.narration.slice(0, 120)}...`);
    console.log(`   Seedance:  ${s.seedancePrompt.slice(0, 100)}...`);
  }
}

main().catch((err) => {
  console.error(`\n❌ Fehler: ${err.message}`);
  process.exit(1);
});
