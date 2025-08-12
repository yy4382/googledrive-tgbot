import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { dirname, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { UserSession, SessionData } from '../types.js';
import { CONFIG } from '../config.js';

interface DatabaseSchema {
  users: Record<string, UserSession>;
  sessions: Record<string, SessionData>;
}

export class DatabaseService {
  private db: Low<DatabaseSchema>;
  private initialized = false;

  constructor() {
    const dbPath = resolve(CONFIG.DATABASE.PATH);
    const dbDir = dirname(dbPath);
    
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    const adapter = new JSONFile<DatabaseSchema>(dbPath);
    this.db = new Low(adapter, { users: {}, sessions: {} });
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.db.read();
      
      // Ensure sessions property exists for backward compatibility
      if (!this.db.data.sessions) {
        this.db.data.sessions = {};
        await this.db.write();
      }
      
      this.initialized = true;
    }
  }

  async getUserSession(userId: number): Promise<UserSession | null> {
    await this.ensureInitialized();
    const user = this.db.data.users[userId.toString()];
    return user || null;
  }

  async saveUserSession(userSession: UserSession): Promise<void> {
    await this.ensureInitialized();
    this.db.data.users[userSession.userId.toString()] = userSession;
    await this.db.write();
  }

  async updateUserSession(userId: number, updates: Partial<UserSession>): Promise<void> {
    await this.ensureInitialized();
    const existing = this.db.data.users[userId.toString()] || { userId };
    this.db.data.users[userId.toString()] = { ...existing, ...updates };
    await this.db.write();
  }

  async deleteUserSession(userId: number): Promise<void> {
    await this.ensureInitialized();
    delete this.db.data.users[userId.toString()];
    await this.db.write();
  }

  async getAllUsers(): Promise<UserSession[]> {
    await this.ensureInitialized();
    return Object.values(this.db.data.users);
  }

  async getUsersWithTokens(): Promise<UserSession[]> {
    await this.ensureInitialized();
    return Object.values(this.db.data.users).filter(user => user.googleTokens);
  }

  async getSessionData(userId: number): Promise<SessionData | null> {
    await this.ensureInitialized();
    const sessionData = this.db.data.sessions[userId.toString()];
    return sessionData || null;
  }

  async saveSessionData(userId: number, sessionData: SessionData): Promise<void> {
    await this.ensureInitialized();
    this.db.data.sessions[userId.toString()] = sessionData;
    // Also update user data for backward compatibility
    this.db.data.users[userId.toString()] = sessionData.user;
    await this.db.write();
  }

  async deleteSessionData(userId: number): Promise<void> {
    await this.ensureInitialized();
    delete this.db.data.sessions[userId.toString()];
    delete this.db.data.users[userId.toString()];
    await this.db.write();
  }
}

export const db = new DatabaseService();