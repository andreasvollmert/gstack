import { Composition } from "remotion";
import { VideoComposition, calcTotalFrames } from "./VideoComposition";
import type { VideoScript } from "./types";

// Beispiel-Skript wird zur Laufzeit durch das echte _script.json ersetzt
// Lade via: remotion render src/Root.tsx VideoScript --props='{"scriptPath":"..."}'
const DEFAULT_SCRIPT: VideoScript = {
  title: "Dein Video-Titel",
  targetAudience: "Developer & Content Creator",
  tone: "informativ, inspirierend",
  totalDurationSeconds: 120,
  keyMessages: [
    "Schnell und einfach",
    "KI-gestützte Generierung",
    "Professionelle Ergebnisse",
  ],
  scenes: [
    {
      scene: 1,
      title: "Einleitung",
      durationSeconds: 20,
      narration:
        "Willkommen zu diesem Video. Heute zeigen wir dir, wie du in wenigen Minuten professionelle Videos erstellst.",
      visualDescription:
        "Moderne Interface-Animation, Code fließt durch den Bildschirm.",
      onScreenText: "Video in Minuten erstellen",
      bRollSuggestions: ["Code-Editor", "Dashboard-Animation"],
      seedancePrompt:
        "Futuristic tech interface, code flowing across screen, blue glow, cinematic",
    },
    {
      scene: 2,
      title: "Funktionsweise",
      durationSeconds: 30,
      narration:
        "Das System analysiert dein Quell-Video, extrahiert die Kernbotschaft und erstellt ein neues Skript.",
      visualDescription: "Pipeline-Diagramm mit animierten Pfeilen.",
      onScreenText: "KI-Pipeline: Analyse → Skript → Video",
      bRollSuggestions: ["Flowchart-Animation", "AI-Visualisierung"],
      seedancePrompt:
        "Abstract data pipeline visualization, neural network nodes, smooth animation",
    },
    {
      scene: 3,
      title: "Ergebnis",
      durationSeconds: 20,
      narration:
        "Das Ergebnis ist ein professionelles Video, das du sofort verwenden kannst.",
      visualDescription: "Finales Video-Playback auf modernem Bildschirm.",
      onScreenText: "Bereit in Sekunden",
      bRollSuggestions: ["Video-Player-Mockup", "Success-Animation"],
      seedancePrompt:
        "Professional video playing on modern screen, clean studio background, success",
    },
  ],
  remotionNotes:
    "Verwende Gradient-Backgrounds und Spring-Animationen für professionellen Look.",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoScript"
        component={VideoComposition}
        durationInFrames={calcTotalFrames(DEFAULT_SCRIPT)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ script: DEFAULT_SCRIPT }}
      />
    </>
  );
};
