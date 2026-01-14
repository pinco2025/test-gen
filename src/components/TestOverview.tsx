import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SectionConfig, TestMetadata } from '../types';
import { PresetSelector } from './PresetSelector';
import { PresetEditor } from './PresetEditor';

interface TestOverviewProps {
  testMetadata: TestMetadata;
  sections: SectionConfig[];
  onSelectChapter: (sectionIndex: number, chapterCode: string) => void;
  onReview: () => void;
  onBack: () => void;
  // Controlled state for active section view
  activeSectionIndex?: number | null;
  onSectionIndexChange?: (index: number | null) => void;
  // Auto-selection support
  onAutoSelect?: (presetId: string) => void;
  // Clear test support
  onClearTest?: () => Promise<void>;
}

const TestOverview: React.FC<TestOverviewProps> = ({
  testMetadata,
  sections,
  onSelectChapter,
  onReview,
  onBack,
  activeSectionIndex: controlledActiveSectionIndex,
  onSectionIndexChange,
  onAutoSelect,
  onClearTest
}) => {
  // Use controlled state if provided, otherwise local state
  const [localActiveSectionIndex, setLocalActiveSectionIndex] = useState<number | null>(null);
  const [showPresetEditor, setShowPresetEditor] = useState(false);

  const isControlled = controlledActiveSectionIndex !== undefined;
  const activeSectionIndex = isControlled ? controlledActiveSectionIndex : localActiveSectionIndex;

  const setActiveSectionIndex = (index: number | null) => {
    if (isControlled && onSectionIndexChange) {
      onSectionIndexChange(index);
    } else {
      setLocalActiveSectionIndex(index);
    }
  };

  // Auto-selection state
  const [presets, setPresets] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadPresets = useCallback(async () => {
    if (window.electronAPI) {
      try {
        const presetList = await window.electronAPI.presets.list();
        setPresets(presetList);
        // Only select default if none selected or current selection is invalid
        if (presetList.length > 0 && (!selectedPresetId || !presetList.find(p => p.id === selectedPresetId))) {
          setSelectedPresetId(presetList[0].id);
        }
      } catch (error) {
        console.error("Failed to load presets:", error);
      }
    }
  }, [selectedPresetId]);

  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const handleAutoSelect = async () => {
    if (onAutoSelect && selectedPresetId) {
      setIsAutoSelecting(true);
      try {
        await onAutoSelect(selectedPresetId);
      } finally {
        setIsAutoSelecting(false);
      }
    }
  };

  const handleClearTest = async () => {
    if (onClearTest) {
      setIsClearing(true);
      try {
        await onClearTest();
      } finally {
        setIsClearing(false);
      }
    }
  };


  // Calculate overall stats
  const stats = useMemo(() => {
    let totalSelected = 0;
    let totalRequired = 0;

    const sectionStats = sections.map(section => {
      const required = section.betaConstraint?.maxQuestions || 25; // Default if missing
      const selected = section.selectedQuestions.length;
      totalSelected += selected;
      totalRequired += required;
      return {
        name: section.name,
        selected,
        required,
        progress: required > 0 ? Math.min(100, (selected / required) * 100) : (selected > 0 ? 100 : 0)
      };
    });

    return {
      totalSelected,
      totalRequired,
      progress: totalRequired > 0 ? (totalSelected / totalRequired) * 100 : (totalSelected > 0 ? 100 : 0),
      sections: sectionStats
    };
  }, [sections]);



  // View: Chapter List for a Section
  if (activeSectionIndex !== null && activeSectionIndex !== undefined) {
    const section = sections[activeSectionIndex];
    if (!section) return <div>Error: Invalid section index</div>;

    const weightage = section.betaConstraint?.weightage || {};

    // Calculate chapter stats
    const chapterStats = Object.entries(weightage).map(([code, requiredCount]) => {
      // Find chapter details
      const chapterDetails = section.chapters.find(c => c.code === code);
      const name = chapterDetails?.name || code;

      // Count selected for this chapter
      const selectedCount = section.selectedQuestions.filter(sq => sq.chapterCode === code).length;

      return {
        code,
        name,
        required: requiredCount as number,
        selected: selectedCount,
        progress: (requiredCount as number) > 0 ? (selectedCount / (requiredCount as number)) * 100 : (selectedCount > 0 ? 100 : 0),
        isComplete: selectedCount === (requiredCount as number)
      };
    }).sort((a, b) => {
      // Sort by completion status (incomplete first), then by code
      if (a.isComplete === b.isComplete) return a.code.localeCompare(b.code);
      return a.isComplete ? 1 : -1;
    });

    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-[#121121] text-gray-900 dark:text-white">
        <header className="bg-white dark:bg-[#1e1e2d] border-b border-gray-200 dark:border-[#2d2d3b] px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveSectionIndex(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#252535] rounded-lg transition-colors group"
            >
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <span className={`size-3 rounded-full ${section.selectedQuestions.length === (section.betaConstraint?.maxQuestions || 25) ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                {section.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a chapter to add questions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-gray-100 dark:bg-[#252535] px-4 py-2 rounded-lg">
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Progress</div>
              <div className="text-lg font-bold text-primary">
                {section.selectedQuestions.length} <span className="text-sm text-gray-400">/ {section.betaConstraint?.maxQuestions || 25}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chapterStats.map((stat) => (
              <button
                key={stat.code}
                onClick={() => onSelectChapter(activeSectionIndex, stat.code)}
                className="relative group bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-xl p-4 text-left hover:shadow-md transition-all overflow-hidden"
              >
                {/* Progress Background */}
                <div
                  className="absolute bottom-0 left-0 h-1 bg-green-500/50 transition-all duration-500"
                  style={{ width: `${stat.progress}%` }}
                />
                {stat.isComplete && (
                  <div className="absolute inset-0 bg-green-50/50 dark:bg-green-900/10 pointer-events-none" />
                )}

                <div className="flex justify-between items-start mb-2 relative z-10">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {stat.code}
                  </span>
                  {stat.isComplete ? (
                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400 group-hover:text-primary transition-colors">
                      {stat.selected} / {stat.required}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 relative z-10 truncate" title={stat.name}>
                  {stat.name}
                </h3>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // View: Section Overview
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#121121] text-gray-900 dark:text-white">
      <header className="bg-white dark:bg-[#1e1e2d] border-b border-gray-200 dark:border-[#2d2d3b] px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#252535] rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold">{testMetadata.code}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {testMetadata.description || `${testMetadata.testType} Test Configuration`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-Select Section */}
          {presets.length > 0 && onAutoSelect && stats.totalSelected === 0 && (
            <div className="flex items-center gap-4">
              <PresetSelector
                presets={presets}
                selectedPresetId={selectedPresetId}
                onSelect={setSelectedPresetId}
                onApply={handleAutoSelect}
                isValid={true}
                isLoading={isAutoSelecting}
                onManage={() => setShowPresetEditor(true)}
                compact={true}
              />
            </div>
          )}

          {/* Manage Presets Button - Show independently if selector is hidden (e.g. after selection started but not finished? or maybe just hide it)
              Actually, if questions are selected, we hide the auto-select. 
              But we might still want to show Manage Presets button? 
              The original code hid the Manage Presets button if totalSelected > 0.
              So we only need to care about the case where stats.totalSelected === 0.
              In that case, the PresetSelector includes the Manage button now.
          */}

          {/* Clear Test Button - shows when questions are selected */}
          {stats.totalSelected > 0 && onClearTest && (
            <button
              onClick={handleClearTest}
              disabled={isClearing}
              className={`px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md ${isClearing
                ? 'bg-red-400 text-white cursor-wait'
                : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
                }`}
            >
              {isClearing ? (
                <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-xl">restart_alt</span>
              )}
              Clear Test
            </button>
          )}

          <button
            onClick={onReview}
            disabled={stats.totalSelected < stats.totalRequired && stats.sections.some(s => s.selected > 0)} // Allow if 0 selected (manual) or fully complete
            className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 ${stats.totalSelected >= stats.totalRequired
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              }`}
          >
            Final Review
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </header>

      {/* Preset Editor Modal */}
      <PresetEditor
        isOpen={showPresetEditor}
        onClose={() => setShowPresetEditor(false)}
        onRefreshPresets={loadPresets}
      />


      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Overall Progress */}
          <div className="mb-8 bg-white dark:bg-[#1e1e2d] rounded-2xl p-6 border border-gray-200 dark:border-[#2d2d3b] shadow-sm">
            <div className="flex justify-between items-end mb-2">
              <h2 className="text-lg font-bold">Total Progress</h2>
              <span className="text-2xl font-bold text-primary">
                {Math.round(stats.progress)}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000 ease-out"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
            <div className="mt-2 text-right text-sm text-gray-500">
              {stats.totalSelected} of {stats.totalRequired} questions selected
            </div>
          </div>

          {/* Sections List */}
          <div className="grid gap-6">
            {stats.sections.map((section, idx) => (
              <button
                key={section.name}
                onClick={() => setActiveSectionIndex(idx)}
                className="group relative w-full text-left bg-white dark:bg-[#1e1e2d] rounded-2xl border border-gray-200 dark:border-[#2d2d3b] p-0 overflow-hidden hover:shadow-lg transition-all hover:border-primary/50"
              >
                {/* Background Fill for Progress */}
                <div
                  className="absolute inset-y-0 left-0 bg-green-50 dark:bg-green-900/10 transition-all duration-700 ease-out"
                  style={{ width: `${section.progress}%` }}
                />

                <div className="relative p-6 flex justify-between items-center z-10">
                  <div className="flex items-center gap-4">
                    <div className={`size-12 rounded-full flex items-center justify-center ${section.progress === 100
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                      <span className="material-symbols-outlined text-2xl">
                        {section.name === 'Physics' ? 'science' : section.name === 'Chemistry' ? 'biotech' : 'calculate'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                        {section.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {section.selected} / {section.required} Questions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {section.progress === 100 ? (
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full uppercase tracking-wide">
                        Completed
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all">
                        arrow_forward_ios
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestOverview;
