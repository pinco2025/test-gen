import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

interface SupabaseConfig {
  url: string;
  anonKey: string;
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

class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;
  private configPath: string;

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'supabase-config.json');
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(data);
        if (this.config?.url && this.config?.anonKey) {
          this.client = createClient(this.config.url, this.config.anonKey);
        }
      }
    } catch (error) {
      console.error('Failed to load Supabase config:', error);
    }
  }

  saveConfig(config: SupabaseConfig): void {
    this.config = config;
    this.client = createClient(config.url, config.anonKey);
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  getConfig(): SupabaseConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return !!(this.config?.url && this.config?.anonKey && this.client);
  }

  async insertTest(record: TestRecord): Promise<InsertResult> {
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
