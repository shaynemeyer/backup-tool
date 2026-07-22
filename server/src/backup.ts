import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import type { Request, Response } from "express";
import { isInsideRoot } from "./pathGuard.js";
import { webdavClient } from "./webdavClient.js";

async function ensureRemoteDir(remotePath: string) {
  const exists = await webdavClient.exists(remotePath);
  if (!exists) {
    await webdavClient.createDirectory(remotePath, { recursive: true });
  }
}

async function uploadFile(localPath: string, remotePath: string) {
  const stream = createReadStream(localPath);
  await webdavClient.putFileContents(remotePath, stream);
}

export async function backupHandler(req: Request, res: Response) {
  const localDir = typeof req.body.path === "string" ? req.body.path : undefined;
  if (!localDir) {
    res.status(400).json({ error: "path is required" });
    return;
  }

  const target = resolve(localDir);
  if (!isInsideRoot(target)) {
    res.status(400).json({ error: "Path is outside the allowed root" });
    return;
  }

  const remoteRoot = `/backup-tool/${basename(target)}`;
  const entries = await readdir(target, { recursive: true, withFileTypes: true });

  await ensureRemoteDir(remoteRoot);

  let uploaded = 0;
  for (const entry of entries) {
    const localPath = join(entry.parentPath, entry.name);
    const remotePath = join(remoteRoot, relative(target, localPath));

    if (entry.isDirectory()) {
      await ensureRemoteDir(remotePath);
      continue;
    }
    if (entry.isFile()) {
      await uploadFile(localPath, remotePath);
      uploaded += 1;
    }
  }

  res.json({ remoteRoot, uploaded });
}
