import { google } from 'googleapis';
import { CONFIG } from '../config.js';

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export class AuthService {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      CONFIG.GOOGLE.CLIENT_ID,
      CONFIG.GOOGLE.CLIENT_SECRET
    );
  }

  async requestDeviceCode(): Promise<DeviceCodeResponse> {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const response = await fetch('https://oauth2.googleapis.com/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CONFIG.GOOGLE.CLIENT_ID,
        scope: scopes.join(' '),
      }),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Device code request failed: ${error.error_description || error.error}`);
    }

    return await response.json() as DeviceCodeResponse;
  }

  async pollForToken(deviceCode: string): Promise<TokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CONFIG.GOOGLE.CLIENT_ID,
        client_secret: CONFIG.GOOGLE.CLIENT_SECRET,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const result = await response.json() as any;

    if (!response.ok) {
      // Handle specific error cases
      if (result.error === 'authorization_pending') {
        throw new Error('AUTHORIZATION_PENDING');
      } else if (result.error === 'slow_down') {
        throw new Error('SLOW_DOWN');
      } else if (result.error === 'expired_token') {
        throw new Error('EXPIRED_TOKEN');
      } else if (result.error === 'access_denied') {
        throw new Error('ACCESS_DENIED');
      }
      throw new Error(`Token polling failed: ${result.error_description || result.error}`);
    }

    // Add expiry_date if not present (calculate from expires_in)
    if (result.expires_in && !result.expiry_date) {
      result.expiry_date = Date.now() + (result.expires_in * 1000);
    }
    
    return result as TokenResponse;
  }

  async refreshTokens(refreshToken: string): Promise<any> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    
    // Normalize the token response format
    return {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || refreshToken,
      expiry_date: credentials.expiry_date,
      token_type: credentials.token_type || 'Bearer'
    };
  }

  async revokeTokens(tokens: { access_token?: string; refresh_token?: string }) {
    if (tokens.access_token) {
      await this.oauth2Client.revokeToken(tokens.access_token);
    }
  }
}