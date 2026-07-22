import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Request, Response } from "express";
import { isInsideRoot, ROOT } from "./pathGuard.js";

export async function browseHandler(req: Request, res: Response) {
  const requested = typeof req.query.path === "string" ? req.query.path : ROOT;
  const target = resolve(requested);

  if (!isInsideRoot(target)) {
    res.status(400).json({ error: "Path is outside the allowed root" });
    return;
  }

  const entries = await readdir(target, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();

  res.json({
    path: target,
    parent: target === ROOT ? null : join(target, ".."),
    directories,
  });
}
