import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { BackupResponse, BrowseResponse } from "@/types";

type BackupStatus =
  | { state: "idle" }
  | { state: "running" }
  | { state: "done"; result: BackupResponse }
  | { state: "error"; message: string };

function App() {
  const [browse, setBrowse] = useState<BrowseResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({
    state: "idle",
  });

  const loadPath = async (path?: string) => {
    setLoadError(null);
    setBackupStatus({ state: "idle" });
    try {
      const url = path
        ? `/api/browse?path=${encodeURIComponent(path)}`
        : "/api/browse";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load directory (${res.status})`);
      const data: BrowseResponse = await res.json();
      setBrowse(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load directory");
    }
  };

  useEffect(() => {
    loadPath();
  }, []);

  const startBackup = async () => {
    if (!browse) return;
    setBackupStatus({ state: "running" });
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: browse.path }),
      });
      if (!res.ok) throw new Error(`Backup failed (${res.status})`);
      const result: BackupResponse = await res.json();
      setBackupStatus({ state: "done", result });
    } catch (err) {
      setBackupStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Backup failed",
      });
    }
  };

  return (
    <div className="min-h-svh flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Backup Tool</CardTitle>
          <CardDescription className="break-all">
            {browse?.path ?? "Loading..."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loadError && (
            <p className="text-sm text-destructive">{loadError}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {browse?.parent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadPath(browse.parent!)}
              >
                .. up
              </Button>
            )}
            {browse?.directories.map((name) => (
              <Badge
                key={name}
                variant="secondary"
                className="cursor-pointer"
                onClick={() =>
                  loadPath(`${browse.path}/${name}`.replace(/\/+/g, "/"))
                }
              >
                {name}
              </Badge>
            ))}
            {browse && browse.directories.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No subdirectories
              </p>
            )}
          </div>

          <Separator />

          <div className="text-sm">
            {backupStatus.state === "running" && (
              <p className="text-muted-foreground">Backing up...</p>
            )}
            {backupStatus.state === "done" && (
              <p className="text-green-600 dark:text-green-500">
                Uploaded {backupStatus.result.uploaded} file
                {backupStatus.result.uploaded === 1 ? "" : "s"} to{" "}
                {backupStatus.result.remoteRoot}
              </p>
            )}
            {backupStatus.state === "error" && (
              <p className="text-destructive">{backupStatus.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            disabled={!browse || backupStatus.state === "running"}
            onClick={startBackup}
          >
            Back up this folder
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default App;
