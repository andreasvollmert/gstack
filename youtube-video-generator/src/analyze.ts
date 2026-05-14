import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";

export interface VideoScene {
  scene: number;
  title: string;
  durationSeconds: number;
  narration: string;
  visualDescription: string;
  onScreenText: string;
  bRollSuggestions: string[];
  seedancePrompt: string;
}

export interface VideoScript {
  title: string;
  targetAudience: string;
  tone: string;
  totalDurationSeconds: number;
  keyMessages: string[];
  scenes: VideoScene[];
  remotionNotes: string;
}

export interface TranscriptData {
  url: string;
  title: string;
  duration: number;
  description: string;
  language: string;
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
}

const SCRIPT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    targetAudience: { type: "string" },
    tone: { type: "string" },
    totalDurationSeconds: { type: "number" },
    keyMessages: { type: "array", items: { type: "string" } },
    scenes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          scene: { type: "number" },
          title: { type: "string" },
          durationSeconds: { type: "number" },
          narration: { type: "string" },
          visualDescription: { type: "string" },
          onScreenText: { type: "string" },
          bRollSuggestions: { type: "array", items: { type: "string" } },
          seedancePrompt: { type: "string" },
        },
        required: [
          "scene",
          "title",
          "durationSeconds",
          "narration",
          "visualDescription",
          "onScreenText",
          "bRollSuggestions",
          "seedancePrompt",
        ],
        additionalProperties: false,
      },
    },
    remotionNotes: { type: "string" },
  },
  required: [
    "title",
    "targetAudience",
    "tone",
    "totalDurationSeconds",
    "keyMessages",
    "scenes",
    "remotionNotes",
  ],
  additionalProperties: false,
};

export async function analyzeAndGenerateScript(
  transcriptPath: string,
  apiKey: string,
  targetProduct?: string
): Promise<VideoScript> {
  const raw = readFileSync(transcriptPath, "utf-8");
  const transcript: TranscriptData = JSON.parse(raw);

  const client = new Anthropic({ apiKey });

  const product = targetProduct ?? "Seedance 2 / Remotion";

  console.log(`🧠 Analysiere Transkript: "${transcript.title}"`);
  console.log(`   Ziel: Video über ${product} erstellen`);
  console.log(`   Transkript-Länge: ${transcript.text.length} Zeichen\n`);

  const systemPrompt = `Du bist ein erfahrener Video-Skript-Autor und Content-Stratege.
Du analysierst Video-Transkripte und erstellst daraus professionelle Video-Skripte.

Deine Aufgabe:
1. Verstehe die Kernbotschaft, Struktur und den Stil des Original-Videos
2. Erstelle ein neues, vergleichbares Video-Skript — gleicher Stil, gleiche Energie, aber über ein anderes Thema
3. Jede Szene erhält konkrete Anweisungen für KI-Videogenerierung (Seedance 2) und für Remotion (React-basiertes Video-Rendering)

Für seedancePrompt: Schreibe präzise englische Prompts für KI-Videogenerierung.
Für remotionNotes: Beschreibe welche Remotion-Komponenten sinnvoll wären.`;

  const userPrompt = `Hier ist das Transkript eines YouTube-Videos:

**Titel:** ${transcript.title}
**Dauer:** ${Math.round(transcript.duration / 60)} Minuten
**Sprache:** ${transcript.language}

**Transkript:**
${transcript.text.slice(0, 8000)}${transcript.text.length > 8000 ? "\n\n[...Transkript gekürzt...]" : ""}

---

Erstelle jetzt ein vergleichbares Video-Skript über: **${product}**

Das neue Video soll:
- Den gleichen Stil und die gleiche Energie wie das Original haben
- Ähnliche Struktur und Dramaturgie verwenden
- 5-8 Szenen umfassen
- Für KI-Videogenerierung (Seedance 2) und Remotion optimiert sein
- Professionell und ansprechend sein

Antworte ausschließlich mit einem validen JSON-Objekt gemäß dem angegebenen Schema.`;

  const stream = await client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: {
        type: "json_schema",
        name: "video_script",
        schema: SCRIPT_SCHEMA,
      },
    },
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  process.stdout.write("   Generiere Skript");

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      process.stdout.write(".");
    }
  }

  const finalMessage = await stream.finalMessage();
  process.stdout.write(" fertig!\n\n");

  console.log(
    `   Tokens: ${finalMessage.usage.input_tokens} input / ${finalMessage.usage.output_tokens} output`
  );

  const textBlock = finalMessage.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Keine Text-Antwort von Claude erhalten");
  }

  return JSON.parse(textBlock.text) as VideoScript;
}

export function formatScriptMarkdown(script: VideoScript): string {
  const lines: string[] = [
    `# ${script.title}`,
    "",
    `**Zielgruppe:** ${script.targetAudience}`,
    `**Ton:** ${script.tone}`,
    `**Gesamtdauer:** ${Math.round(script.totalDurationSeconds / 60)} Min ${script.totalDurationSeconds % 60} Sek`,
    "",
    "## Kernbotschaften",
    ...script.keyMessages.map((m) => `- ${m}`),
    "",
    "---",
    "",
    "## Szenen",
    "",
  ];

  for (const scene of script.scenes) {
    lines.push(
      `### Szene ${scene.scene}: ${scene.title}`,
      `**Dauer:** ${scene.durationSeconds}s`,
      "",
      "**Narration:**",
      `> ${scene.narration}`,
      "",
      "**Visuelle Beschreibung:**",
      scene.visualDescription,
      "",
      "**Einblendung:**",
      `\`${scene.onScreenText}\``,
      "",
      "**B-Roll Vorschläge:**",
      ...scene.bRollSuggestions.map((b) => `- ${b}`),
      "",
      "**Seedance 2 Prompt:**",
      `\`\`\``,
      scene.seedancePrompt,
      `\`\`\``,
      "",
      "---",
      ""
    );
  }

  lines.push("## Remotion Hinweise", "", script.remotionNotes);

  return lines.join("\n");
}
