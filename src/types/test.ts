import { Question } from './database';

// Test type definitions
export type TestType = 'Part' | 'Full';
export type SectionName = 'Physics' | 'Chemistry' | 'Mathematics';
export type Difficulty = 'E' | 'M' | 'H'; // Easy, Medium, Hard

// Chapter definition
export interface Chapter {
  code: string; // e.g., "PHY01", "CHE01", "MAT01"
  name: string; // e.g., "Mechanics", "Organic Chemistry"
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
      required_a: number; // From alpha
      required_b: number;
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
