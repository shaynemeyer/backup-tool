import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { BackupResponse, BrowseResponse } from "./types";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

const browseRoot: BrowseResponse = {
  path: "/home/user",
  parent: null,
  directories: ["Documents", "Downloads"],
};

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("loads and displays the initial directory on mount", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(browseRoot));

    render(<App />);

    expect(await screen.findByText("/home/user")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Downloads")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/browse");
  });

  it("navigates into a subdirectory when its badge is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(browseRoot));
    render(<App />);
    await screen.findByText("Documents");

    const nested: BrowseResponse = {
      path: "/home/user/Documents",
      parent: "/home/user",
      directories: [],
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(nested));

    await user.click(screen.getByText("Documents"));

    expect(await screen.findByText("/home/user/Documents")).toBeInTheDocument();
    expect(screen.getByText("No subdirectories")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      `/api/browse?path=${encodeURIComponent("/home/user/Documents")}`,
    );
  });

  it("navigates up via the parent button", async () => {
    const user = userEvent.setup();
    const nested: BrowseResponse = {
      path: "/home/user/Documents",
      parent: "/home/user",
      directories: [],
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(nested));
    render(<App />);
    await screen.findByText("/home/user/Documents");

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(browseRoot));
    await user.click(screen.getByText(".. up"));

    expect(await screen.findByText("Documents")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      `/api/browse?path=${encodeURIComponent("/home/user")}`,
    );
  });

  it("shows an error message when the initial browse request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(null, false, 500));

    render(<App />);

    expect(await screen.findByText("Failed to load directory (500)")).toBeInTheDocument();
  });

  it("falls back to a generic message when the initial browse request throws a non-Error value", async () => {
    vi.mocked(fetch).mockRejectedValueOnce("network down");

    render(<App />);

    expect(await screen.findByText("Failed to load directory")).toBeInTheDocument();
  });

  it("runs a backup and shows the result on success", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(browseRoot));
    render(<App />);
    await screen.findByText("/home/user");

    const backupResult: BackupResponse = {
      remoteRoot: "/backup-tool/user",
      uploaded: 3,
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(backupResult));

    await user.click(screen.getByText("Back up this folder"));

    expect(
      await screen.findByText("Uploaded 3 files to /backup-tool/user"),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: browseRoot.path }),
    });
  });

  it("shows an error message when the backup request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(browseRoot));
    render(<App />);
    await screen.findByText("/home/user");

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(null, false, 500));

    await user.click(screen.getByText("Back up this folder"));

    expect(await screen.findByText("Backup failed (500)")).toBeInTheDocument();
  });

  it("falls back to a generic message when the backup request throws a non-Error value", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(browseRoot));
    render(<App />);
    await screen.findByText("/home/user");

    vi.mocked(fetch).mockRejectedValueOnce("network down");

    await user.click(screen.getByText("Back up this folder"));

    expect(await screen.findByText("Backup failed")).toBeInTheDocument();
  });

  it("disables the backup button while a backup is running", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(browseRoot));
    render(<App />);
    await screen.findByText("/home/user");

    let resolveBackup: (value: Response) => void = () => {};
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveBackup = resolve;
      }),
    );

    const button = screen.getByText("Back up this folder");
    await user.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByText("Backing up...")).toBeInTheDocument();

    resolveBackup(jsonResponse({ remoteRoot: "/backup-tool/user", uploaded: 0 }));
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
