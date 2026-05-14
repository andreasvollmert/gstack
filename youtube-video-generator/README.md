# YouTube Video Generator

Pipeline: YouTube-Video → Transkript → KI-Skript → neues Video (Remotion / Seedance 2)

## Status

| Schritt | Beschreibung | Status |
|---------|-------------|--------|
| **1** | YouTube Download + Transkription | ✅ Fertig |
| **2** | Inhaltsanalyse + Skript-Generierung (Claude) | ✅ Fertig |
| **3** | Video-Rendering (Remotion) | ✅ Fertig |

## Schnellstart

```bash
bun install

# Vollständige Pipeline
OPENAI_API_KEY=sk-...    bun src/index.ts https://youtube.com/watch?v=VIDEO_ID
ANTHROPIC_API_KEY=sk-... bun src/generate-script.ts ./output/*_transcript.json --product "Seedance 2"
                         bun src/render.ts ./output/*_script.json
```

## Voraussetzungen

| Tool | Installation |
|------|-------------|
| `yt-dlp` | `pip install yt-dlp` |
| `ffmpeg` | `apt install ffmpeg` / `brew install ffmpeg` |
| `OPENAI_API_KEY` | Whisper-Transkription |
| `ANTHROPIC_API_KEY` | Claude-Skript-Generierung |

---

## Schritt 1: Download + Transkription

```bash
OPENAI_API_KEY=sk-... bun src/index.ts https://www.youtube.com/watch?v=VIDEO_ID

# Nur Audio (kein API-Key)
bun src/index.ts https://... --no-transcribe

# Eigenes Ausgabeverzeichnis
OPENAI_API_KEY=sk-... bun src/index.ts https://... --out ./mein-projekt
```

**Ausgabe:**

| Datei | Inhalt |
|-------|--------|
| `*.mp3` | Audio |
| `*_transcript.txt` | Volltext |
| `*_transcript_timestamps.txt` | Mit `[MM:SS]` Zeitstempeln |
| `*_transcript.json` | JSON → Eingabe für Schritt 2 |

---

## Schritt 2: Skript-Generierung (Claude API)

```bash
ANTHROPIC_API_KEY=sk-... bun src/generate-script.ts \
  ./output/mein_video_transcript.json \
  --product "Seedance 2"
```

**Ausgabe:**

| Datei | Inhalt |
|-------|--------|
| `*_script.json` | Strukturiertes Skript (→ Schritt 3) |
| `*_script.md` | Lesbares Markdown zum Review |

**Pro Szene enthält das Skript:**
- `narration` — Sprechertext
- `visualDescription` — Was zu sehen ist
- `onScreenText` — Einblendungen / Captions
- `bRollSuggestions` — B-Roll Ideen
- `seedancePrompt` — Englischer Prompt für Seedance 2

---

## Schritt 3: Video-Rendering (Remotion)

```bash
# Video rendern (MP4)
bun src/render.ts ./output/mein_video_script.json

# Vorschau im Browser (Remotion Studio)
bun src/render.ts ./output/mein_video_script.json --preview

# Oder direkt Remotion Studio öffnen
bun run studio
```

**Remotion-Komponenten:**

| Komponente | Funktion |
|-----------|---------|
| `TitleScene` | Intro mit Gradient, Titel, Kernbotschaften |
| `ContentScene` | Szenen mit Narration, On-Screen-Text, Progress-Bar |
| `OutroScene` | Zusammenfassung mit Checkmarks |
| `FadeIn`, `SlideUp` | Animations-Primitives |
| `Caption` | Progressives Wort-für-Wort Text-Rendering |

---

## Architektur

```
YouTube-URL
    ↓
yt-dlp (Schritt 1)       → Audio als MP3
    ↓
OpenAI Whisper API        → *_transcript.json
    ↓
Claude claude-opus-4-7    → *_script.json
(adaptive thinking,       → *_script.md
 structured JSON output)
    ↓
Remotion (Schritt 3)      → Video.mp4
```

## Projektstruktur

```
youtube-video-generator/
├── src/
│   ├── index.ts              # Schritt 1 CLI
│   ├── download.ts           # yt-dlp Wrapper
│   ├── transcribe.ts         # OpenAI Whisper
│   ├── generate-script.ts    # Schritt 2 CLI
│   ├── analyze.ts            # Claude API Integration
│   ├── render.ts             # Schritt 3 CLI
│   └── test-transcribe.ts    # Standalone Transkription
├── remotion/
│   └── src/
│       ├── Root.tsx           # Remotion Entry Point
│       ├── VideoComposition.tsx
│       ├── types.ts
│       ├── scenes/
│       │   ├── TitleScene.tsx
│       │   ├── ContentScene.tsx
│       │   └── OutroScene.tsx
│       └── components/
│           ├── FadeIn.tsx
│           ├── SlideUp.tsx
│           ├── Caption.tsx
│           └── ProgressBar.tsx
└── output/                   # Alle generierten Dateien
```
