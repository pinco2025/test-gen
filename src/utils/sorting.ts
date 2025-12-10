import { SelectedQuestion } from '../types';

/**
 * Sorts selected questions for a section according to the rule:
 * First 20 questions from Division 1.
 * Last 5 questions from Division 2.
 *
 * Note: It assumes the input questions already satisfy the count requirements
 * (at least 20 Div 1 and 5 Div 2) or it will just take what is available in that priority order.
 *
 * Logic:
 * 1. Filter Div 1 questions.
 * 2. Filter Div 2 questions.
 * 3. Take first 20 Div 1.
 * 4. Take last 5 Div 2.
 * 5. Return concatenated list.
 */
export const sortQuestionsForSection = (questions: SelectedQuestion[]): SelectedQuestion[] => {
  const div1 = questions.filter(q => q.division === 1);
  const div2 = questions.filter(q => q.division === 2);

  // Per user requirement: "first 20 questions should be from Div 1 and then the last 5 questions should be from Div2"
  // If there are more than 20 Div 1, we only take the first 20?
  // The selection logic supposedly enforces limits, but let's be safe.
  // Actually, usually we want to preserve all selected questions if possible,
  // but the prompt implies a strict structure for the "final question review section".
  // Assuming the user has selected exactly 25 or more, and we want to fit this format.

  // If the user hasn't selected enough, we just take what is there, but sorted.

  // However, "last 5 questions from Div2" implies we might have more than 5 and we take the last 5?
  // Or it just means "the questions at positions 21-25".
  // Given the "Question selection logic strictly enforces division limits" memory,
  // it is likely we have exactly 20 Div 1 and 5 Div 2 selected.
  // So we can just concatenate them: Div 1s then Div 2s.

  // To be safe and deterministic, let's sort them by some stable property if needed,
  // but preserving selection order is usually preferred if they are already in a list.
  // But since we are splitting and re-joining, we lose relative order between Div 1 and Div 2.

  return [...div1.slice(0, 20), ...div2.slice(-5)];
};
