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
      
      const userSession = await db.getUserSession(userId);
      if (!userSession) return undefined;
      
      // Convert database UserSession to Grammy SessionData format
      const sessionData: SessionData = {
        user: userSession,
        // Note: pendingUpload is not persisted, will be undefined on restart
      };
      
      return sessionData;
    } catch (error) {
      console.error(`Error reading session for key ${key}:`, error);
      return undefined;
    }
  }

  async write(key: string, value: SessionData): Promise<void> {
    try {
      const userId = parseInt(key);
      if (isNaN(userId)) return;
      
      // Save user session to database
      await db.saveUserSession(value.user);
      
      // Note: We don't persist pendingUpload as it's temporary upload state
      // It will be reset on server restart, which is acceptable behavior
    } catch (error) {
      console.error(`Error writing session for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const userId = parseInt(key);
      if (isNaN(userId)) return;
      
      await db.deleteUserSession(userId);
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