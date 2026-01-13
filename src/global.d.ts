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
  testId: string;
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

// Exam type for multi-table support
export type ExamType = 'JEE' | 'NEET' | 'BITS' | 'IPQ';

// Exam table status for multi-exam support
export interface ExamTableStatus {
  exam: ExamType | 'IPQ';
  hasQuestionsTable: boolean;
  hasSolutionsTable: boolean;
  isComplete: boolean;
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
        getExamTablesStatus: () => Promise<ExamTableStatus[]>;
        getTypes: () => Promise<string[]>;
        getYears: () => Promise<string[]>;
        getTags: () => Promise<string[]>;
        getChaptersByType: (exam?: ExamType) => Promise<{ [type: string]: string[] }>;
      };
      chapters: {
        load: () => Promise<any>;
        selectFile: () => Promise<{ success: boolean; path?: string; error?: string }>;
        addTopic: (subject: string, chapterCode: string, topicName: string) => Promise<{ success: boolean; topicId?: string; topicName?: string; error?: string }>;
      };
      questions: {
        getAll: (filter?: QuestionFilter, exam?: ExamType) => Promise<Question[]>;
        getByUUID: (uuid: string, exam?: ExamType) => Promise<Question | null>;
        getByUUIDs: (uuids: string[], exam?: ExamType) => Promise<Question[]>;
        search: (criteria: any, exam?: ExamType) => Promise<Question[]>;
        getCount: (filter?: QuestionFilter, exam?: ExamType) => Promise<number>;
        getAllExamCounts: () => Promise<{ total: number; breakdown: { exam: string; count: number }[] }>;
        getByChapterCodes: (type: string, chapterCodes: string[], exam?: ExamType) => Promise<Question[]>;
        getAllForSubject: (chapterCodes: string[], exam?: ExamType) => Promise<Question[]>;
        incrementFrequency: (uuid: string, exam?: ExamType) => Promise<boolean>;
        decrementFrequency: (uuid: string, exam?: ExamType) => Promise<boolean>;
        updateQuestion: (uuid: string, updates: Partial<Question>, exam?: ExamType) => Promise<boolean>;
        bulkUpdateQuestions: (uuids: string[], updates: Partial<Question>, exam?: ExamType) => Promise<{ success: boolean, updatedCount: number }>;
        createQuestion: (question: Question, exam?: ExamType) => Promise<boolean>;
        clone: (uuid: string, exam?: ExamType) => Promise<Question | null>;
        getSolution: (uuid: string, exam?: ExamType) => Promise<Solution | null>;
        getSolutionsByUUIDs: (uuids: string[], exam?: ExamType) => Promise<Record<string, { uuid: string, solution_text: string, solution_image_url: string }>>;
        saveSolution: (uuid: string, solutionText: string, solutionImageUrl: string, exam?: ExamType) => Promise<boolean>;
      };
      ipq: {
        createQuestion: (question: Question, parentExam: ExamType) => Promise<boolean>;
        saveSolution: (uuid: string, solutionText: string, solutionImageUrl: string) => Promise<boolean>;
        getQuestions: (parentExam?: ExamType) => Promise<Question[]>;
        getSolution: (uuid: string) => Promise<{ uuid: string; solution_text: string; solution_image_url: string } | null>;
        getCount: (parentExam?: ExamType) => Promise<number>;
        getTablesStatus: () => Promise<{ hasQuestionsTable: boolean; hasSolutionsTable: boolean; isComplete: boolean }>;
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
      presets: {
        list: () => Promise<Array<{ id: string; name: string; description: string }>>;
        get: (presetId: string) => Promise<any>;
        import: () => Promise<{ success: boolean; id?: string; message?: string }>;
        save: (preset: any) => Promise<{ success: boolean; id?: string; message?: string }>;
      };
      autoSelect: {
        run: (
          sections: Array<{
            name: 'Physics' | 'Chemistry' | 'Mathematics';
            type: 'Div 1' | 'Div 2';
            maxQuestions: number;
            weightage: Record<string, number>;
          }>,
          presetId: string
        ) => Promise<{
          success: boolean;
          sections: Array<{
            sectionName: string;
            sectionType: string;
            selectedQuestionUuids: string[];
            selectionDetails: {
              byTable: { jee: number; neet: number; bits: number };
              byClass: { class1: number; class2: number; classNull: number };
              byChapter: Record<string, number>;
            };
          }>;
          totalSelected: number;
          frequencyUpdated: boolean;
          error?: string;
        }>;
      };
    };
  }
}

export { };
