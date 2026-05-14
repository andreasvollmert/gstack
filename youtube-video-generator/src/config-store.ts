import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const CONFIG_PATH = path.join(
  path.dirname(import.meta.url.replace("file://", "")),
  "..",
  "dashboard-config.json"
);

export interface DashboardConfig {
  openaiApiKey: string;
  anthropicApiKey: string;
}

export function loadConfig(): DashboardConfig {
  if (!existsSync(CONFIG_PATH)) {
    return { openaiApiKey: "", anthropicApiKey: "" };
  }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return { openaiApiKey: "", anthropicApiKey: "" };
  }
}

export function saveConfig(config: DashboardConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
