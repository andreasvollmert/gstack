import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FadeIn } from "../components/FadeIn";
import type { VideoScript } from "../types";

interface OutroSceneProps {
  script: VideoScript;
}

export const OutroScene: React.FC<OutroSceneProps> = ({ script }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
    from: 0.8,
    to: 1,
  });

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
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(167, 139, 250, 0.2) 0%, transparent 70%)",
        }}
      />

      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: "center",
          zIndex: 1,
        }}
      >
        <FadeIn delay={5} duration={20}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 20,
            }}
          >
            Zusammenfassung
          </div>
        </FadeIn>

        <FadeIn delay={10} duration={20}>
          <h2
            style={{
              fontSize: 56,
              fontWeight: 800,
              margin: "0 0 40px",
              background: "linear-gradient(135deg, #fff 0%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {script.title}
          </h2>
        </FadeIn>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
          }}
        >
          {script.keyMessages.map((msg, i) => (
            <FadeIn key={i} delay={20 + i * 10} duration={15}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 20,
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                <span style={{ color: "#a78bfa", fontSize: 18 }}>✓</span>
                {msg}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </div>
  );
};
