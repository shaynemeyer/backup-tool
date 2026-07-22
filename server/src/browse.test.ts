import { homedir } from "node:os";
import { join } from "node:path";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { readdir } = vi.hoisted(() => ({ readdir: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readdir }));

const { browseHandler } = await import("./browse.js");

function mockResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

function mockRequest(query: Record<string, unknown>): Request {
  return { query } as unknown as Request;
}

describe("browseHandler", () => {
  beforeEach(() => {
    readdir.mockReset();
  });

  it("defaults to the home directory and lists visible subdirectories", async () => {
    readdir.mockResolvedValue([
      { name: "Documents", isDirectory: () => true },
      { name: "notes.txt", isDirectory: () => false },
      { name: ".ssh", isDirectory: () => true },
    ]);
    const req = mockRequest({});
    const res = mockResponse();

    await browseHandler(req, res);

    expect(readdir).toHaveBeenCalledWith(homedir(), { withFileTypes: true });
    expect(res.json).toHaveBeenCalledWith({
      path: homedir(),
      parent: null,
      directories: ["Documents"],
    });
  });

  it("sorts directories alphabetically", async () => {
    readdir.mockResolvedValue([
      { name: "zeta", isDirectory: () => true },
      { name: "alpha", isDirectory: () => true },
    ]);
    const req = mockRequest({ path: homedir() });
    const res = mockResponse();

    await browseHandler(req, res);

    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.directories).toEqual(["alpha", "zeta"]);
  });

  it("reports a non-null parent for a nested path", async () => {
    readdir.mockResolvedValue([]);
    const nested = join(homedir(), "Documents");
    const req = mockRequest({ path: nested });
    const res = mockResponse();

    await browseHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({
      path: nested,
      parent: homedir(),
      directories: [],
    });
  });

  it("rejects a path outside the home directory with 400", async () => {
    const req = mockRequest({ path: "/etc" });
    const res = mockResponse();

    await browseHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Path is outside the allowed root",
    });
    expect(readdir).not.toHaveBeenCalled();
  });
});
