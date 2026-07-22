import { homedir } from "node:os";
import { join } from "node:path";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { readdir, createReadStream, webdavClient } = vi.hoisted(() => ({
  readdir: vi.fn(),
  createReadStream: vi.fn(),
  webdavClient: {
    exists: vi.fn(),
    createDirectory: vi.fn(),
    putFileContents: vi.fn(),
  },
}));

vi.mock("node:fs/promises", () => ({ readdir }));
vi.mock("node:fs", () => ({ createReadStream }));
vi.mock("./webdavClient.js", () => ({ webdavClient }));

const { backupHandler } = await import("./backup.js");

function mockResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

function mockRequest(body: Record<string, unknown>): Request {
  return { body } as unknown as Request;
}

describe("backupHandler", () => {
  beforeEach(() => {
    readdir.mockReset();
    createReadStream.mockReset();
    webdavClient.exists.mockReset().mockResolvedValue(false);
    webdavClient.createDirectory.mockReset().mockResolvedValue(undefined);
    webdavClient.putFileContents.mockReset().mockResolvedValue(undefined);
  });

  it("returns 400 when path is missing", async () => {
    const req = mockRequest({});
    const res = mockResponse();

    await backupHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "path is required" });
    expect(readdir).not.toHaveBeenCalled();
  });

  it("rejects a path outside the home directory with 400", async () => {
    const req = mockRequest({ path: "/etc" });
    const res = mockResponse();

    await backupHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Path is outside the allowed root",
    });
    expect(readdir).not.toHaveBeenCalled();
  });

  it("uploads files and creates remote directories, mirroring the local tree", async () => {
    const localDir = join(homedir(), "Documents", "project");
    readdir.mockResolvedValue([
      { name: "subdir", parentPath: localDir, isDirectory: () => true, isFile: () => false },
      {
        name: "a.txt",
        parentPath: join(localDir, "subdir"),
        isDirectory: () => false,
        isFile: () => true,
      },
    ]);

    const req = mockRequest({ path: localDir });
    const res = mockResponse();

    await backupHandler(req, res);

    expect(webdavClient.createDirectory).toHaveBeenCalledWith("/backup-tool/project", {
      recursive: true,
    });
    expect(webdavClient.createDirectory).toHaveBeenCalledWith(
      join("/backup-tool/project", "subdir"),
      { recursive: true },
    );
    expect(createReadStream).toHaveBeenCalledWith(join(localDir, "subdir", "a.txt"));
    expect(webdavClient.putFileContents).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      remoteRoot: "/backup-tool/project",
      uploaded: 1,
    });
  });

  it("skips creating a remote directory that already exists", async () => {
    const localDir = join(homedir(), "Documents", "project");
    webdavClient.exists.mockResolvedValue(true);
    readdir.mockResolvedValue([]);

    const req = mockRequest({ path: localDir });
    const res = mockResponse();

    await backupHandler(req, res);

    expect(webdavClient.createDirectory).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      remoteRoot: "/backup-tool/project",
      uploaded: 0,
    });
  });
});
