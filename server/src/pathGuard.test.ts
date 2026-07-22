import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isInsideRoot, ROOT } from "./pathGuard.js";

describe("pathGuard", () => {
  it("exposes the user's home directory as ROOT", () => {
    expect(ROOT).toBe(homedir());
  });

  it("accepts the root itself", () => {
    expect(isInsideRoot(ROOT)).toBe(true);
  });

  it("accepts a nested path under the root", () => {
    expect(isInsideRoot(join(ROOT, "Documents", "notes"))).toBe(true);
  });

  it("rejects a path outside the root", () => {
    expect(isInsideRoot("/etc")).toBe(false);
  });

  it("rejects a sibling directory that merely shares the root as a prefix", () => {
    expect(isInsideRoot(`${ROOT}-evil`)).toBe(false);
  });

  it("rejects traversal that escapes the root via '..'", () => {
    expect(isInsideRoot(join(ROOT, "..", "outside"))).toBe(false);
  });
});
