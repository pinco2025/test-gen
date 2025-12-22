import React, { useState, useRef } from 'react';
import { SectionName } from '../types';

interface FullTestCreationProps {
  onCancel: () => void;
  onProceed: (data: FullTestJson) => void;
}

// JSON Structure Definitions
export interface SectionWeightage {
  [chapterCode: string]: number;
}

export interface SectionDefinition {
  name: SectionName;
  type: "Div 1" | "Div 2"; // "Div 1" = 20 questions, "Div 2" = 5 questions (from previous context, usually)
  maxQuestions: number;
  weightage: SectionWeightage;
}

export interface JsonTestDefinition {
  testCode: string;
  description: string;
  sections: SectionDefinition[];
}

export interface FullTestJson {
  tests: JsonTestDefinition[];
}

const FullTestCreation: React.FC<FullTestCreationProps> = ({ onCancel, onProceed }) => {
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<FullTestJson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTestIndex, setActiveTestIndex] = useState<number>(0);

  // Ref to file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setJsonFile(file);
      parseJsonFile(file);
    }
  };

  const parseJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        // Basic validation
        if (!json.tests || !Array.isArray(json.tests)) {
          throw new Error("Invalid JSON format: 'tests' array is missing.");
        }
        setParsedData(json);
        setError(null);
      } catch (err: any) {
        setError("Failed to parse JSON: " + err.message);
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleWeightageChange = (
    testIndex: number,
    sectionIndex: number,
    chapterCode: string,
    newValue: number
  ) => {
    if (!parsedData) return;

    const newData = { ...parsedData };
    newData.tests[testIndex].sections[sectionIndex].weightage[chapterCode] = newValue;
    setParsedData(newData);
  };

  const validateConstraints = (): boolean => {
    if (!parsedData) return false;

    for (const test of parsedData.tests) {
      for (const section of test.sections) {
        const total = Object.values(section.weightage).reduce((a, b) => a + b, 0);
        if (total > section.maxQuestions) {
          return false;
        }
      }
    }
    return true;
  };

  const isValid = validateConstraints();

  const handleProceed = () => {
      if (isValid && parsedData) {
          onProceed(parsedData);
      }
  };

  if (!parsedData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
        <div className="max-w-md w-full bg-white dark:bg-[#1e1e2d] rounded-2xl shadow-xl border border-gray-200 dark:border-[#2d2d3b] p-8 text-center">
          <div className="bg-primary/10 dark:bg-primary/20 rounded-full p-6 mb-6 inline-block">
            <span className="material-symbols-outlined text-5xl text-primary">upload_file</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Upload Test Matrix</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Select a JSON file containing the full test structure and weightage matrix.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-primary text-white py-3 px-6 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mb-4"
          >
            <span className="material-symbols-outlined">folder_open</span>
            Select JSON File
          </button>

          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium text-sm"
          >
            Cancel
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2 text-left">
              <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentTest = parsedData.tests[activeTestIndex];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#121121] overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-[#1e1e2d] border-b border-gray-200 dark:border-[#2d2d3b] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setParsedData(null)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#252535] rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Review Test Matrix</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
               {parsedData.tests.length} test{parsedData.tests.length !== 1 ? 's' : ''} found in {jsonFile?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-[#252535] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleProceed}
            disabled={!isValid}
            className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              isValid
                ? 'bg-primary text-white shadow-lg hover:bg-primary/90'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>Proceed</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Test Tabs */}
      <div className="flex-shrink-0 px-6 pt-6 pb-2 overflow-x-auto">
        <div className="flex gap-2">
            {parsedData.tests.map((test, idx) => (
                <button
                    key={idx}
                    onClick={() => setActiveTestIndex(idx)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                        activeTestIndex === idx
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-white dark:bg-[#1e1e2d] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252535] border border-gray-200 dark:border-[#2d2d3b]'
                    }`}
                >
                    {test.testCode}
                </button>
            ))}
        </div>
      </div>

      {/* Main Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="max-w-6xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{currentTest.testCode}</h2>
                <p className="text-gray-500 dark:text-gray-400">{currentTest.description}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {currentTest.sections.map((section, sIdx) => {
                    const totalQuestions = Object.values(section.weightage).reduce((a, b) => a + b, 0);
                    const isOverLimit = totalQuestions > section.maxQuestions;

                    return (
                        <div key={sIdx} className="bg-white dark:bg-[#1e1e2d] rounded-xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm overflow-hidden flex flex-col h-full">
                            <div className={`px-4 py-3 border-b border-gray-200 dark:border-[#2d2d3b] flex justify-between items-center ${isOverLimit ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{section.name}</h3>
                                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                                        {section.type}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className={`text-lg font-bold ${isOverLimit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                        {totalQuestions} <span className="text-sm font-normal text-gray-500">/ {section.maxQuestions}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">Questions</div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-[400px] p-2">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="text-left py-2 px-3 font-medium">Chapter</th>
                                            <th className="text-right py-2 px-3 font-medium">Count</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {Object.entries(section.weightage).map(([code, count]) => (
                                            <tr key={code} className="hover:bg-gray-50 dark:hover:bg-[#252535]">
                                                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{code}</td>
                                                <td className="py-2 px-3 text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={count}
                                                        onChange={(e) => handleWeightageChange(activeTestIndex, sIdx, code, parseInt(e.target.value) || 0)}
                                                        className="w-16 px-2 py-1 text-right bg-gray-50 dark:bg-[#121121] border border-gray-200 dark:border-gray-700 rounded focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default FullTestCreation;
