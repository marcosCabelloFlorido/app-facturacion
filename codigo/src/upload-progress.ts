// Reflect completion immediately after the server confirms the upload.
export function createUploadProgress(onProgress: (value: number) => void) {
  let stopped = false;
  onProgress(0);
  return {
    complete() {
      if (!stopped) onProgress(100);
      return Promise.resolve();
    },
    stop() {
      stopped = true;
    },
  };
}
