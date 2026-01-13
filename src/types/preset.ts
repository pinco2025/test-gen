// Auto Test Selection Preset Types

/**
 * Distribution of questions across different exam source tables
 * Percentages should sum to 100
 */
export interface TableDistribution {
    jee: number;   // Percentage (0-100) from jee_questions
    neet: number;  // Percentage (0-100) from neet_questions  
    bits: number;  // Percentage (0-100) from bits_questions
}

/**
 * Distribution of questions by class value
 * Counts should sum to the section's maxQuestions for that division
 */
export interface ClassDistribution {
    class1: number;     // Count with class=1
    class2: number;     // Count with class=2
    classNull: number;  // Count with class=NULL (remaining questions)
}

/**
 * Complete rule for a division (Div 1 or Div 2)
 */
export interface DivisionRule {
    tableDistribution: TableDistribution;
    classDistribution: ClassDistribution;
}

/**
 * Rules for both divisions of a section
 */
export interface SectionPreset {
    div1: DivisionRule;
    div2: DivisionRule;
}

/**
 * Global rules that apply across all sections
 */
export interface GlobalRules {
    prioritizeLowFrequency: boolean;      // Select questions with lowest frequency first
    incrementFrequencyOnSelect: boolean;  // Increment frequency after selection
}

/**
 * Complete selection preset configuration
 */
export interface SelectionPreset {
    id: string;
    name: string;           // e.g., "JEE"
    description: string;
    Physics: SectionPreset;
    Chemistry: SectionPreset;
    Mathematics: SectionPreset;
    globalRules: GlobalRules;
}

/**
 * Section definition from JSON upload (for auto-selection input)
 */
export interface AutoSelectSectionInput {
    name: 'Physics' | 'Chemistry' | 'Mathematics';
    type: 'Div 1' | 'Div 2';
    maxQuestions: number;
    weightage: Record<string, number>; // chapterCode -> count
}

/**
 * Auto-selection request payload
 */
export interface AutoSelectRequest {
    sections: AutoSelectSectionInput[];
    presetId: string;
}

/**
 * Result of auto-selection for a single section
 */
export interface AutoSelectSectionResult {
    sectionName: 'Physics' | 'Chemistry' | 'Mathematics';
    sectionType: 'Div 1' | 'Div 2';
    selectedQuestionUuids: string[];
    selectionDetails: {
        byTable: { jee: number; neet: number; bits: number };
        byClass: { class1: number; class2: number; classNull: number };
        byChapter: Record<string, number>;
    };
}

/**
 * Complete auto-selection response
 */
export interface AutoSelectResponse {
    success: boolean;
    sections: AutoSelectSectionResult[];
    totalSelected: number;
    frequencyUpdated: boolean;
    error?: string;
}
