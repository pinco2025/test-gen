import { Question, QuestionFilter, Test, ProjectState, ProjectInfo, AppConfig, Solution } from './types';

export interface ExportConfig {
  duration: number;
  exam: string;
  type: string;
  tier: string;
  totalQuestions: number;
  markingScheme: string;
  instructions: string[];
  title: string;
  description: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface TestRecord {
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

export interface ExportResult {
  success: boolean;
  localPath?: string;
  solutionsPath?: string;
  githubTestUrl?: string;
  githubSolutionsUrl?: string;
  supabaseInserted?: boolean;
  error?: string;
}

declare global {
  interface Window {
    electronAPI: {
      uploadImage: (filePath: string) => Promise<{ success: boolean; url?: string; error?: string }>;
      uploadImageFromBuffer: (buffer: ArrayBuffer, fileName: string, mimeType: string) => Promise<{ success: boolean; url?: string; error?: string }>;
      oauth: {
        authenticate: () => Promise<{ success: boolean; error?: string }>;
        isAuthenticated: () => Promise<boolean>;
        clearTokens: () => Promise<{ success: boolean }>;
      };
      db: {
        connect: (dbPath?: string) => Promise<{ success: boolean; error?: string }>;
        selectFile: () => Promise<{ success: boolean; path?: string; error?: string }>;
        isConnected: () => Promise<boolean>;
        getTypes: () => Promise<string[]>;
        getYears: () => Promise<string[]>;
        getTags: () => Promise<string[]>;
        getChaptersByType: () => Promise<{ [type: string]: string[] }>;
      };
      chapters: {
        load: () => Promise<any>;
        selectFile: () => Promise<{ success: boolean; path?: string; error?: string }>;
        addTopic: (subject: string, chapterCode: string, topicName: string) => Promise<{ success: boolean; topicId?: string; topicName?: string; error?: string }>;
      };
      questions: {
        getAll: (filter?: QuestionFilter) => Promise<Question[]>;
        getByUUID: (uuid: string) => Promise<Question | null>;
        getByUUIDs: (uuids: string[]) => Promise<Question[]>;
        search: (criteria: any) => Promise<Question[]>;
        getCount: (filter?: QuestionFilter) => Promise<number>;
        getByChapterCodes: (type: string, chapterCodes: string[]) => Promise<Question[]>;
        getAllForSubject: (chapterCodes: string[]) => Promise<Question[]>;
        incrementFrequency: (uuid: string) => Promise<boolean>;
        decrementFrequency: (uuid: string) => Promise<boolean>;
        updateQuestion: (uuid: string, updates: Partial<Question>) => Promise<boolean>;
        bulkUpdateQuestions: (uuids: string[], updates: Partial<Question>) => Promise<{ success: boolean, updatedCount: number }>;
        createQuestion: (question: Question) => Promise<boolean>;
        clone: (uuid: string) => Promise<Question | null>;
        getSolution: (uuid: string) => Promise<Solution | null>;
        getSolutionsByUUIDs: (uuids: string[]) => Promise<Record<string, { uuid: string, solution_text: string, solution_image_url: string }>>;
        saveSolution: (uuid: string, solutionText: string, solutionImageUrl: string) => Promise<boolean>;
      };
      test: {
        export: (test: Test) => Promise<{ success: boolean; path?: string; error?: string }>;
        exportWithConfig: (test: Test, exportConfig: ExportConfig) => Promise<ExportResult>;
      };
      github: {
        configure: (config: GitHubConfig) => Promise<{ success: boolean; error?: string }>;
        getConfig: () => Promise<GitHubConfig | null>;
        isConfigured: () => Promise<boolean>;
        testConnection: () => Promise<{ success: boolean; error?: string }>;
        uploadTestFiles: (testId: string, testContent: string, solutionsContent: string) => Promise<{
          test: { success: boolean; url?: string; rawUrl?: string; error?: string };
          solutions: { success: boolean; url?: string; rawUrl?: string; error?: string };
        }>;
      };
      supabase: {
        configure: (config: SupabaseConfig) => Promise<{ success: boolean; error?: string }>;
        getConfig: () => Promise<SupabaseConfig | null>;
        isConfigured: () => Promise<boolean>;
        testConnection: () => Promise<{ success: boolean; error?: string }>;
        insertTest: (record: TestRecord) => Promise<{ success: boolean; data?: any; error?: string }>;
      };
      project: {
        save: (projectState: ProjectState) => Promise<{ success: boolean; error?: string }>;
        load: (projectId: string) => Promise<ProjectState | null>;
        delete: (projectId: string) => Promise<{ success: boolean }>;
        list: () => Promise<ProjectInfo[]>;
        exists: (projectId: string) => Promise<boolean>;
      };
      config: {
        get: () => Promise<AppConfig>;
        update: (updates: Partial<AppConfig>) => Promise<{ success: boolean; error?: string }>;
        deleteAllProjects: () => Promise<{ success: boolean; count: number }>;
      };
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
      };
    };
  }
}

export {};
