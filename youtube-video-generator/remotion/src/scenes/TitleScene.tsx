import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FadeIn } from "../components/FadeIn";
import { SlideUp } from "../components/SlideUp";
import type { VideoScript } from "../types";

interface TitleSceneProps {
  script: VideoScript;
}

// Intro-Szene: Titel + Kernbotschaften
export const TitleScene: React.FC<TitleSceneProps> = ({ script }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const bgOpacity = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        color: "#fff",
        opacity: bgOpacity,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Hintergrund-Partikel */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(120, 80, 255, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(255, 100, 80, 0.1) 0%, transparent 60%)",
        }}
      />

      <FadeIn delay={5} duration={25}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          {script.targetAudience}
        </div>
      </FadeIn>

      <SlideUp delay={10}>
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            textAlign: "center",
            margin: "0 0 32px",
            lineHeight: 1.1,
            maxWidth: 900,
            background: "linear-gradient(135deg, #fff 0%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {script.title}
        </h1>
      </SlideUp>

      <FadeIn delay={30} duration={20}>
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 800,
          }}
        >
          {script.keyMessages.slice(0, 3).map((msg, i) => (
            <div
              key={i}
              style={{
                padding: "8px 20px",
                borderRadius: 100,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                fontSize: 16,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {msg}
            </div>
          ))}
        </div>
      </FadeIn>
    </div>
  );
};
