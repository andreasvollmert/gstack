#!/usr/bin/env bun
/**
 * Schritt 3: Video rendern mit Remotion
 *
 * Verwendung:
 *   bun src/render.ts <script.json> [--out output.mp4] [--preview]
 */
import { execSync, spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import type { VideoScript } from "./analyze.js";

const HELP = `
youtube-video-generator — Schritt 3: Video-Rendering (Remotion)

Verwendung:
  bun src/render.ts <script.json> [optionen]

Optionen:
  --out <datei>     Ausgabe-MP4 (Standard: <script-name>.mp4)
  --preview         Remotion Studio im Browser öffnen (kein Render)
  --help            Diese Hilfe

Eingabe:
  Das *_script.json aus Schritt 2 (bun src/generate-script.ts ...)

Beispiel:
  bun src/render.ts ./output/video_script.json
  bun src/render.ts ./output/video_script.json --preview
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const scriptPath = args.find(
    (a) => !a.startsWith("--") && a.endsWith(".json")
  );
  if (!scriptPath || !existsSync(scriptPath)) {
    console.error(`❌ Script-Datei nicht gefunden: ${scriptPath ?? "(keine angegeben)"}`);
    process.exit(1);
  }

  const outIdx = args.indexOf("--out");
  const outFile =
    outIdx !== -1
      ? args[outIdx + 1]
      : scriptPath.replace(/_script\.json$/, ".mp4");

  const isPreview = args.includes("--preview");

  const script: VideoScript = JSON.parse(readFileSync(scriptPath, "utf-8"));

  console.log("\n🎬 YouTube Video Generator — Schritt 3: Remotion Rendering\n");
  console.log(`   Skript:  ${scriptPath}`);
  console.log(`   Titel:   ${script.title}`);
  console.log(`   Szenen:  ${script.scenes.length}`);
  console.log(
    `   Dauer:   ${Math.round(script.totalDurationSeconds / 60)} Min\n`
  );

  const remotionRoot = path.join(
    path.dirname(import.meta.url.replace("file://", "")),
    "..",
    "remotion",
    "src",
    "Root.tsx"
  );

  // Props als JSON für Remotion
  const props = JSON.stringify({ script });
  const propsFile = scriptPath.replace(/_script\.json$/, "_remotion_props.json");
  import("fs").then(({ writeFileSync }) => writeFileSync(propsFile, props));

  if (isPreview) {
    console.log("🖥️  Öffne Remotion Studio...\n");
    const proc = spawn(
      "npx",
      ["remotion", "studio", remotionRoot, "--props", propsFile],
      {
        stdio: "inherit",
        cwd: path.dirname(remotionRoot),
      }
    );
    proc.on("close", (code) => process.exit(code ?? 0));
    return;
  }

  console.log(`🎞️  Rendere Video nach ${outFile}...`);
  console.log("   (Das dauert einige Minuten)\n");

  const renderCmd = [
    "npx",
    "remotion",
    "render",
    remotionRoot,
    "VideoScript",
    outFile,
    "--props",
    propsFile,
    "--log",
    "verbose",
  ].join(" ");

  try {
    execSync(renderCmd, {
      stdio: "inherit",
      cwd: path.resolve(
        path.dirname(import.meta.url.replace("file://", "")),
        ".."
      ),
    });
    console.log(`\n✅ Video fertig: ${outFile}`);
  } catch (err) {
    console.error("\n❌ Render fehlgeschlagen. Tipp: --preview für Browser-Vorschau.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n❌ Fehler: ${err.message}`);
  process.exit(1);
});
