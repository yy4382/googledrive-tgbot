import type { Context, SessionFlavor } from 'grammy';
import type { FileFlavor } from '@grammyjs/files';

export interface UserSession {
  userId: number;
  googleTokens?: {
    access_token: string;
    refresh_token: string;
    expiry_date?: number;
  } | undefined;
  defaultFolderId?: string | undefined;
  favoriteFolders?: Array<{
    id: string;
    name: string;
  }> | undefined;
  lastUploadFolder?: string | undefined;
  deviceFlowData?: {
    device_code: string;
    user_code: string;
    verification_url: string;
    expires_at: number;
    interval: number;
  } | undefined;
}

export interface SessionData {
  user: UserSession;
  pendingUpload?: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    size: number;
  };
}

export type MyContext = Context & SessionFlavor<SessionData> & FileFlavor<Context>;

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  parentId?: string;
}