interface PendingUpload {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  size: number;
  timestamp: number;
}

class UploadCache {
  private cache = new Map<number, PendingUpload>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutes

  set(userId: number, upload: Omit<PendingUpload, 'timestamp'>) {
    this.cache.set(userId, {
      ...upload,
      timestamp: Date.now()
    });
  }

  get(userId: number): Omit<PendingUpload, 'timestamp'> | undefined {
    const upload = this.cache.get(userId);
    if (!upload) return undefined;

    // Check if expired
    if (Date.now() - upload.timestamp > this.TTL_MS) {
      this.cache.delete(userId);
      return undefined;
    }

    const { timestamp, ...uploadData } = upload;
    return uploadData;
  }

  delete(userId: number) {
    this.cache.delete(userId);
  }

  cleanup() {
    const now = Date.now();
    for (const [userId, upload] of this.cache.entries()) {
      if (now - upload.timestamp > this.TTL_MS) {
        this.cache.delete(userId);
      }
    }
  }
}

export const uploadCache = new UploadCache();

// Cleanup expired uploads every 5 minutes
setInterval(() => {
  uploadCache.cleanup();
}, 5 * 60 * 1000);