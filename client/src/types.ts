export interface BrowseResponse {
  path: string;
  parent: string | null;
  directories: string[];
}

export interface BackupResponse {
  remoteRoot: string;
  uploaded: number;
}
