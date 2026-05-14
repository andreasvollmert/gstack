import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface ProgressBarProps {
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  color = "#ffffff",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = interpolate(frame, [0, durationInFrames], [0, 100]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        background: "rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: color,
          transition: "width 0.016s linear",
        }}
      />
    </div>
  );
};
