import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { dirname, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { UserSession } from '../types.js';
import { CONFIG } from '../config.js';

interface DatabaseSchema {
  users: Record<string, UserSession>;
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
    this.db = new Low(adapter, { users: {} });
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.db.read();
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
}

export const db = new DatabaseService();