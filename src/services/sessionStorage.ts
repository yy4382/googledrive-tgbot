import type { SessionFlavor } from 'grammy';
import type { SessionData } from '../types.js';
import { db } from './databaseService.js';

export interface StorageAdapter<T> {
  read(key: string): Promise<T | undefined>;
  write(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export class DatabaseSessionStorage implements StorageAdapter<SessionData> {
  async read(key: string): Promise<SessionData | undefined> {
    try {
      const userId = parseInt(key);
      if (isNaN(userId)) return undefined;
      
      // Try to get full session data first
      let sessionData = await db.getSessionData(userId);
      
      // Fallback to legacy user session for backward compatibility
      if (!sessionData) {
        const userSession = await db.getUserSession(userId);
        if (userSession) {
          sessionData = {
            user: userSession,
            // Note: pendingUpload is not persisted, will be undefined on restart
          };
        }
      }
      
      return sessionData || undefined;
    } catch (error) {
      console.error(`Error reading session for key ${key}:`, error);
      return undefined;
    }
  }

  async write(key: string, value: SessionData): Promise<void> {
    try {
      const userId = parseInt(key);
      if (isNaN(userId)) return;
      
      // Save full session data to database
      await db.saveSessionData(userId, value);
      
      // Note: We don't persist pendingUpload as it's temporary upload state
      // It will be reset on server restart, which is acceptable behavior
      // But pendingFolderCreation should be persisted
    } catch (error) {
      console.error(`Error writing session for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const userId = parseInt(key);
      if (isNaN(userId)) return;
      
      await db.deleteSessionData(userId);
    } catch (error) {
      console.error(`Error deleting session for key ${key}:`, error);
    }
  }
}

export function createDatabaseSession() {
  const storage = new DatabaseSessionStorage();
  
  return {
    storage,
    initial: (): SessionData => ({
      user: {
        userId: 0,
      },
    }),
    getSessionKey: (ctx: any) => {
      // Use Telegram user ID as session key
      return ctx.from?.id?.toString();
    },
  };
}