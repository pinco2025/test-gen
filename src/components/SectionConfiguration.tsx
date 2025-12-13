import React, { useState, useEffect, useMemo } from 'react';
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
  const [pendingReset, setPendingReset] = useState(false);

  useEffect(() => {
    if (chapters.length > 0) {
      autoGenerate();
    }
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

  const updateChapter = (index: number, field: keyof ChapterDistribution, value: number) => {
    if (field === 'chapterName' || field === 'chapterCode') return;
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

  const alphaDataWithValidation = useMemo(() => {
    return alphaData.map(chapter => ({
      ...chapter,
      isRowValid: chapter.a + chapter.b === chapter.e + chapter.m + chapter.h
    }));
  }, [alphaData]);

  const totals = getTotals();
  const hasRowErrors = alphaDataWithValidation.some(c => !c.isRowValid);
  const isValid = totals.a === 20 && totals.b === 5 && !hasRowErrors;

  const handleSubmit = () => {
    if (isValid) {
      onConfigure({ chapters: alphaData }, betaData);
    }
  };

  const confirmReset = () => {
    autoGenerate();
    setPendingReset(false);
  };

  return (
    <div className="max-w-6xl mx-auto bg-surface-light dark:bg-surface-dark p-8 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
      <h2 className="text-2xl font-bold text-text-main dark:text-white mb-6">Configure {sectionName} Section</h2>

      <div className="mb-6 p-4 bg-blue-50 dark:bg-primary/10 border-l-4 border-blue-400 dark:border-primary text-blue-800 dark:text-blue-200">
        <p>Define the Alpha constraints for this section. Each section must have:</p>
        <ul className="list-disc list-inside ml-4 mt-2 text-sm">
          <li>Total of 20 questions in Division 1 (A)</li>
          <li>Total of 5 questions in Division 2 (B)</li>
          <li>A valid distribution of Easy (E), Medium (M), and Hard (H) questions</li>
        </ul>
      </div>

      <div className="bg-background-light dark:bg-background-dark p-4 rounded-lg border border-border-light dark:border-border-dark mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Constraint Auto-Generation</h3>
          <button type="button" onClick={() => setShowConfig(!showConfig)} className="text-sm font-medium text-primary hover:underline">
            {showConfig ? 'Hide' : 'Show'} Algorithm Settings
          </button>
        </div>
        {showConfig && (
          <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-md border border-border-light dark:border-border-dark mb-4">
            <p className="text-sm text-text-secondary italic mb-4">Configure the algorithm for auto-generating constraints.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary">Min Questions/Chapter</label>
                <input type="number" min="1" max="5" value={constraintConfig.minIdx} onChange={(e) => onConfigChange({ ...constraintConfig, minIdx: parseInt(e.target.value) || 1 })} className="mt-1 w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary">Medium Slope</label>
                <input type="number" step="0.01" value={constraintConfig.Sm} onChange={(e) => onConfigChange({ ...constraintConfig, Sm: parseFloat(e.target.value) || 0 })} className="mt-1 w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary">Hard Slope</label>
                <input type="number" step="0.01" value={constraintConfig.Sh} onChange={(e) => onConfigChange({ ...constraintConfig, Sh: parseFloat(e.target.value) || 0 })} className="mt-1 w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-md" />
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">Constraints auto-generated. You can manually edit values below.</p>
            {!pendingReset ? (
                <button type="button" onClick={() => setPendingReset(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Reset</button>
            ) : (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-text-secondary">Are you sure?</span>
                    <button onClick={confirmReset} className="px-3 py-1 text-sm rounded-md bg-primary text-white">Yes</button>
                    <button onClick={() => setPendingReset(false)} className="px-3 py-1 text-sm rounded-md border border-border-light dark:border-border-dark">No</button>
                </div>
            )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Alpha Constraints</h3>
        <div className="overflow-x-auto rounded-lg border border-border-light dark:border-border-dark">
          <table className="min-w-full divide-y divide-border-light dark:divide-border-dark text-sm">
            <thead className="bg-background-light dark:bg-background-dark">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Chapter</th>
                {['A (Div 1)', 'B (Div 2)', 'Easy', 'Medium', 'Hard', 'Total'].map(h => <th key={h} className="px-4 py-2 text-center font-medium text-text-secondary">{h}</th>)}
              </tr>
            </thead>
            <tbody className="bg-surface-light dark:bg-surface-dark divide-y divide-border-light dark:divide-border-dark">
              {alphaDataWithValidation.map((chapter, index) => (
                <tr key={chapter.chapterCode} className={!chapter.isRowValid ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{chapter.chapterName}</td>
                  {['a', 'b', 'e', 'm', 'h'].map(field => (
                    <td key={field} className="px-4 py-2 text-center">
                      <input type="number" min="0" value={chapter[field as keyof ChapterDistribution]} onChange={(e) => updateChapter(index, field as keyof ChapterDistribution, parseInt(e.target.value) || 0)} className="w-16 text-center bg-transparent border-border-light dark:border-border-dark rounded-md focus:ring-primary focus:border-primary" />
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center font-semibold">{chapter.a + chapter.b}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-background-light dark:bg-background-dark font-bold">
              <tr>
                <td className="px-4 py-2 text-left">TOTALS</td>
                <td className={`px-4 py-2 text-center ${totals.a === 20 ? 'text-green-600' : 'text-red-600'}`}>{totals.a} / 20</td>
                <td className={`px-4 py-2 text-center ${totals.b === 5 ? 'text-green-600' : 'text-red-600'}`}>{totals.b} / 5</td>
                <td className="px-4 py-2 text-center">{totals.e}</td>
                <td className="px-4 py-2 text-center">{totals.m}</td>
                <td className="px-4 py-2 text-center">{totals.h}</td>
                <td className="px-4 py-2 text-center">{totals.a + totals.b} / 25</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!isValid && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-md text-sm">
            <p className="font-bold mb-1">Please correct the errors:</p>
            <ul className="list-disc list-inside ml-4">
                {totals.a !== 20 && <li>Total Division 1 (A) questions must be 20.</li>}
                {totals.b !== 5 && <li>Total Division 2 (B) questions must be 5.</li>}
                {hasRowErrors && <li>For each chapter, the sum of difficulties (E+M+H) must equal the total questions (A+B). Invalid rows are highlighted.</li>}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Beta Constraints</h3>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 text-text-secondary rounded-md text-sm italic">Beta constraints are reserved for future implementation.</div>
      </div>

      <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={!isValid} className="bg-primary text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
          Continue to Question Selection
        </button>
      </div>
    </div>
  );
};

export default SectionConfiguration;
