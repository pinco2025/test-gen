import React, { useState, useEffect } from 'react';
import { Test, SectionConfig } from '../types';

interface ExportTestModalProps {
  test: Test;
  sections: SectionConfig[];
  onClose: () => void;
  onExport: (exportConfig: ExportConfig) => Promise<void>;
}

export interface ExportConfig {
  duration: number; // in seconds
  exam: 'JEE' | 'NEET';
  type: 'part' | 'full' | 'chapter' | 'topic';
  tier: 'free' | '1' | '2' | 'admin';
  totalQuestions: number;
  markingScheme: string;
  instructions: string[];
  title: string;
  description: string;
}

const ExportTestModal: React.FC<ExportTestModalProps> = ({
  test,
  sections,
  onClose,
  onExport
}) => {
  // Calculate total questions from sections
  const totalQuestions = sections.reduce(
    (sum, section) => sum + section.selectedQuestions.length,
    0
  );

  const [config, setConfig] = useState<ExportConfig>({
    duration: 10800, // 3 hours default
    exam: 'JEE',
    type: 'full',
    tier: 'free',
    totalQuestions,
    markingScheme: '+4/-1',
    instructions: ['Read all questions carefully before answering.'],
    title: test.metadata.description || '',
    description: test.metadata.description || ''
  });

  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update total questions when sections change
  useEffect(() => {
    setConfig(prev => ({ ...prev, totalQuestions }));
  }, [totalQuestions]);

  const handleInputChange = (field: keyof ExportConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...config.instructions];
    newInstructions[index] = value;
    setConfig(prev => ({ ...prev, instructions: newInstructions }));
  };

  const addInstruction = () => {
    setConfig(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  };

  const removeInstruction = (index: number) => {
    if (config.instructions.length === 1) return;
    const newInstructions = config.instructions.filter((_, i) => i !== index);
    setConfig(prev => ({ ...prev, instructions: newInstructions }));
  };

  const handleExport = async () => {
    // Validation
    if (config.duration <= 0) {
      setError('Duration must be greater than 0 seconds');
      return;
    }
    if (!config.title.trim()) {
      setError('Title is required');
      return;
    }
    if (config.instructions.some(i => !i.trim())) {
      setError('All instructions must have content');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      await onExport(config);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const examTypes = ['JEE', 'NEET'] as const;
  const testTypes = ['part', 'full', 'chapter', 'topic'] as const;
  const tierTypes = ['free', '1', '2', 'admin'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-2xl animate-scale-in">
        {/* Header */}
        <header className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined">upload_file</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main dark:text-white">Export Test</h3>
              <p className="text-sm text-text-secondary dark:text-gray-400">Configure export settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">close</span>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title & Description */}
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label>Title</label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter test title"
              />
            </div>
            <div className="input-group">
              <label>Description</label>
              <input
                type="text"
                value={config.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter description"
              />
            </div>
          </div>

          {/* Duration & Exam Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label>Duration (seconds)</label>
              <input
                type="number"
                value={config.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                min={1}
                placeholder="e.g., 10800 for 3 hours"
              />
              <span className="text-xs text-text-secondary dark:text-gray-400">
                {Math.floor(config.duration / 3600)}h {Math.floor((config.duration % 3600) / 60)}m
              </span>
            </div>
            <div className="input-group">
              <label>Exam Type</label>
              <div className="flex gap-2">
                {examTypes.map((exam) => (
                  <button
                    key={exam}
                    onClick={() => handleInputChange('exam', exam)}
                    className={`flex-1 px-4 py-2 rounded-lg border font-semibold transition-all ${
                      config.exam === exam
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark text-text-main dark:text-white hover:border-primary'
                    }`}
                  >
                    {exam}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test Type & Tier */}
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label>Test Type</label>
              <div className="grid grid-cols-2 gap-2">
                {testTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleInputChange('type', type)}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-all ${
                      config.type === type
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark text-text-main dark:text-white hover:border-primary'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="input-group">
              <label>Tier</label>
              <div className="grid grid-cols-4 gap-2">
                {tierTypes.map((tier) => (
                  <button
                    key={tier}
                    onClick={() => handleInputChange('tier', tier)}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-all ${
                      config.tier === tier
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark text-text-main dark:text-white hover:border-primary'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Auto-filled fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="flex items-center gap-2">
                Total Questions
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Auto</span>
              </label>
              <input
                type="number"
                value={config.totalQuestions}
                readOnly
                className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
              />
            </div>
            <div className="input-group">
              <label className="flex items-center gap-2">
                Marking Scheme
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Auto</span>
              </label>
              <input
                type="text"
                value={config.markingScheme}
                readOnly
                className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="input-group">
            <div className="flex items-center justify-between">
              <label>Instructions</label>
              <button
                onClick={addInstruction}
                className="flex items-center gap-1 px-2 py-1 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Add
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {config.instructions.map((instruction, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-secondary dark:text-gray-400 w-6">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={instruction}
                    onChange={(e) => handleInstructionChange(index, e.target.value)}
                    placeholder="Enter instruction"
                    className="flex-1"
                  />
                  <button
                    onClick={() => removeInstruction(index)}
                    disabled={config.instructions.length === 1}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          {/* Export Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-500">info</span>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">Export will:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                  <li>Download test and solution JSON files to your computer</li>
                  <li>Upload both files to GitHub repository</li>
                  <li>Save test metadata to database</li>
                </ul>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-3 p-5 border-t border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50 shrink-0">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-5 py-2.5 rounded-lg border border-border-light dark:border-border-dark text-text-main dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Exporting...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">cloud_upload</span>
                Export Test
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ExportTestModal;
