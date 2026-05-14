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
