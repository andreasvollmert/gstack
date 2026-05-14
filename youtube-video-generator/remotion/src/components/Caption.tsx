import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface CaptionProps {
  text: string;
  totalFrames: number;
}

// Shows words progressively as the narration would be spoken
export const Caption: React.FC<CaptionProps> = ({ text, totalFrames }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const wordsPerFrame = words.length / totalFrames;
  const visibleWords = Math.min(
    Math.floor(frame * wordsPerFrame) + 1,
    words.length
  );

  const opacity = interpolate(
    frame,
    [totalFrames - 15, totalFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        opacity,
        padding: "0 48px",
        textAlign: "center",
        lineHeight: 1.5,
      }}
    >
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            opacity: i < visibleWords ? 1 : 0,
            transition: "opacity 0.1s",
            marginRight: "0.3em",
            display: "inline-block",
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
};
