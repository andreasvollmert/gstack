# YouTube Video Generator

Pipeline: YouTube-Video → Transkript → KI-Skript → neues Video (Remotion / Seedance 2)

## Status

| Schritt | Beschreibung | Status |
|---------|-------------|--------|
| **1** | YouTube Download + Transkription | ✅ Fertig |
| **2** | Inhaltsanalyse + Skript-Generierung (Claude) | 🔜 Geplant |
| **3** | Video-Rendering (Remotion / Seedance 2) | 🔜 Geplant |

## Setup

```bash
bun install
```

Voraussetzungen (automatisch geprüft):
- `yt-dlp` (`pip install yt-dlp`)
- `ffmpeg` (für Audio-Extraktion)
- `OPENAI_API_KEY` (für Whisper-Transkription)

## Schritt 1: Download + Transkription

```bash
# Vollständige Pipeline (Download + Transkription)
OPENAI_API_KEY=sk-... bun src/index.ts https://www.youtube.com/watch?v=VIDEO_ID

# Nur Download (kein API-Key nötig)
bun src/index.ts https://www.youtube.com/watch?v=VIDEO_ID --no-transcribe

# Eigenes Ausgabeverzeichnis
OPENAI_API_KEY=sk-... bun src/index.ts https://... --out ./mein-projekt
```

### Ausgabe-Dateien

Im `--out` Verzeichnis (Standard: `./output`):

| Datei | Inhalt |
|-------|--------|
| `*.mp3` | Heruntergeladenes Audio |
| `*_transcript.txt` | Volltext der Transkription |
| `*_transcript_timestamps.txt` | Transkript mit `[MM:SS]` Zeitstempeln |
| `*_transcript.json` | Strukturiertes JSON für Schritt 2 |

### Nur Transkription (ohne Download)

Wenn du bereits eine Audio-Datei hast:

```bash
OPENAI_API_KEY=sk-... bun src/test-transcribe.ts ./meine-datei.mp3
```

## Architektur

```
YouTube-URL
    ↓
yt-dlp              → Audio als MP3 herunterladen
    ↓
OpenAI Whisper API  → Transkript mit Timestamps
    ↓
JSON Output         → Eingabe für Schritt 2 (Claude-Skript-Generator)
```

## Hinweise

- **Dateigröße:** OpenAI Whisper API erlaubt max. 25 MB pro Datei (~30 Min Audio)
- **Sprache:** Whisper erkennt die Sprache automatisch
- **JS-Runtime:** Bun wird automatisch als yt-dlp JS-Runtime eingebunden (nötig für neue YouTube-Formate)
