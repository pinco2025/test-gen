import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { ProjectState, ProjectInfo, AppConfig } from '../src/types';

/**
 * ProjectService handles persistence of project states and app configuration
 */
class ProjectService {
  private projectsDir: string;
  private configPath: string;
  private config: AppConfig;

  constructor() {
    // Use app.getPath('userData') for persistent storage
    const userDataPath = app.getPath('userData');
    this.projectsDir = path.join(userDataPath, 'projects');
    this.configPath = path.join(userDataPath, 'config.json');

    // Ensure directories exist
    this.ensureDirectories();

    // Load or initialize config
    this.config = this.loadConfig();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }
  }

  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }

    // Default config
    return {
      databasePath: null,
      lastProjectId: null
    };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  /**
   * Get app configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Update app configuration
   */
  updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * Get the project file path for a given project ID
   */
  private getProjectPath(projectId: string): string {
    return path.join(this.projectsDir, `${projectId}.json`);
  }

  /**
   * Save a project state to disk
   */
  saveProject(projectState: ProjectState): void {
    try {
      const filePath = this.getProjectPath(projectState.id);
      const data = JSON.stringify(projectState, null, 2);
      fs.writeFileSync(filePath, data, 'utf-8');
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  }

  /**
   * Load a project state from disk
   */
  loadProject(projectId: string): ProjectState | null {
    try {
      const filePath = this.getProjectPath(projectId);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading project:', error);
      return null;
    }
  }

  /**
   * Delete a project
   */
  deleteProject(projectId: string): boolean {
    try {
      const filePath = this.getProjectPath(projectId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  /**
   * Check if a project exists
   */
  projectExists(projectId: string): boolean {
    const filePath = this.getProjectPath(projectId);
    return fs.existsSync(filePath);
  }

  /**
   * List all projects with metadata
   */
  listProjects(): ProjectInfo[] {
    try {
      const files = fs.readdirSync(this.projectsDir);
      const projects: ProjectInfo[] = [];

      for (const file of files) {
        if (path.extname(file) === '.json') {
          const filePath = path.join(this.projectsDir, file);
          const data = fs.readFileSync(filePath, 'utf-8');
          const projectState: ProjectState = JSON.parse(data);

          // Calculate progress based on completion
          const progress = this.calculateProgress(projectState);

          projects.push({
            id: projectState.id,
            testCode: projectState.testMetadata?.code || 'Untitled',
            description: projectState.testMetadata?.description || '',
            createdAt: projectState.createdAt,
            lastModified: projectState.lastModified,
            progress
          });
        }
      }

      // Sort by last modified (most recent first)
      projects.sort((a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );

      return projects;
    } catch (error) {
      console.error('Error listing projects:', error);
      return [];
    }
  }

  /**
   * Calculate project progress percentage
   */
  private calculateProgress(projectState: ProjectState): number {
    const steps = [
      'database-connect',
      'test-creation',
      'section-config-physics',
      'section-config-chemistry',
      'section-config-math',
      'question-select-physics',
      'question-select-chemistry',
      'question-select-math',
      'test-review',
      'complete'
    ];

    const currentStepIndex = steps.indexOf(projectState.currentStep);
    if (currentStepIndex === -1) return 0;

    // Base progress on step
    let progress = (currentStepIndex / (steps.length - 1)) * 100;

    // Adjust based on section completion
    if (projectState.currentStep.startsWith('section-config-') ||
        projectState.currentStep.startsWith('question-select-')) {
      const completedSections = projectState.sections.filter(
        s => s.selectedQuestions.length === 25
      ).length;
      progress += (completedSections / 3) * 10; // Add up to 10% for section completion
    }

    return Math.min(Math.round(progress), 100);
  }

  /**
   * Delete all projects (for database change)
   */
  deleteAllProjects(): number {
    try {
      const files = fs.readdirSync(this.projectsDir);
      let count = 0;

      for (const file of files) {
        if (path.extname(file) === '.json') {
          const filePath = path.join(this.projectsDir, file);
          fs.unlinkSync(filePath);
          count++;
        }
      }

      return count;
    } catch (error) {
      console.error('Error deleting all projects:', error);
      return 0;
    }
  }
}

// Singleton instance
export const projectService = new ProjectService();
