/** Port magazynu plików (kopie nocne — K09; S3 w 2.0). */
export type FileStoragePort = {
  putObject(input: {
    key: string;
    body: Buffer;
    contentType?: string;
  }): Promise<{ uri: string }>;
};
