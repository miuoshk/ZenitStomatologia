import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createLocalFolderStorage, type FileStoragePort } from "@crux/integrations";

export type FakeFileStorage = FileStoragePort & {
  readonly rootDir: string;
  read(key: string): Promise<Buffer>;
  cleanup(): Promise<void>;
};

/** Atrapa magazynu plików: katalog tymczasowy + adapter lokalnego folderu. */
export async function createFakeFileStorage(): Promise<FakeFileStorage> {
  const rootDir = await mkdtemp(path.join(tmpdir(), "crux-fake-storage-"));
  const inner = createLocalFolderStorage(rootDir);
  return {
    rootDir,
    putObject: (input) => inner.putObject(input),
    read: (key) => readFile(path.join(rootDir, key)),
    cleanup: () => rm(rootDir, { recursive: true, force: true }),
  };
}
