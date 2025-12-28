import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CheckIn, Holiday } from '@/types/checkin';

const GOOGLE_CLIENT_ID = '54363970856-toq5tm5ooocbcgcau4gg0jol6gsggkni.apps.googleusercontent.com';
const ENABLE_GOOGLE_SYNC = true; // Set to false to disable Google Drive sync completely
const GOOGLE_REDIRECT_URI = AuthSession.makeRedirectUri({
  useProxy: true,
});
const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];

interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

interface SyncData {
  checkIns: CheckIn[];
  holidays: Holiday[];
  lastSync: number;
}

class GoogleDriveSync {
  private static instance: GoogleDriveSync;
  private tokens: GoogleTokens | null = null;
  private readonly TOKENS_KEY = 'google_tokens';
  private readonly SYNC_FILE_NAME = 'unbroken_fitness_data.json';

  private constructor() { }

  public static getInstance(): GoogleDriveSync {
    if (!GoogleDriveSync.instance) {
      GoogleDriveSync.instance = new GoogleDriveSync();
    }
    return GoogleDriveSync.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const storedTokens = await AsyncStorage.getItem(this.TOKENS_KEY);
      if (storedTokens) {
        this.tokens = JSON.parse(storedTokens);
      }
    } catch (error) {
      console.error('Failed to initialize Google Drive sync:', error);
    }
  }

  public async signIn(): Promise<boolean> {
    try {
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: GOOGLE_SCOPES,
        redirectUri: GOOGLE_REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        codeChallenge: await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          'code_verifier',
          { encoding: Crypto.CryptoEncoding.BASE64 }
        ),
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      if (result.type === 'success' && result.params.code) {
        const tokens = await this.exchangeCodeForTokens(result.params.code);
        if (tokens) {
          this.tokens = tokens;
          await AsyncStorage.setItem(this.TOKENS_KEY, JSON.stringify(tokens));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      return false;
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<GoogleTokens | null> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          code,
          grant_type: 'authorization_code',
          redirect_uri: GOOGLE_REDIRECT_URI,
        }).toString(),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          tokenType: data.token_type,
        };
      }
      return null;
    } catch (error) {
      console.error('Token exchange failed:', error);
      return null;
    }
  }

  public async signOut(): Promise<void> {
    try {
      this.tokens = null;
      await AsyncStorage.removeItem(this.TOKENS_KEY);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  public isSignedIn(): boolean {
    return this.tokens !== null;
  }

  private async ensureValidToken(): Promise<boolean> {
    if (!this.tokens) return false;

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
        },
      });

      if (response.ok) {
        return true;
      }

      if (this.tokens.refreshToken) {
        return await this.refreshAccessToken();
      }

      return false;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.tokens?.refreshToken) return false;

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          refresh_token: this.tokens.refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (response.ok) {
        const data = await response.json();
        this.tokens = {
          ...this.tokens,
          accessToken: data.access_token,
          expiresIn: data.expires_in,
        };
        await AsyncStorage.setItem(this.TOKENS_KEY, JSON.stringify(this.tokens));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  private async findSyncFile(): Promise<string | null> {
    if (!await this.ensureValidToken()) return null;

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${this.SYNC_FILE_NAME}'&spaces=appDataFolder`,
        {
          headers: {
            'Authorization': `Bearer ${this.tokens!.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.files && data.files.length > 0 ? data.files[0].id : null;
      }
      return null;
    } catch (error) {
      console.error('Failed to find sync file:', error);
      return null;
    }
  }

  public async uploadData(checkIns: CheckIn[], holidays: Holiday[]): Promise<boolean> {
    if (!await this.ensureValidToken()) return false;

    try {
      const syncData: SyncData = {
        checkIns,
        holidays,
        lastSync: Date.now(),
      };

      const fileId = await this.findSyncFile();
      const url = fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

      const metadata = {
        name: this.SYNC_FILE_NAME,
        parents: ['appDataFolder'],
      };

      const form = new FormData();
      if (!fileId) {
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      }
      form.append('file', new Blob([JSON.stringify(syncData)], { type: 'application/json' }));

      const response = await fetch(url, {
        method: fileId ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens!.accessToken}`,
        },
        body: fileId ? JSON.stringify(syncData) : form,
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to upload data:', error);
      return false;
    }
  }

  public async downloadData(): Promise<SyncData | null> {
    if (!await this.ensureValidToken()) return null;

    try {
      const fileId = await this.findSyncFile();
      if (!fileId) return null;

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${this.tokens!.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data as SyncData;
      }
      return null;
    } catch (error) {
      console.error('Failed to download data:', error);
      return null;
    }
  }

  public async syncData(localCheckIns: CheckIn[], localHolidays: Holiday[]): Promise<{
    checkIns: CheckIn[];
    holidays: Holiday[];
    synced: boolean;
  }> {
    try {
      const remoteData = await this.downloadData();

      if (!remoteData) {
        const uploaded = await this.uploadData(localCheckIns, localHolidays);
        return {
          checkIns: localCheckIns,
          holidays: localHolidays,
          synced: uploaded,
        };
      }

      const mergedCheckIns = this.mergeCheckIns(localCheckIns, remoteData.checkIns);
      const mergedHolidays = this.mergeHolidays(localHolidays, remoteData.holidays);

      const uploaded = await this.uploadData(mergedCheckIns, mergedHolidays);

      return {
        checkIns: mergedCheckIns,
        holidays: mergedHolidays,
        synced: uploaded,
      };
    } catch (error) {
      console.error('Sync failed:', error);
      return {
        checkIns: localCheckIns,
        holidays: localHolidays,
        synced: false,
      };
    }
  }

  private mergeCheckIns(local: CheckIn[], remote: CheckIn[]): CheckIn[] {
    const merged = new Map<string, CheckIn>();

    [...local, ...remote].forEach(checkIn => {
      const existing = merged.get(checkIn.date);
      if (!existing || checkIn.timestamp > existing.timestamp) {
        merged.set(checkIn.date, checkIn);
      }
    });

    return Array.from(merged.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  private mergeHolidays(local: Holiday[], remote: Holiday[]): Holiday[] {
    const merged = new Map<string, Holiday>();

    [...local, ...remote].forEach(holiday => {
      const existing = merged.get(holiday.date);
      if (!existing || holiday.timestamp > existing.timestamp) {
        merged.set(holiday.date, holiday);
      }
    });

    return Array.from(merged.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
}

export default GoogleDriveSync;