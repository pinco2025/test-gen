import { Question, QuestionFilter, Test, ProjectState, ProjectInfo, AppConfig } from './types';

declare global {
  interface Window {
    electronAPI: {
      db: {
        connect: (dbPath?: string) => Promise<{ success: boolean; error?: string }>;
        selectFile: () => Promise<{ success: boolean; path?: string; error?: string }>;
        isConnected: () => Promise<boolean>;
        getTypes: () => Promise<string[]>;
        getYears: () => Promise<string[]>;
        getTags: () => Promise<string[]>;
        getChaptersByType: () => Promise<{ [type: string]: string[] }>;
      };
      questions: {
        getAll: (filter?: QuestionFilter) => Promise<Question[]>;
        getByUUID: (uuid: string) => Promise<Question | null>;
        search: (criteria: any) => Promise<Question[]>;
        getCount: (filter?: QuestionFilter) => Promise<number>;
        getByChapterCodes: (type: string, chapterCodes: string[]) => Promise<Question[]>;
        incrementFrequency: (uuid: string) => Promise<boolean>;
        decrementFrequency: (uuid: string) => Promise<boolean>;
        updateQuestion: (uuid: string, updates: Partial<Question>) => Promise<boolean>;
        createQuestion: (question: Question) => Promise<boolean>;
      };
      test: {
        export: (test: Test) => Promise<{ success: boolean; path?: string; error?: string }>;
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
    };
  }
}

export {};
