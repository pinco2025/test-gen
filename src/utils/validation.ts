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
    if (!chapterCounts[sq.chapterCode]) {
      chapterCounts[sq.chapterCode] = { a: 0, b: 0 };
    }
    if (sq.division === 1) {
      chapterCounts[sq.chapterCode].a++;
    } else {
      chapterCounts[sq.chapterCode].b++;
    }
  });

  alphaConstraint.chapters.forEach(ch => {
    const actual = chapterCounts[ch.chapterCode] || { a: 0, b: 0 };

    if (actual.a !== ch.a) {
      errors.push(
        `Chapter "${ch.chapterCode} - ${ch.chapterName}" Division 1: expected ${ch.a}, got ${actual.a}`
      );
    }

    if (actual.b !== ch.b) {
      errors.push(
        `Chapter "${ch.chapterCode} - ${ch.chapterName}" Division 2: expected ${ch.b}, got ${actual.b}`
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
    byChapter[ch.chapterCode] = {
      chapterName: ch.chapterName,
      a: 0,
      b: 0,
      e: 0,
      m: 0,
      h: 0,
      required_a: ch.a,
      required_b: ch.b,
      required_e: ch.e,
      required_m: ch.m,
      required_h: ch.h
    };
    requiredE += ch.e;
    requiredM += ch.m;
    requiredH += ch.h;
  });

  // Count
  selectedQuestions.forEach(sq => {
    if (byChapter[sq.chapterCode]) {
      if (sq.division === 1) {
        byChapter[sq.chapterCode].a++;
      } else {
        byChapter[sq.chapterCode].b++;
      }
      // Track difficulty per chapter
      if (sq.difficulty === 'E') byChapter[sq.chapterCode].e++;
      else if (sq.difficulty === 'M') byChapter[sq.chapterCode].m++;
      else if (sq.difficulty === 'H') byChapter[sq.chapterCode].h++;
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
