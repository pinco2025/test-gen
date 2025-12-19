// Database schema types matching schema.txt

export interface Question {
  // Primary identifier
  uuid: string;

  // Question content
  question: string;
  question_image_url: string | null;

  // Option A
  option_a: string | null;
  option_a_image_url: string | null;

  // Option B
  option_b: string | null;
  option_b_image_url: string | null;

  // Option C
  option_c: string | null;
  option_c_image_url: string | null;

  // Option D
  option_d: string | null;
  option_d_image_url: string | null;

  // Answer and metadata
  // Expanded to allow string for Integer type questions
  answer: string;
  type: string;
  year: string | null;

  // Tags
  tag_1: string | null;
  tag_2: string | null;
  tag_3: string | null;
  tag_4: string | null;

  // New Metadata Fields
  topic_tags: string | null;         // JSON array of topic-wise tags
  importance_level: string | null;   // core, basic, advanced, niche
  verification_level_1: string | null; // First level: pending, approved, rejected
  verification_level_2: string | null; // Second level: pending, approved, rejected
  jee_mains_relevance: number | null; // 1-5 scale
  is_multi_concept: boolean | null;  // True/False
  related_concepts: string | null;   // JSON array of related concepts

  // Timestamps
  created_at: string;
  updated_at: string;

  // Frequency - tracks how many times this question has been selected
  frequency: number | null;

  // Legacy Image Fields
  legacy_question: string | null;
  legacy_a: string | null;
  legacy_b: string | null;
  legacy_c: string | null;
  legacy_d: string | null;
  legacy_solution: string | null;
}

export interface QuestionFilter {
  type?: string;
  year?: string;
  tags?: string[];
  chapter?: string;
  difficulty?: 'E' | 'M' | 'H';
  verification_level_1?: string;
  verification_level_2?: string;
}

export interface Solution {
    uuid: string;
    solution_text: string;
    solution_image_url: string;
}
