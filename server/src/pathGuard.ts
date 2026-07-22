import { homedir } from "node:os";
import { resolve, sep } from "node:path";

export const ROOT = homedir();

export function isInsideRoot(path: string): boolean {
  const resolved = resolve(path);
  return resolved === ROOT || resolved.startsWith(ROOT + sep);
}
