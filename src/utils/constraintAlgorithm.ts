import { Chapter, ChapterDistribution, ConstraintConfig } from '../types';

/**
 * Generate alpha and beta constraints automatically based on chapter weights
 *
 * Algorithm:
 * For each chapter k:
 *   ak = min_idx + floor((T - n*min_idx) * (wk/sum(wk))) + buffer
 *   where T=20 for division 1, T=5 for division 2
 *
 * For difficulty distribution:
 *   Tk = ak + bk
 *   s = (wk - 1) / 3  (normalized weight)
 *   mk = floor(Tk * (m0 + s * Sm))
 *   hk = floor(Tk * (h0 + s * Sh))
 *   ek = Tk - (mk + hk)
 */

// Base difficulty ratios
const M0 = 0.5; // 5/10 for Medium
const H0 = 0.2; // 2/10 for Hard
// Easy is calculated as the remainder: E = Total - (M + H)

/**
 * Generate alpha constraint (A and B distribution) for selected chapters
 */
export function generateAlphaConstraint(
  chapters: Chapter[],
  config: ConstraintConfig
): ChapterDistribution[] {
  const n = chapters.length;
  const { minIdx } = config;

  // Calculate sum of weights
  const sumWeights = chapters.reduce((sum, ch) => sum + ch.level, 0);

  // Generate ak values for Division 1 (T=20)
  const T_a = 20;
  const akValues = chapters.map(ch => {
    const baseAllocation = Math.floor(((T_a - n * minIdx) * ch.level) / sumWeights);
    return minIdx + baseAllocation;
  });

  // Calculate deficit and distribute buffer for Division 1
  let deficitA = T_a - akValues.reduce((sum, val) => sum + val, 0);
  const akFinal = distributeBuffer([...akValues], deficitA);

  // Generate bk values for Division 2 (T=5)
  const T_b = 5;
  const bkValues = chapters.map(ch => {
    const baseAllocation = Math.floor(((T_b - n * minIdx) * ch.level) / sumWeights);
    return minIdx + baseAllocation;
  });

  // Calculate deficit and distribute buffer for Division 2
  let deficitB = T_b - bkValues.reduce((sum, val) => sum + val, 0);
  const bkFinal = distributeBuffer([...bkValues], deficitB);

  // Generate chapter distributions with difficulty breakdowns
  return chapters.map((ch, idx) => {
    const a = akFinal[idx];
    const b = bkFinal[idx];
    const { e, m, h } = calculateDifficultyDistribution(a + b, ch.level, config);

    return {
      chapterCode: ch.code,
      chapterName: ch.name,
      a,
      b,
      e,
      m,
      h
    };
  });
}

/**
 * Distribute buffer randomly to make up deficit
 */
function distributeBuffer(values: number[], deficit: number): number[] {
  if (deficit <= 0) return values;

  const n = values.length;
  const indices = Array.from({ length: n }, (_, i) => i);

  // Shuffle indices for random distribution
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Distribute +1 to random chapters until deficit is covered
  for (let i = 0; i < deficit && i < n; i++) {
    values[indices[i]]++;
  }

  return values;
}

/**
 * Calculate difficulty distribution (E, M, H) for a chapter
 *
 * Formula:
 *   s = (wk - 1) / 3
 *   mk = floor(Tk * (m0 + s * Sm))
 *   hk = floor(Tk * (h0 + s * Sh))
 *   ek = Tk - (mk + hk)
 *
 *   If (ek + mk + hk) < Tk, add deficit to mk
 */
function calculateDifficultyDistribution(
  Tk: number,
  wk: number,
  config: ConstraintConfig
): { e: number; m: number; h: number } {
  if (Tk === 0) {
    return { e: 0, m: 0, h: 0 };
  }

  const { Sm, Sh } = config;

  // Normalized weight: s = (wk - 1) / 3
  const s = (wk - 1) / 3;

  // Calculate medium and hard, ensuring they're never negative
  const mk = Math.max(0, Math.floor(Tk * (M0 + s * Sm)));
  const hk = Math.max(0, Math.floor(Tk * (H0 + s * Sh)));

  // Calculate easy as remainder, ensuring it's never negative
  let ek = Math.max(0, Tk - (mk + hk));

  // Handle deficit due to floor operations
  const total = ek + mk + hk;
  const deficit = Tk - total;

  return {
    e: ek,
    m: mk + deficit, // Add deficit to medium
    h: hk
  };
}

/**
 * Validate generated constraints
 */
export function validateGeneratedConstraints(
  distributions: ChapterDistribution[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check Division 1 sum
  const totalA = distributions.reduce((sum, d) => sum + d.a, 0);
  if (totalA !== 20) {
    errors.push(`Division 1 total is ${totalA}, expected 20`);
  }

  // Check Division 2 sum
  const totalB = distributions.reduce((sum, d) => sum + d.b, 0);
  if (totalB !== 5) {
    errors.push(`Division 2 total is ${totalB}, expected 5`);
  }

  // Check each chapter's difficulty sum
  distributions.forEach(d => {
    const diffTotal = d.e + d.m + d.h;
    const expected = d.a + d.b;
    if (diffTotal !== expected) {
      errors.push(
        `Chapter ${d.chapterCode}: difficulty sum ${diffTotal} ≠ (a+b) ${expected}`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}
