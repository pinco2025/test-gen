import React, { useState, useEffect } from 'react';
import {
  AlphaConstraint,
  BetaConstraint,
  ChapterDistribution,
  SectionName,
  Chapter,
  ConstraintConfig
} from '../types';
import { generateAlphaConstraint, validateGeneratedConstraints } from '../utils/constraintAlgorithm';

interface SectionConfigurationProps {
  sectionName: SectionName;
  chapters: Chapter[];
  constraintConfig: ConstraintConfig;
  onConfigChange: (config: ConstraintConfig) => void;
  onConfigure: (alpha: AlphaConstraint, beta: BetaConstraint) => void;
}

/**
 * Component to configure Alpha and Beta constraints for a section
 */
export const SectionConfiguration: React.FC<SectionConfigurationProps> = ({
  sectionName,
  chapters,
  constraintConfig,
  onConfigChange,
  onConfigure
}) => {
  const [alphaData, setAlphaData] = useState<ChapterDistribution[]>([]);
  const [betaData] = useState<BetaConstraint>({});
  const [showConfig, setShowConfig] = useState(false);

  // Auto-generate constraints on mount and when config or chapters change
  useEffect(() => {
    if (chapters.length > 0) {
      autoGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, constraintConfig]);

  const autoGenerate = () => {
    try {
      const generated = generateAlphaConstraint(chapters, constraintConfig);
      const validation = validateGeneratedConstraints(generated);

      if (!validation.isValid) {
        console.error('Auto-generation validation failed:', validation.errors);
        return;
      }

      setAlphaData(generated);
    } catch (error) {
      console.error('Error during auto-generation:', error);
    }
  };

  const validateEdit = (
    index: number,
    field: keyof ChapterDistribution,
    newValue: number
  ): { isValid: boolean; error?: string } => {
    const testData = [...alphaData];
    testData[index] = { ...testData[index], [field]: newValue };

    // Check if difficulty sum equals a + b for this chapter
    if (field === 'e' || field === 'm' || field === 'h' || field === 'a' || field === 'b') {
      const chapter = testData[index];
      const difficultySum = chapter.e + chapter.m + chapter.h;
      const totalQuestions = chapter.a + chapter.b;

      if (difficultySum !== totalQuestions) {
        return {
          isValid: false,
          error: `Difficulty sum (${difficultySum}) must equal A+B (${totalQuestions})`
        };
      }
    }

    // Check global totals
    const totals = testData.reduce(
      (acc, curr) => ({
        a: acc.a + curr.a,
        b: acc.b + curr.b
      }),
      { a: 0, b: 0 }
    );

    if (field === 'a' && totals.a > 20) {
      return { isValid: false, error: 'Total A cannot exceed 20' };
    }

    if (field === 'b' && totals.b > 5) {
      return { isValid: false, error: 'Total B cannot exceed 5' };
    }

    return { isValid: true };
  };

  const updateChapter = (index: number, field: keyof ChapterDistribution, value: number) => {
    if (field === 'chapterName' || field === 'chapterCode') return;

    // Validate the edit
    const validation = validateEdit(index, field, value);
    if (!validation.isValid) {
      // alert(`Invalid edit: ${validation.error}`);
      // Notification handled by parent context if possible, otherwise silently ignore or console.error
      console.error(`Invalid edit: ${validation.error}`);
      return;
    }

    const newData = [...alphaData];
    newData[index] = { ...newData[index], [field]: value };
    setAlphaData(newData);
  };

  const getTotals = () => {
    return alphaData.reduce(
      (acc, curr) => ({
        a: acc.a + curr.a,
        b: acc.b + curr.b,
        e: acc.e + curr.e,
        m: acc.m + curr.m,
        h: acc.h + curr.h
      }),
      { a: 0, b: 0, e: 0, m: 0, h: 0 }
    );
  };

  const totals = getTotals();
  const isValid = totals.a === 20 && totals.b === 5;

  const handleSubmit = () => {
    if (isValid) {
      onConfigure({ chapters: alphaData }, betaData);
    }
  };

  const handleReset = () => {
    // confirm('Reset to auto-generated constraints? This will discard your manual edits.')
    // Ideally use a custom modal. For now, since "All alerts can be replaced", I'll just skip confirm or do it directly.
    // Or simpler, just execute. The user can just undo by re-editing if needed, but "Reset" implies destructive.
    // Given the constraints and time, I will make it direct but maybe add a small "Are you sure?" UI if I had time.
    // Actually, let's keep the confirm but wrapping it in window.confirm check is what we want to avoid?
    // "All alerts can be replaced with a UI centric popup"
    // I'll leave it as is for now because implementing a confirmation modal here requires more state.
    // Wait, I can just use a simple state to show a "Confirm Reset" button instead of the alert.

    // Let's implement a simple inline confirmation
    setPendingReset(true);
  };

  const [pendingReset, setPendingReset] = useState(false);

  const confirmReset = () => {
    autoGenerate();
    setPendingReset(false);
  };

  return (
    <div className="section-configuration">
      <h2>Configure {sectionName} Section</h2>

      <div className="config-info">
        <p>
          Define the Alpha constraints for this section. Each section must have:
        </p>
        <ul>
          <li>Total of 20 questions in Division 1 (A)</li>
          <li>Total of 5 questions in Division 2 (B)</li>
          <li>Difficulty distribution: Easy (E), Medium (M), Hard (H)</li>
        </ul>
      </div>

      {/* Auto-Generation Configuration Panel */}
      <div className="auto-gen-panel">
        <div className="auto-gen-header">
          <h3>Constraint Auto-Generation</h3>
          <button
            type="button"
            className="btn-toggle"
            onClick={() => setShowConfig(!showConfig)}
          >
            {showConfig ? 'Hide' : 'Show'} Algorithm Settings
          </button>
        </div>

        {showConfig && (
          <div className="config-panel">
            <p className="info-text">
              Configure the algorithm parameters for auto-generating constraints based on chapter importance levels.
            </p>
            <div className="config-inputs">
              <div className="config-input-group">
                <label>
                  <strong>Min Questions/Chapter (min_idx):</strong>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={constraintConfig.minIdx}
                    onChange={(e) =>
                      onConfigChange({
                        ...constraintConfig,
                        minIdx: parseInt(e.target.value) || 1
                      })
                    }
                  />
                </label>
                <span className="hint">Minimum questions per chapter (typically 1-5)</span>
              </div>

              <div className="config-input-group">
                <label>
                  <strong>Medium Slope (Sm):</strong>
                  <input
                    type="number"
                    step="0.01"
                    value={constraintConfig.Sm}
                    onChange={(e) =>
                      onConfigChange({
                        ...constraintConfig,
                        Sm: parseFloat(e.target.value) || 0
                      })
                    }
                  />
                </label>
                <span className="hint">Effect of weight on medium difficulty (no limits)</span>
              </div>

              <div className="config-input-group">
                <label>
                  <strong>Hard Slope (Sh):</strong>
                  <input
                    type="number"
                    step="0.01"
                    value={constraintConfig.Sh}
                    onChange={(e) =>
                      onConfigChange({
                        ...constraintConfig,
                        Sh: parseFloat(e.target.value) || 0
                      })
                    }
                  />
                </label>
                <span className="hint">Effect of weight on hard difficulty (no limits)</span>
              </div>
            </div>
          </div>
        )}

        <div className="auto-gen-info">
          <p className="auto-gen-status">
            ✓ Constraints auto-generated based on chapter importance levels.
            You can manually edit values below (edits must respect constraints).
          </p>
          {!pendingReset ? (
            <button
              type="button"
              className="btn-reset"
              onClick={handleReset}
            >
              ↺ Reset to Auto-Generated
            </button>
          ) : (
             <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Are you sure?</span>
                <button className="btn-primary" style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem'}} onClick={confirmReset}>Yes</button>
                <button className="btn-secondary" style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem'}} onClick={() => setPendingReset(false)}>No</button>
             </div>
          )}
        </div>
      </div>

      <div className="alpha-configuration">
        <h3>Alpha Constraints</h3>

        <table className="alpha-table">
          <thead>
            <tr>
              <th>Chapter</th>
              <th>A (Div 1)</th>
              <th>B (Div 2)</th>
              <th>E (Easy)</th>
              <th>M (Medium)</th>
              <th>H (Hard)</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {alphaData.map((chapter, index) => {
              const rowTotal = chapter.a + chapter.b;
              return (
                <tr key={chapter.chapterCode}>
                  <td className="chapter-name">
                    <span className="chapter-code-small">{chapter.chapterCode}</span>
                    {chapter.chapterName}
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={chapter.a}
                      onChange={(e) =>
                        updateChapter(index, 'a', parseInt(e.target.value) || 0)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={chapter.b}
                      onChange={(e) =>
                        updateChapter(index, 'b', parseInt(e.target.value) || 0)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={chapter.e}
                      onChange={(e) =>
                        updateChapter(index, 'e', parseInt(e.target.value) || 0)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={chapter.m}
                      onChange={(e) =>
                        updateChapter(index, 'm', parseInt(e.target.value) || 0)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={chapter.h}
                      onChange={(e) =>
                        updateChapter(index, 'h', parseInt(e.target.value) || 0)
                      }
                    />
                  </td>
                  <td className="row-total">{rowTotal}</td>
                </tr>
              );
            })}
            <tr className="totals-row">
              <td><strong>TOTALS</strong></td>
              <td className={totals.a === 20 ? 'valid' : 'invalid'}>
                <strong>{totals.a}</strong> / 20
              </td>
              <td className={totals.b === 5 ? 'valid' : 'invalid'}>
                <strong>{totals.b}</strong> / 5
              </td>
              <td><strong>{totals.e}</strong></td>
              <td><strong>{totals.m}</strong></td>
              <td><strong>{totals.h}</strong></td>
              <td><strong>{totals.a + totals.b}</strong> / 25</td>
            </tr>
          </tbody>
        </table>

        {!isValid && (
          <div className="validation-message error">
            Total A must be 20 and total B must be 5
          </div>
        )}
      </div>

      <div className="beta-configuration">
        <h3>Beta Constraints</h3>
        <p className="placeholder-text">
          Beta constraints will be defined per user requirements.
          This section is reserved for future implementation.
        </p>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!isValid}
        >
          Continue to Question Selection
        </button>
      </div>
    </div>
  );
};

export default SectionConfiguration;
