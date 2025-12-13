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
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white dark:bg-[#1e1e2d] rounded-2xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm p-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Configure {sectionName} Section
          </h2>

          {/* Info Banner */}
          <div className="mb-8 p-5 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg transition-all duration-200">
            <p className="text-blue-900 dark:text-blue-100 font-medium mb-2">
              Define the Alpha constraints for this section. Each section must have:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>Total of <strong>20 questions</strong> in Division 1 (A)</li>
              <li>Total of <strong>5 questions</strong> in Division 2 (B)</li>
              <li>A valid distribution of <strong>Easy (E), Medium (M), and Hard (H)</strong> questions</li>
            </ul>
          </div>

          {/* Algorithm Settings */}
          <div className="mb-8 bg-gray-50 dark:bg-[#252535] p-5 rounded-xl border border-gray-200 dark:border-[#2d2d3b] transition-all duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Constraint Auto-Generation
              </h3>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-sm font-medium text-primary hover:text-primary/90 transition-colors flex items-center gap-1"
              >
                {showConfig ? 'Hide' : 'Show'} Algorithm Settings
                <span className="material-symbols-outlined text-base">
                  {showConfig ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>

            {/* Collapsible Config */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                showConfig ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="p-5 bg-white dark:bg-[#1e1e2d] rounded-lg border border-gray-200 dark:border-[#2d2d3b] mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-4">
                  Configure the algorithm for auto-generating constraints.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Min Questions/Chapter
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={constraintConfig.minIdx}
                      onChange={(e) => onConfigChange({ ...constraintConfig, minIdx: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-[#2d2d3b] rounded-lg bg-white dark:bg-[#1e1e2d] text-gray-900 dark:text-white focus:ring-2 focus:ring-[primary] focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Medium Slope
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={constraintConfig.Sm}
                      onChange={(e) => onConfigChange({ ...constraintConfig, Sm: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-[#2d2d3b] rounded-lg bg-white dark:bg-[#1e1e2d] text-gray-900 dark:text-white focus:ring-2 focus:ring-[primary] focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Hard Slope
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={constraintConfig.Sh}
                      onChange={(e) => onConfigChange({ ...constraintConfig, Sh: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-[#2d2d3b] rounded-lg bg-white dark:bg-[#1e1e2d] text-gray-900 dark:text-white focus:ring-2 focus:ring-[primary] focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Success Message with Reset */}
            <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 transition-all duration-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Constraints auto-generated. You can manually edit values below.
                </p>
              </div>
              {!pendingReset ? (
                <button
                  type="button"
                  onClick={() => setPendingReset(true)}
                  className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors px-3 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20"
                >
                  Reset
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Are you sure?</span>
                  <button
                    onClick={confirmReset}
                    className="px-4 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setPendingReset(false)}
                    className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-[#2d2d3b] hover:bg-gray-100 dark:hover:bg-[#252535] transition-all"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Alpha Constraints Table */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Alpha Constraints
            </h3>
            <div className="overflow-x-auto rounded-xl border-2 border-gray-300 dark:border-[#2d2d3b] shadow-md">
              <table className="min-w-full divide-y-2 divide-gray-300 dark:divide-[#2d2d3b]">
                <thead className="bg-gray-100 dark:bg-[#121121]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider border-r border-gray-300 dark:border-[#2d2d3b]">
                      Chapter
                    </th>
                    {['A (Div 1)', 'B (Div 2)', 'Easy', 'Medium', 'Hard', 'Total'].map(h => (
                      <th key={h} className={`px-6 py-4 text-center text-xs font-bold uppercase tracking-wider border-r border-gray-300 dark:border-[#2d2d3b] ${
                        h === 'Easy' || h === 'Medium' || h === 'Hard'
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-[#1e1e2d] divide-y-2 divide-gray-300 dark:divide-[#2d2d3b]">
                  {alphaDataWithValidation.map((chapter, index) => (
                    <tr
                      key={chapter.chapterCode}
                      className={`transition-colors duration-150 ${
                        !chapter.isRowValid
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-[#252535]'
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap border-r border-gray-200 dark:border-[#2d2d3b]">
                        {chapter.chapterName}
                      </td>
                      {['a', 'b', 'e', 'm', 'h'].map(field => (
                        <td key={field} className={`px-6 py-4 text-center border-r border-gray-200 dark:border-[#2d2d3b] ${
                          field === 'e' || field === 'm' || field === 'h'
                            ? 'bg-blue-50/30 dark:bg-blue-900/10'
                            : ''
                        }`}>
                          <input
                            type="number"
                            min="0"
                            value={chapter[field as keyof ChapterDistribution]}
                            onChange={(e) => updateChapter(index, field as keyof ChapterDistribution, parseInt(e.target.value) || 0)}
                            className="w-20 px-3 py-2 text-center text-base font-bold bg-white dark:bg-[#1e1e2d] border-2 border-gray-400 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[primary] focus:border-primary transition-all shadow-sm hover:border-primary"
                          />
                        </td>
                      ))}
                      <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-[#2d2d3b]">
                        {chapter.a + chapter.b}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 dark:bg-[#121121]">
                  <tr className="border-t-2 border-gray-300 dark:border-[#2d2d3b]">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white border-r border-gray-300 dark:border-[#2d2d3b]">TOTALS</td>
                    <td className={`px-6 py-4 text-center text-base font-bold border-r border-gray-300 dark:border-[#2d2d3b] ${totals.a === 20 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {totals.a} / 20
                    </td>
                    <td className={`px-6 py-4 text-center text-base font-bold border-r border-gray-300 dark:border-[#2d2d3b] ${totals.b === 5 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {totals.b} / 5
                    </td>
                    <td className="px-6 py-4 text-center text-lg font-bold text-blue-900 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-900/10 border-r border-gray-300 dark:border-[#2d2d3b]">{totals.e}</td>
                    <td className="px-6 py-4 text-center text-lg font-bold text-blue-900 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-900/10 border-r border-gray-300 dark:border-[#2d2d3b]">{totals.m}</td>
                    <td className="px-6 py-4 text-center text-lg font-bold text-blue-900 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-900/10 border-r border-gray-300 dark:border-[#2d2d3b]">{totals.h}</td>
                    <td className="px-6 py-4 text-center text-base font-bold text-gray-900 dark:text-white border-r border-gray-300 dark:border-[#2d2d3b]">
                      {totals.a + totals.b} / 25
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Error Messages */}
            {!isValid && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg animate-fade-in">
                <p className="font-bold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined">error</span>
                  Please correct the errors:
                </p>
                <ul className="list-disc list-inside ml-6 space-y-1 text-sm text-red-700 dark:text-red-300">
                  {totals.a !== 20 && <li>Total Division 1 (A) questions must be 20.</li>}
                  {totals.b !== 5 && <li>Total Division 2 (B) questions must be 5.</li>}
                  {hasRowErrors && <li>For each chapter, the sum of difficulties (E+M+H) must equal the total questions (A+B). Invalid rows are highlighted.</li>}
                </ul>
              </div>
            )}
          </div>

          {/* Beta Constraints */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Beta Constraints
            </h3>
            <div className="p-6 bg-gray-100 dark:bg-[#252535] border border-gray-200 dark:border-[#2d2d3b] rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 italic text-center">
                Beta constraints are reserved for future implementation.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-[#2d2d3b] flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid}
              className={`px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all duration-200 ${
                isValid
                  ? 'bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>Continue to Question Selection</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionConfiguration;
