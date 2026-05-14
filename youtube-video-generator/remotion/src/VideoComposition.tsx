import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { ContentScene } from "./scenes/ContentScene";
import { OutroScene } from "./scenes/OutroScene";
import { TitleScene } from "./scenes/TitleScene";
import type { VideoScript } from "./types";

interface VideoCompositionProps {
  script: VideoScript;
}

const FPS = 30;
const TITLE_DURATION_SEC = 4;
const OUTRO_DURATION_SEC = 5;

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  script,
}) => {
  let currentFrame = 0;

  const titleFrames = TITLE_DURATION_SEC * FPS;
  const titleStart = currentFrame;
  currentFrame += titleFrames;

  const sceneFrames = script.scenes.map((scene) => {
    const frames = scene.durationSeconds * FPS;
    const start = currentFrame;
    currentFrame += frames;
    return { scene, start, frames };
  });

  const outroFrames = OUTRO_DURATION_SEC * FPS;
  const outroStart = currentFrame;

  return (
    <AbsoluteFill>
      {/* Titel-Sequenz */}
      <Sequence from={titleStart} durationInFrames={titleFrames}>
        <TitleScene script={script} />
      </Sequence>

      {/* Inhalts-Szenen */}
      {sceneFrames.map(({ scene, start, frames }, i) => (
        <Sequence key={scene.scene} from={start} durationInFrames={frames}>
          <ContentScene
            scene={scene}
            sceneIndex={i}
            totalScenes={script.scenes.length}
          />
        </Sequence>
      ))}

      {/* Outro */}
      <Sequence from={outroStart} durationInFrames={outroFrames}>
        <OutroScene script={script} />
      </Sequence>
    </AbsoluteFill>
  );
};

export function calcTotalFrames(script: VideoScript): number {
  const scenesTotal = script.scenes.reduce(
    (sum, s) => sum + s.durationSeconds * FPS,
    0
  );
  return (TITLE_DURATION_SEC + OUTRO_DURATION_SEC) * FPS + scenesTotal;
}
