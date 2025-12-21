import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

interface SupabaseConfig {
  enabled: boolean;
  url: string;
  anonKey: string;
  accessToken?: string;
}

interface TestRecord {
  testID: string;
  url: string;
  exam: string;
  type: string;
  tier: string;
  duration: number;
  title: string;
  description: string;
  totalQuestions: number;
  markingScheme: string;
  instructions: object[];
}

interface InsertResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface AppConfig {
  supabase?: SupabaseConfig;
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;
  private initialized = false;

  constructor() {
    // Initialization is lazy
  }

  private ensureInitialized() {
    if (this.initialized) return;
    this.loadConfig();
    this.initialized = true;
  }

  private getConfigPath(): string {
    // Try project root first (for development)
    const devPath = path.join(process.cwd(), 'config.json');
    if (fs.existsSync(devPath)) {
      return devPath;
    }

    // Try resources path (for packaged app with extraResources)
    if (process.resourcesPath) {
      const resourcePath = path.join(process.resourcesPath, 'config.json');
      if (fs.existsSync(resourcePath)) {
        return resourcePath;
      }
    }

    // Try app path (for production)
    const appPath = path.join(app.getAppPath(), 'config.json');
    if (fs.existsSync(appPath)) {
      return appPath;
    }

    // Fallback to userData directory
    return path.join(app.getPath('userData'), 'config.json');
  }

  loadConfig(): void {
    try {
      const configPath = this.getConfigPath();
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8');
        const appConfig: AppConfig = JSON.parse(data);

        if (appConfig.supabase) {
          this.config = appConfig.supabase;

          // Only initialize client if enabled and has valid credentials
          if (
            this.config.enabled &&
            this.config.url &&
            !this.config.url.includes('YOUR_') &&
            this.config.anonKey &&
            !this.config.anonKey.includes('YOUR_')
          ) {
            const options = this.config.accessToken
              ? { global: { headers: { Authorization: `Bearer ${this.config.accessToken}` } } }
              : undefined;
            this.client = createClient(this.config.url, this.config.anonKey, options);
            console.log('Supabase service initialized from config.json');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load Supabase config:', error);
    }
  }

  saveConfig(config: SupabaseConfig): void {
    this.ensureInitialized();
    try {
      const configPath = this.getConfigPath();
      let appConfig: AppConfig = {};

      // Load existing config
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8');
        appConfig = JSON.parse(data);
      }

      // Update Supabase config
      appConfig.supabase = config;
      this.config = config;

      if (config.enabled && config.url && config.anonKey) {
        const options = config.accessToken
          ? { global: { headers: { Authorization: `Bearer ${config.accessToken}` } } }
          : undefined;
        this.client = createClient(config.url, config.anonKey, options);
      }

      fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
    } catch (error) {
      console.error('Failed to save Supabase config:', error);
    }
  }

  getConfig(): SupabaseConfig | null {
    this.ensureInitialized();
    return this.config;
  }

  isConfigured(): boolean {
    this.ensureInitialized();
    return !!(
      this.config?.enabled &&
      this.config?.url &&
      !this.config.url.includes('YOUR_') &&
      this.config?.anonKey &&
      !this.config.anonKey.includes('YOUR_') &&
      this.client
    );
  }

  async insertTest(record: TestRecord): Promise<InsertResult> {
    this.ensureInitialized();
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Convert instructions array to JSONB array format for Supabase
      const instructionsJsonb = record.instructions.map(instruction => {
        if (typeof instruction === 'string') {
          return { text: instruction };
        }
        return instruction;
      });

      const { data, error } = await this.client
        .from('tests')
        .upsert({
          testID: record.testID,
          url: record.url,
          exam: record.exam,
          type: record.type,
          tier: record.tier,
          duration: record.duration,
          title: record.title,
          description: record.description,
          totalQuestions: record.totalQuestions,
          markingScheme: record.markingScheme,
          instructions: instructionsJsonb
        }, {
          onConflict: 'testID'
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Supabase insert failed:', error);
      return { success: false, error: error.message || 'Insert failed' };
    }
  }

  async getTest(testId: string): Promise<InsertResult> {
    this.ensureInitialized();
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.client
        .from('tests')
        .select('*')
        .eq('testID', testId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Fetch failed' };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    this.ensureInitialized();
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Try to query the tests table (just check connection)
      const { error } = await this.client
        .from('tests')
        .select('testID')
        .limit(1);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed'
      };
    }
  }
}

export const supabaseService = new SupabaseService();
