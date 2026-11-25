import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStoragePort } from "../ports/file-storage";

/** Adapter lokalnego folderu (dev / staging bez S3). */
export function createLocalFolderStorage(rootDir: string): FileStoragePort {
  return {
    async putObject({ key, body }) {
      const dest = path.join(rootDir, key);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, body);
      return { uri: `file://${dest}` };
    },
  };
}
