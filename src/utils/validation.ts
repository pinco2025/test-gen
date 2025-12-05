import {
  AlphaConstraint,
  SelectedQuestion,
  ValidationResult,
  SelectionSummary
} from '../types';

/**
 * Validate if selected questions meet Alpha constraints
 */
export function validateSelection(
  selectedQuestions: SelectedQuestion[],
  alphaConstraint: AlphaConstraint
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check total counts
  const div1Count = selectedQuestions.filter(sq => sq.division === 1).length;
  const div2Count = selectedQuestions.filter(sq => sq.division === 2).length;

  if (div1Count !== 20) {
    errors.push(`Division 1 must have exactly 20 questions (current: ${div1Count})`);
  }

  if (div2Count !== 5) {
    errors.push(`Division 2 must have exactly 5 questions (current: ${div2Count})`);
  }

  // Check chapter-wise distribution
  const chapterCounts: { [key: string]: { a: number; b: number } } = {};

  selectedQuestions.forEach(sq => {
    if (!chapterCounts[sq.chapter]) {
      chapterCounts[sq.chapter] = { a: 0, b: 0 };
    }
    if (sq.division === 1) {
      chapterCounts[sq.chapter].a++;
    } else {
      chapterCounts[sq.chapter].b++;
    }
  });

  alphaConstraint.chapters.forEach(ch => {
    const actual = chapterCounts[ch.chapterName] || { a: 0, b: 0 };

    if (actual.a !== ch.a) {
      errors.push(
        `Chapter "${ch.chapterName}" Division 1: expected ${ch.a}, got ${actual.a}`
      );
    }

    if (actual.b !== ch.b) {
      errors.push(
        `Chapter "${ch.chapterName}" Division 2: expected ${ch.b}, got ${actual.b}`
      );
    }
  });

  // Check difficulty distribution
  const difficultyCounts = {
    E: 0,
    M: 0,
    H: 0
  };

  selectedQuestions.forEach(sq => {
    difficultyCounts[sq.difficulty]++;
  });

  const requiredDifficulty = alphaConstraint.chapters.reduce(
    (acc, ch) => ({
      E: acc.E + ch.e,
      M: acc.M + ch.m,
      H: acc.H + ch.h
    }),
    { E: 0, M: 0, H: 0 }
  );

  if (difficultyCounts.E !== requiredDifficulty.E) {
    warnings.push(
      `Easy questions: expected ${requiredDifficulty.E}, got ${difficultyCounts.E}`
    );
  }

  if (difficultyCounts.M !== requiredDifficulty.M) {
    warnings.push(
      `Medium questions: expected ${requiredDifficulty.M}, got ${difficultyCounts.M}`
    );
  }

  if (difficultyCounts.H !== requiredDifficulty.H) {
    warnings.push(
      `Hard questions: expected ${requiredDifficulty.H}, got ${difficultyCounts.H}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate selection summary for display
 */
export function generateSummary(
  selectedQuestions: SelectedQuestion[],
  alphaConstraint: AlphaConstraint
): SelectionSummary {
  const byChapter: SelectionSummary['byChapter'] = {};
  let totalE = 0, totalM = 0, totalH = 0;
  let requiredE = 0, requiredM = 0, requiredH = 0;

  // Initialize
  alphaConstraint.chapters.forEach(ch => {
    byChapter[ch.chapterName] = {
      a: 0,
      b: 0,
      required_a: ch.a,
      required_b: ch.b
    };
    requiredE += ch.e;
    requiredM += ch.m;
    requiredH += ch.h;
  });

  // Count
  selectedQuestions.forEach(sq => {
    if (byChapter[sq.chapter]) {
      if (sq.division === 1) {
        byChapter[sq.chapter].a++;
      } else {
        byChapter[sq.chapter].b++;
      }
    }

    if (sq.difficulty === 'E') totalE++;
    if (sq.difficulty === 'M') totalM++;
    if (sq.difficulty === 'H') totalH++;
  });

  const div1 = selectedQuestions.filter(sq => sq.division === 1).length;
  const div2 = selectedQuestions.filter(sq => sq.division === 2).length;

  return {
    total: selectedQuestions.length,
    division1: div1,
    division2: div2,
    byChapter,
    byDifficulty: {
      easy: totalE,
      medium: totalM,
      hard: totalH,
      required_e: requiredE,
      required_m: requiredM,
      required_h: requiredH
    }
  };
}
