import { githubService } from './githubService';
import { ProjectState } from '../src/types';

// ============ BACKUP REPOSITORY CONFIGURATION ============
// TODO: Set your backup repository details here
const BACKUP_CONFIG = {
    owner: 'pinco2025',  // Change this to your GitHub username
    repo: 'test-backup',       // Change this to your backup repository name
    branch: 'main',
    backupPath: 'test-backups/'     // Folder path in the repository
};
// =========================================================

interface BackupResult {
    success: boolean;
    backedUpCount: number;
    errors: string[];
}

interface ProjectBackupData {
    testId: string;
    testCode: string;
    backupTimestamp: string;
    status: 'not_started' | 'in_progress' | 'completed';
    completionPercentage: number;
    currentStep: string;
    sections: SectionBackup[];
    metadata: {
        testType: string;
        description: string;
        createdAt: string;
        lastModified: string;
    };
}

interface SectionBackup {
    name: string;
    status: 'void' | 'partial' | 'completed';
    questionsCompleted: number;
    questionsTarget: number;
    questions?: any[];
    voidMessage?: string;
}

class GitHubBackupService {
    /**
     * Check if backup is configured
     */
    isConfigured(): boolean {
        // Check if the placeholder values have been replaced
        return (
            BACKUP_CONFIG.owner !== 'YOUR_GITHUB_USERNAME' &&
            BACKUP_CONFIG.repo !== 'YOUR_BACKUP_REPO' &&
            githubService.isConfigured()
        );
    }

    /**
     * Calculate completion percentage based on project state
     */
    private calculateCompletion(projectState: ProjectState): number {
        if (!projectState.testMetadata) return 0;

        const totalSections = projectState.sections.length;
        if (totalSections === 0) return 0;

        let completedQuestions = 0;
        let totalTargetQuestions = 0;

        for (const section of projectState.sections) {
            const target = section.betaConstraint?.maxQuestions || 25;
            totalTargetQuestions += target;
            completedQuestions += section.selectedQuestions.length;
        }

        if (totalTargetQuestions === 0) return 0;
        return Math.round((completedQuestions / totalTargetQuestions) * 100);
    }

    /**
     * Determine overall status based on completion
     */
    private determineStatus(completionPercentage: number): 'not_started' | 'in_progress' | 'completed' {
        if (completionPercentage === 0) return 'not_started';
        if (completionPercentage === 100) return 'completed';
        return 'in_progress';
    }

    /**
     * Format a single project with progress indicators
     */
    private formatProjectWithProgress(projectState: ProjectState): ProjectBackupData {
        const completionPercentage = this.calculateCompletion(projectState);
        const status = this.determineStatus(completionPercentage);

        const sections: SectionBackup[] = projectState.sections.map(section => {
            const target = section.betaConstraint?.maxQuestions || 25;
            const completed = section.selectedQuestions.length;

            let sectionStatus: 'void' | 'partial' | 'completed';
            let voidMessage: string | undefined;

            if (completed === 0) {
                sectionStatus = 'void';
                voidMessage = `VOID - Section not started (0/${target} questions)`;
            } else if (completed < target) {
                sectionStatus = 'partial';
                voidMessage = `VOID - ${target - completed} questions remaining`;
            } else {
                sectionStatus = 'completed';
            }

            const sectionBackup: SectionBackup = {
                name: section.name,
                status: sectionStatus,
                questionsCompleted: completed,
                questionsTarget: target
            };

            // Include question data only if there are selected questions
            if (completed > 0) {
                sectionBackup.questions = section.selectedQuestions.map(sq => ({
                    uuid: sq.question.uuid,
                    question: sq.question.question,
                    question_image_url: sq.question.question_image_url,
                    answer: sq.question.answer,
                    division: sq.division,
                    status: sq.status,
                    chapter: sq.question.tag_2,
                    topic: sq.question.tag_1,
                    examSource: sq.question.examSource
                }));
            }

            if (voidMessage) {
                sectionBackup.voidMessage = voidMessage;
            }

            return sectionBackup;
        });

        return {
            testId: projectState.id,
            testCode: projectState.testMetadata?.code || 'Untitled',
            backupTimestamp: new Date().toISOString(),
            status,
            completionPercentage,
            currentStep: projectState.currentStep,
            sections,
            metadata: {
                testType: projectState.testMetadata?.testType || 'Unknown',
                description: projectState.testMetadata?.description || '',
                createdAt: projectState.createdAt,
                lastModified: projectState.lastModified || new Date().toISOString()
            }
        };
    }

    /**
     * Backup a single project to GitHub
     */
    async backupProject(projectId: string, projectState: ProjectState): Promise<{ success: boolean; error?: string }> {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Backup repository not configured. Please update BACKUP_CONFIG in githubBackupService.ts'
            };
        }

        try {
            const backupData = this.formatProjectWithProgress(projectState);
            const content = JSON.stringify(backupData, null, 2);
            const fileName = `${projectId}.json`;
            const filePath = `${BACKUP_CONFIG.backupPath}${fileName}`;

            // Get the GitHub token from the main GitHub service
            const config = githubService.getConfig();
            if (!config || !config.token) {
                return { success: false, error: 'GitHub token not available' };
            }

            // Use the Octokit from main GitHub service
            const { Octokit } = await import('@octokit/rest');
            const octokit = new Octokit({ auth: config.token });

            // Check if file exists
            let sha: string | undefined;
            try {
                const { data: existingFile } = await octokit.repos.getContent({
                    owner: BACKUP_CONFIG.owner,
                    repo: BACKUP_CONFIG.repo,
                    path: filePath,
                    ref: BACKUP_CONFIG.branch
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

            // Create or update the backup file
            const timestamp = new Date().toISOString();
            await octokit.repos.createOrUpdateFileContents({
                owner: BACKUP_CONFIG.owner,
                repo: BACKUP_CONFIG.repo,
                path: filePath,
                message: `Backup ${projectId} - ${backupData.completionPercentage}% complete - ${timestamp}`,
                content: Buffer.from(content).toString('base64'),
                branch: BACKUP_CONFIG.branch,
                sha
            });

            return { success: true };
        } catch (error: any) {
            console.error(`Failed to backup project ${projectId}:`, error);
            return {
                success: false,
                error: error.message || 'Unknown error during backup'
            };
        }
    }

    /**
     * Backup all provided projects
     * This is called before the app closes
     */
    async backupAllProjects(projectsData: Record<string, any>): Promise<BackupResult> {
        if (!this.isConfigured()) {
            console.log('[Backup] Backup repository not configured, skipping backup');
            return {
                success: false,
                backedUpCount: 0,
                errors: ['Backup repository not configured']
            };
        }

        const projectIds = Object.keys(projectsData);
        if (projectIds.length === 0) {
            return {
                success: true,
                backedUpCount: 0,
                errors: []
            };
        }

        console.log(`[Backup] Starting backup of ${projectIds.length} project(s)...`);
        const errors: string[] = [];
        let backedUpCount = 0;

        for (const projectId of projectIds) {
            const projectState = projectsData[projectId];
            const result = await this.backupProject(projectId, projectState);

            if (result.success) {
                backedUpCount++;
                console.log(`[Backup] ✓ Backed up project: ${projectId}`);
            } else {
                errors.push(`${projectId}: ${result.error}`);
                console.error(`[Backup] ✗ Failed to backup project: ${projectId} - ${result.error}`);
            }
        }

        console.log(`[Backup] Completed. Backed up ${backedUpCount}/${projectIds.length} project(s)`);

        return {
            success: errors.length === 0,
            backedUpCount,
            errors
        };
    }
}

export const githubBackupService = new GitHubBackupService();
