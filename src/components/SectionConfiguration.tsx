import React, { useState, useEffect } from 'react';
import { AlphaConstraint, BetaConstraint, ChapterDistribution, SectionName } from '../types';

interface SectionConfigurationProps {
  sectionName: SectionName;
  chapters: string[];
  onConfigure: (alpha: AlphaConstraint, beta: BetaConstraint) => void;
  onSkip: () => void;
}

/**
 * Component to configure Alpha and Beta constraints for a section
 */
export const SectionConfiguration: React.FC<SectionConfigurationProps> = ({
  sectionName,
  chapters,
  onConfigure,
  onSkip
}) => {
  const [alphaData, setAlphaData] = useState<ChapterDistribution[]>(
    chapters.map(ch => ({
      chapterName: ch,
      a: 0,
      b: 0,
      e: 0,
      m: 0,
      h: 0
    }))
  );

  const [betaData] = useState<BetaConstraint>({});

  useEffect(() => {
    // Update alpha data when chapters change
    setAlphaData(chapters.map(ch => {
      const existing = alphaData.find(a => a.chapterName === ch);
      return existing || {
        chapterName: ch,
        a: 0,
        b: 0,
        e: 0,
        m: 0,
        h: 0
      };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters]);

  const updateChapter = (index: number, field: keyof ChapterDistribution, value: number) => {
    const newData = [...alphaData];
    if (field !== 'chapterName') {
      newData[index] = { ...newData[index], [field]: value };
      setAlphaData(newData);
    }
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
                <tr key={chapter.chapterName}>
                  <td className="chapter-name">{chapter.chapterName}</td>
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
          className="btn-secondary"
          onClick={onSkip}
        >
          Skip Configuration
        </button>
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
