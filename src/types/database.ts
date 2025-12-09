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
  answer: 'A' | 'B' | 'C' | 'D';
  type: string;
  year: string | null;

  // Tags
  tag_1: string | null;
  tag_2: string | null;
  tag_3: string | null;
  tag_4: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Frequency - tracks how many times this question has been selected
  frequency: number | null;
}

export interface QuestionFilter {
  type?: string;
  year?: string;
  tags?: string[];
  chapter?: string;
  difficulty?: 'E' | 'M' | 'H';
}
