import { Question } from './database';

// Test type definitions
export type TestType = 'Part' | 'Full';
export type SectionName = 'Physics' | 'Chemistry' | 'Mathematics';
export type Difficulty = 'E' | 'M' | 'H'; // Easy, Medium, Hard

export type WorkflowStep =
  | 'database-connect'
  | 'dashboard'
  | 'test-creation'
  | 'section-config-physics'
  | 'section-config-chemistry'
  | 'section-config-math'
  | 'question-select-physics'
  | 'question-select-chemistry'
  | 'question-select-math'
  | 'test-review'
  | 'ui-test-interface'
  | 'ui-review-interface'
  | 'edit-question'
  | 'complete'
  | 'full-test-creation'
  | 'full-test-overview'
  | 'full-test-question-select';

// Chapter definition
export interface Chapter {
  code: string; // e.g., "PHY01", "CHE01", "MAT01"
  name: string; // e.g., "Mechanics", "Organic Chemistry"
  level: number; // Importance/weightage (1-4): 1=low, 2=medium, 3=high, 4=very high
  topics?: Record<string, string>; // Map of topic ID to topic name
}

// Chapters data structure
export interface ChaptersData {
  Physics: Chapter[];
  Chemistry: Chapter[];
  Mathematics: Chapter[];
}

// Alpha constraints for a section
export interface AlphaConstraint {
  // Chapter-wise distribution
  chapters: ChapterDistribution[];
}

export interface ChapterDistribution {
  chapterCode: string; // Changed from chapterName to chapterCode
  chapterName: string; // Added for display purposes
  a: number; // Questions for division 1 (out of 20)
  b: number; // Questions for division 2 (out of 5)
  e: number; // Easy difficulty count
  m: number; // Medium difficulty count
  h: number; // Hard difficulty count
}

// Beta constraints (user input per section)
export interface BetaConstraint {
  // To be defined by user requirements
  // Placeholder for future implementation
  [key: string]: any;
}

// Section configuration
export interface SectionConfig {
  name: SectionName;
  chapters: Chapter[]; // List of chapters with code and name
  alphaConstraint: AlphaConstraint;
  betaConstraint: BetaConstraint;
  selectedQuestions: SelectedQuestion[];
}

// Selected question with metadata
export interface SelectedQuestion {
  question: Question;
  chapterCode: string; // Changed from chapter to chapterCode
  chapterName: string; // Added for display
  difficulty: Difficulty;
  division: 1 | 2; // 1 for first 20, 2 for last 5
  status?: 'accepted' | 'review' | 'pending';
}

// Test metadata
export interface TestMetadata {
  code: string;
  description: string;
  testType: TestType;
  createdAt: string;
}

// Complete test structure
export interface Test {
  metadata: TestMetadata;
  sections: SectionConfig[];
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Summary of selections vs constraints
export interface SelectionSummary {
  total: number;
  division1: number; // Should be 20
  division2: number; // Should be 5
  byChapter: {
    [chapterCode: string]: {
      chapterName: string; // Added for display
      a: number; // Current count
      b: number;
      e: number; // Easy count
      m: number; // Medium count
      h: number; // Hard count
      required_a: number; // From alpha
      required_b: number;
      required_e: number; // Required easy
      required_m: number; // Required medium
      required_h: number; // Required hard
    };
  };
  byDifficulty: {
    easy: number;
    medium: number;
    hard: number;
    required_e: number; // From alpha
    required_m: number;
    required_h: number;
  };
}

// Global configuration for constraint generation algorithm
export interface ConstraintConfig {
  minIdx: number; // Minimum questions per chapter (e.g., 0 or 1)
  Sm: number; // Slope for medium difficulty weight effect
  Sh: number; // Slope for hard difficulty weight effect
}

// Project state for multi-tab support
export interface ProjectState {
  id: string; // Project ID (based on test ID/code)
  testMetadata: TestMetadata | null;
  sections: SectionConfig[];
  currentSectionIndex: number;
  constraintConfig: ConstraintConfig;
  currentStep: string; // WorkflowStep as string
  activeChapterCode?: string; // For Full Tests: currently selected chapter
  fullTestSectionView?: number | null; // For Full Tests: persistent section view in overview
  createdAt: string;
  lastModified: string;
  lastActiveQuestionUuid?: string | null; // Track the last viewed/edited question
}

// Project metadata for listing
export interface ProjectInfo {
  id: string;
  testCode: string;
  description: string;
  testType?: TestType;
  createdAt: string;
  lastModified: string;
  progress: number; // 0-100 percentage
}

// App configuration
export interface AppConfig {
  databasePath: string | null;
  chaptersPath: string | null;
  lastProjectId: string | null;
}
