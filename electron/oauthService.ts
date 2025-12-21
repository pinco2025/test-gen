import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.join(app.getPath('userData'), 'google-oauth-tokens.json');

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export class OAuthService {
  private oauth2Client: any = null;
  private clientId: string = '';
  private clientSecret: string = '';
  private redirectUri: string = 'http://localhost';
  private initialized = false;

  constructor() {
    // Initialization is lazy
  }

  private async ensureInitialized() {
    if (this.initialized) return;

    // Dynamic import to avoid heavy load at startup
    // We only need this if we are actually authenticating or creating the client
    // But we need google.auth.OAuth2 constructor.
    // We can delay loading credentials until we need them.
    this.loadCredentials();
    this.initialized = true;
  }

  private getCredentialsPath(): string {
    // Try project root first (for development)
    const devPath = path.join(process.cwd(), 'oauth-credentials.json');
    if (fs.existsSync(devPath)) {
      return devPath;
    }

    // Try resources path (for packaged app with extraResources)
    if (process.resourcesPath) {
      const resourcePath = path.join(process.resourcesPath, 'oauth-credentials.json');
      if (fs.existsSync(resourcePath)) {
        return resourcePath;
      }
    }

    // Try app path (for packaged app in asar)
    const appPath = path.join(app.getAppPath(), 'oauth-credentials.json');
    if (fs.existsSync(appPath)) {
      return appPath;
    }

    // Fallback to userData directory
    return path.join(app.getPath('userData'), 'oauth-credentials.json');
  }

  private async loadCredentials() {
    try {
      const credPath = this.getCredentialsPath();
      if (fs.existsSync(credPath)) {
        const credentialsFile = JSON.parse(fs.readFileSync(credPath, 'utf-8'));

        // Handle both "installed" and "web" credential types
        const credentials = credentialsFile.installed || credentialsFile.web;

        if (!credentials) {
          throw new Error('Invalid OAuth credentials file format. Expected "installed" or "web" key.');
        }

        this.clientId = credentials.client_id;
        this.clientSecret = credentials.client_secret;
        this.redirectUri = credentials.redirect_uris?.[0] || 'http://localhost';

        const { google } = await import('googleapis');
        this.oauth2Client = new google.auth.OAuth2(
          this.clientId,
          this.clientSecret,
          this.redirectUri
        );

        console.log('OAuth credentials loaded from:', credPath);
      }
    } catch (error) {
      console.error('Failed to load OAuth credentials:', error);
    }
  }

  async authenticate(): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.oauth2Client) {
        // Try loading again if it failed or wasn't ready
        await this.loadCredentials();
        if (!this.oauth2Client) {
             throw new Error('OAuth client could not be initialized. Please check oauth-credentials.json.');
        }
    }

    return new Promise((resolve, reject) => {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
      });

      // Create a new window for OAuth
      const authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      authWindow.loadURL(authUrl);

      // Listen for the redirect callback
      authWindow.webContents.on('will-redirect', async (event, url) => {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');

        if (code) {
          try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);
            this.saveTokens(tokens);
            authWindow.close();
            resolve(true);
          } catch (error) {
            console.error('Error getting tokens:', error);
            authWindow.close();
            reject(error);
          }
        }
      });

      authWindow.on('closed', () => {
        reject(new Error('Authentication window was closed'));
      });
    });
  }

  private saveTokens(tokens: any) {
    try {
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  private loadTokens(): OAuthTokens | null {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
    return null;
  }

  async getAuthClient() {
    await this.ensureInitialized();

    if (!this.oauth2Client) {
      // One last try
      await this.loadCredentials();
      if (!this.oauth2Client) {
          throw new Error('OAuth client not initialized. Please ensure oauth-credentials.json exists.');
      }
    }

    const tokens = this.loadTokens();

    if (!tokens) {
      // No tokens found, need to authenticate
      await this.authenticate();
      return this.oauth2Client;
    }

    // Set the credentials
    this.oauth2Client.setCredentials(tokens);

    // Check if token is expired
    if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
      try {
        // Refresh the token
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);
        this.saveTokens(credentials);
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // If refresh fails, re-authenticate
        await this.authenticate();
      }
    }

    return this.oauth2Client;
  }

  isAuthenticated(): boolean {
    // This is synchronous, so we can't async load credentials here easily if we want to keep signature.
    // However, checking token file existence doesn't require googleapis.
    const tokens = this.loadTokens();
    return tokens !== null && tokens.access_token !== undefined;
  }

  clearTokens() {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        fs.unlinkSync(TOKEN_PATH);
      }
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }
}

export const oauthService = new OAuthService();
