// Database schema types matching schema.txt

export interface Question {
  // Primary identifier
  uuid: string;

  // Question content
  question: string;
  question_schematic: string | null;
  question_schematic_type: 'chemfig' | 'circuitikz' | 'tikz' | 'none' | null;
  question_schematic_packages: string | null; // JSON array

  // Option A
  option_a: string | null;
  option_a_schematic: string | null;
  option_a_schematic_type: 'chemfig' | 'circuitikz' | 'tikz' | 'none' | null;
  option_a_schematic_packages: string | null;

  // Option B
  option_b: string | null;
  option_b_schematic: string | null;
  option_b_schematic_type: 'chemfig' | 'circuitikz' | 'tikz' | 'none' | null;
  option_b_schematic_packages: string | null;

  // Option C
  option_c: string | null;
  option_c_schematic: string | null;
  option_c_schematic_type: 'chemfig' | 'circuitikz' | 'tikz' | 'none' | null;
  option_c_schematic_packages: string | null;

  // Option D
  option_d: string | null;
  option_d_schematic: string | null;
  option_d_schematic_type: 'chemfig' | 'circuitikz' | 'tikz' | 'none' | null;
  option_d_schematic_packages: string | null;

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
}

export interface QuestionFilter {
  type?: string;
  year?: string;
  tags?: string[];
  chapter?: string;
  difficulty?: 'E' | 'M' | 'H';
}
