interface PendingUpload {
  buffer?: Buffer;
  filePath?: string;
  fileName: string;
  mimeType: string;
  size: number;
  isLocalServer: boolean;
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
    const upload = this.cache.get(userId);
    if (upload) {
      // Clean up local file if it exists
      if (upload.isLocalServer && upload.filePath) {
        this.cleanupFile(upload.filePath);
      }
      this.cache.delete(userId);
    }
  }

  private cleanupFile(filePath: string) {
    import('fs').then(({ unlink }) => {
      unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.warn(`Failed to cleanup file ${filePath}:`, err.message);
        } else if (!err) {
          console.log(`Cleaned up file: ${filePath}`);
        }
      });
    }).catch(err => {
      console.warn('Failed to import fs for cleanup:', err);
    });
  }

  cleanup() {
    const now = Date.now();
    for (const [userId, upload] of this.cache.entries()) {
      if (now - upload.timestamp > this.TTL_MS) {
        // Clean up expired files
        if (upload.isLocalServer && upload.filePath) {
          this.cleanupFile(upload.filePath);
        }
        this.cache.delete(userId);
      }
    }
  }
}

export const uploadCache = new UploadCache();

// Cleanup expired uploads every 5 minutes
setInterval(() => {
  console.log("Cleaning up expired uploads");
  uploadCache.cleanup();
}, 5 * 60 * 1000);