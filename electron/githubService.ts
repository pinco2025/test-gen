import { Octokit } from '@octokit/rest';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

interface GitHubConfig {
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

class GitHubService {
  private octokit: Octokit | null = null;
  private config: GitHubConfig | null = null;
  private configPath: string;

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'github-config.json');
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(data);
        if (this.config?.token) {
          this.octokit = new Octokit({ auth: this.config.token });
        }
      }
    } catch (error) {
      console.error('Failed to load GitHub config:', error);
    }
  }

  saveConfig(config: GitHubConfig): void {
    this.config = config;
    this.octokit = new Octokit({ auth: config.token });
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  getConfig(): GitHubConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return !!(this.config?.token && this.config?.owner && this.config?.repo);
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
