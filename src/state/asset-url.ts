import { convertFileSrc } from "@tauri-apps/api/core";

export function localFileUrl(absolutePath: string): string {
  return convertFileSrc(absolutePath);
}
