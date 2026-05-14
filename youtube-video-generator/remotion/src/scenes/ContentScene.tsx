import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";
import { FadeIn } from "../components/FadeIn";
import { ProgressBar } from "../components/ProgressBar";
import { SlideUp } from "../components/SlideUp";
import type { VideoScene } from "../types";

// Farbpalette für abwechslungsreiche Szenen
const SCENE_PALETTES = [
  { bg: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)", accent: "#e94560" },
  { bg: "linear-gradient(135deg, #0d1117, #1c2128, #0d1117)", accent: "#58a6ff" },
  { bg: "linear-gradient(135deg, #0a0a0a, #1a0a2e, #0a1520)", accent: "#a78bfa" },
  { bg: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)", accent: "#43e97b" },
  { bg: "linear-gradient(135deg, #1a0533, #2d1b4e, #0a1628)", accent: "#f6d365" },
  { bg: "linear-gradient(135deg, #1e3c72, #2a5298, #1e3c72)", accent: "#f093fb" },
  { bg: "linear-gradient(135deg, #0f2027, #0f2027, #203a43)", accent: "#fa709a" },
  { bg: "linear-gradient(135deg, #0a0a0a, #111827, #1f2937)", accent: "#34d399" },
];

interface ContentSceneProps {
  scene: VideoScene;
  sceneIndex: number;
  totalScenes: number;
}

export const ContentScene: React.FC<ContentSceneProps> = ({
  scene,
  sceneIndex,
  totalScenes,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const palette = SCENE_PALETTES[sceneIndex % SCENE_PALETTES.length];

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const sceneProgress = frame / durationInFrames;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: palette.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        color: "#fff",
        opacity: fadeOut,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Hintergrund-Glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at ${30 + sceneProgress * 40}% 50%, ${palette.accent}22 0%, transparent 65%)`,
        }}
      />

      {/* Szenen-Nummer */}
      <FadeIn delay={0} duration={15}>
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 40,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.15em",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          {String(sceneIndex + 1).padStart(2, "0")} / {String(totalScenes).padStart(2, "0")}
        </div>
      </FadeIn>

      {/* Haupt-Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          gap: 28,
          maxWidth: 1000,
        }}
      >
        {/* Szenen-Titel */}
        <SlideUp delay={5}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 4,
                height: 40,
                borderRadius: 2,
                background: palette.accent,
              }}
            />
            <h2
              style={{
                fontSize: 42,
                fontWeight: 700,
                margin: 0,
                color: "#fff",
                lineHeight: 1.2,
              }}
            >
              {scene.title}
            </h2>
          </div>
        </SlideUp>

        {/* Narration */}
        <FadeIn delay={15} duration={20}>
          <div
            style={{
              fontSize: 24,
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.85)",
              maxWidth: 840,
            }}
          >
            {scene.narration}
          </div>
        </FadeIn>

        {/* On-Screen Text Pill */}
        {scene.onScreenText && (
          <FadeIn delay={35} duration={15}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 24px",
                borderRadius: 100,
                background: `${palette.accent}22`,
                border: `1px solid ${palette.accent}66`,
                fontSize: 18,
                fontWeight: 600,
                color: palette.accent,
                alignSelf: "flex-start",
              }}
            >
              <span style={{ fontSize: 16 }}>✦</span>
              {scene.onScreenText}
            </div>
          </FadeIn>
        )}
      </div>

      {/* Visuelle Beschreibung (subtil unten) */}
      <FadeIn delay={20} duration={20}>
        <div
          style={{
            padding: "16px 80px 24px",
            fontSize: 14,
            color: "rgba(255,255,255,0.25)",
            fontStyle: "italic",
            letterSpacing: "0.02em",
          }}
        >
          {scene.visualDescription.slice(0, 120)}
          {scene.visualDescription.length > 120 ? "..." : ""}
        </div>
      </FadeIn>

      <ProgressBar color={palette.accent} />
    </div>
  );
};
