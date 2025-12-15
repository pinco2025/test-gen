import { Octokit } from '@octokit/rest';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

interface GitHubConfig {
  enabled: boolean;
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

interface UploadResult {
  success: boolean;
  url?: string;
  rawUrl?: string;
  error?: string;
}

interface AppConfig {
  github?: GitHubConfig;
}

class GitHubService {
  private octokit: Octokit | null = null;
  private config: GitHubConfig | null = null;

  constructor() {
    this.loadConfig();
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

        if (appConfig.github) {
          this.config = appConfig.github;

          // Only initialize Octokit if enabled and has valid token
          if (this.config.enabled && this.config.token && !this.config.token.includes('YOUR_')) {
            this.octokit = new Octokit({ auth: this.config.token });
            console.log('GitHub service initialized from config.json');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load GitHub config:', error);
    }
  }

  saveConfig(config: GitHubConfig): void {
    try {
      const configPath = this.getConfigPath();
      let appConfig: AppConfig = {};

      // Load existing config
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8');
        appConfig = JSON.parse(data);
      }

      // Update GitHub config
      appConfig.github = config;
      this.config = config;

      if (config.enabled && config.token) {
        this.octokit = new Octokit({ auth: config.token });
      }

      fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
    } catch (error) {
      console.error('Failed to save GitHub config:', error);
    }
  }

  getConfig(): GitHubConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return !!(
      this.config?.enabled &&
      this.config?.token &&
      !this.config.token.includes('YOUR_') &&
      this.config?.owner &&
      !this.config.owner.includes('YOUR_') &&
      this.config?.repo &&
      !this.config.repo.includes('YOUR_')
    );
  }

  async uploadFile(
    filePath: string,
    content: string,
    commitMessage: string
  ): Promise<UploadResult> {
    if (!this.octokit || !this.config) {
      return { success: false, error: 'GitHub not configured' };
    }

    try {
      const { owner, repo, branch } = this.config;

      // Check if file already exists
      let sha: string | undefined;
      try {
        const { data: existingFile } = await this.octokit.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref: branch
        });

        if (!Array.isArray(existingFile) && existingFile.type === 'file') {
          sha = existingFile.sha;
        }
      } catch (error: any) {
        // File doesn't exist, that's fine
        if (error.status !== 404) {
          throw error;
        }
      }

      // Create or update file
      const result = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha
      });

      // Generate raw URL for the file
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      const htmlUrl = result.data.content?.html_url || '';

      return {
        success: true,
        url: htmlUrl,
        rawUrl
      };
    } catch (error: any) {
      console.error('GitHub upload failed:', error);
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
  }

  async uploadTestFiles(
    testId: string,
    testContent: string,
    solutionsContent: string
  ): Promise<{ test: UploadResult; solutions: UploadResult }> {
    const testPath = `tests/${testId}.json`;
    const solutionsPath = `tests/${testId}_solutions.json`;
    const timestamp = new Date().toISOString();

    const testResult = await this.uploadFile(
      testPath,
      testContent,
      `Add test ${testId} - ${timestamp}`
    );

    const solutionsResult = await this.uploadFile(
      solutionsPath,
      solutionsContent,
      `Add solutions for ${testId} - ${timestamp}`
    );

    return {
      test: testResult,
      solutions: solutionsResult
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.octokit || !this.config) {
      return { success: false, error: 'GitHub not configured' };
    }

    try {
      const { owner, repo } = this.config;
      await this.octokit.repos.get({ owner, repo });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed'
      };
    }
  }
}

export const githubService = new GitHubService();
