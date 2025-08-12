import { google } from 'googleapis';
import { Readable } from 'stream';
import type { DriveFile, DriveFolder } from '../types.js';
import { CONFIG } from '../config.js';

export class DriveService {
  private drive: any;
  private auth: InstanceType<typeof google.auth.OAuth2>;
  private tokens: { access_token: string; refresh_token: string; expiry_date?: number };
  private onTokenRefresh?: (tokens: any) => Promise<void>;

  constructor(
    tokens: { access_token: string; refresh_token: string; expiry_date?: number },
    onTokenRefresh?: (tokens: any) => Promise<void>
  ) {
    this.auth = new google.auth.OAuth2(
      CONFIG.GOOGLE.CLIENT_ID,
      CONFIG.GOOGLE.CLIENT_SECRET
    );

    this.tokens = tokens;
    this.onTokenRefresh = onTokenRefresh;
    this.auth.setCredentials(tokens);
    this.drive = google.drive({ version: 'v3', auth: this.auth });

    // Set up automatic token refresh
    this.auth.on('tokens', async (newTokens) => {
      if (newTokens.access_token) {
        this.tokens.access_token = newTokens.access_token;
      }
      if (newTokens.refresh_token) {
        this.tokens.refresh_token = newTokens.refresh_token;
      }
      if (newTokens.expiry_date) {
        this.tokens.expiry_date = newTokens.expiry_date;
      }
      
      if (this.onTokenRefresh) {
        try {
          await this.onTokenRefresh(this.tokens);
        } catch (error) {
          console.error('Error saving refreshed tokens:', error);
        }
      }
    });
  }

  private async ensureValidToken(): Promise<void> {
    try {
      // Check if token is expired (with 5 minute buffer)
      const expiryBuffer = 5 * 60 * 1000; // 5 minutes in ms
      const now = Date.now();
      
      if (this.tokens.expiry_date && (this.tokens.expiry_date - expiryBuffer) <= now) {
        console.log('Token expired, refreshing...');
        await this.auth.getAccessToken(); // This will trigger automatic refresh
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Authentication expired. Please reconnect your Google Drive account.');
    }
  }

  async getUserInfo() {
    await this.ensureValidToken();
    const response = await this.drive.about.get({
      fields: 'user(displayName,emailAddress)',
    });
    return response.data.user;
  }

  async getStorageInfo() {
    await this.ensureValidToken();
    const response = await this.drive.about.get({
      fields: 'storageQuota(usage,limit)',
    });
    return {
      usage: parseInt(response.data.storageQuota.usage),
      limit: parseInt(response.data.storageQuota.limit),
    };
  }

  async listFolders(parentId?: string): Promise<DriveFolder[]> {
    await this.ensureValidToken();
    let query = "mimeType='application/vnd.google-apps.folder' and trashed=false";
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    } else {
      query += " and 'root' in parents";
    }

    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id,name,parents)',
      orderBy: 'name',
    });

    return response.data.files.map((file: any) => ({
      id: file.id,
      name: file.name,
      parentId: file.parents?.[0],
    }));
  }

  async createFolder(name: string, parentId?: string): Promise<DriveFolder> {
    await this.ensureValidToken();
    const fileMetadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : ['root'],
    };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id,name,parents',
    });

    return {
      id: response.data.id,
      name: response.data.name,
      parentId: response.data.parents?.[0],
    };
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    parentId?: string
  ): Promise<DriveFile> {
    await this.ensureValidToken();
    const fileMetadata = {
      name: fileName,
      parents: parentId ? [parentId] : ['root'],
    };

    const media = {
      mimeType: mimeType,
      body: Readable.from(fileBuffer),
    };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,name,mimeType,webViewLink,webContentLink,size',
    });

    return {
      id: response.data.id,
      name: response.data.name,
      mimeType: response.data.mimeType,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      size: response.data.size,
    };
  }

  async getFileInfo(fileId: string): Promise<DriveFile> {
    await this.ensureValidToken();
    const response = await this.drive.files.get({
      fileId: fileId,
      fields: 'id,name,mimeType,webViewLink,webContentLink,size',
    });

    return {
      id: response.data.id,
      name: response.data.name,
      mimeType: response.data.mimeType,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      size: response.data.size,
    };
  }

  async searchFiles(query: string): Promise<DriveFile[]> {
    await this.ensureValidToken();
    const response = await this.drive.files.list({
      q: `name contains '${query}' and trashed=false`,
      fields: 'files(id,name,mimeType,webViewLink,size)',
      orderBy: 'modifiedTime desc',
    });

    return response.data.files.map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      size: file.size,
    }));
  }

  async listFolderContents(parentId?: string): Promise<{ files: DriveFile[]; folders: DriveFolder[] }> {
    await this.ensureValidToken();
    
    // Query for both files and folders in the specified parent folder
    let query = "trashed=false";
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    } else {
      query += " and 'root' in parents";
    }

    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id,name,mimeType,webViewLink,webContentLink,size,parents)',
      orderBy: 'folder,name', // Folders first, then by name
    });

    const files: DriveFile[] = [];
    const folders: DriveFolder[] = [];

    response.data.files.forEach((item: any) => {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        folders.push({
          id: item.id,
          name: item.name,
          parentId: item.parents?.[0],
        });
      } else {
        files.push({
          id: item.id,
          name: item.name,
          mimeType: item.mimeType,
          webViewLink: item.webViewLink,
          webContentLink: item.webContentLink,
          size: item.size,
        });
      }
    });

    return { files, folders };
  }
}