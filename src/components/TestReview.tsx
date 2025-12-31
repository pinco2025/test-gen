import React, { useState, useEffect, useMemo } from 'react';
import { SectionConfig, Question, SelectedQuestion, Chapter } from '../types';
import { sortQuestionsForSection } from '../utils/sorting';
import QuestionDisplay from './QuestionDisplay';
import IPQComparisonModal from './IPQComparisonModal';
import SwitchQuestionModal from './SwitchQuestionModal';
import QuestionSelection from './QuestionSelection';

interface TestReviewProps {
  sections: SectionConfig[];
  onStartEditing: (question: Question) => void;
  onBack: () => void;
  onExport: () => void;
  onRemoveQuestion: (questionUuid: string) => void;
  onUpdateQuestionStatus: (questionUuid: string, status: 'accepted' | 'review' | 'pending') => void; // Keeping for compatibility, but we might rely on DB updates
  onVerifyQuestion?: (questionUuid: string, status: 'approved' | 'rejected' | 'pending') => void; // New prop for verification
  onReplaceQuestion: (oldUuid: string, newQuestion: Question) => void;
  initialQuestionUuid?: string | null;
  onNavigationComplete?: () => void;
  onSwitchQuestion?: (questionUuid: string) => void;
}

const TestReview: React.FC<TestReviewProps> = ({
  sections,
  onStartEditing,
  onBack,
  onExport,
  // onRemoveQuestion is unused but kept in interface for potential future use or compatibility
  onUpdateQuestionStatus,
  onVerifyQuestion,
  onReplaceQuestion,
  initialQuestionUuid,
  onNavigationComplete,
  onSwitchQuestion
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [freshQuestionsMap, setFreshQuestionsMap] = useState<Record<string, Question>>({});
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isChapterSelectionOpen, setIsChapterSelectionOpen] = useState(false);
  const [showSolutionsDefault, setShowSolutionsDefault] = useState(false);

  // Checklist for acceptance
  const [checklist, setChecklist] = useState({
    questionContent: false,
    optionContent: false,
    questionFormatting: false,
    optionFormatting: false,
    figureFormatting: false,
    solutionExistence: false,
    solutionFormatting: false
  });

  // Fetch fresh data on mount or when sections change
  useEffect(() => {
    const fetchFreshData = async () => {
      if (!window.electronAPI) return;
      const allUuids = sections.flatMap(s => s.selectedQuestions.map(sq => sq.question.uuid));
      if (allUuids.length === 0) return;
      try {
        const freshQuestions = await window.electronAPI.questions.getByUUIDs(allUuids);
        const solutionsMap = await window.electronAPI.questions.getSolutionsByUUIDs(allUuids);

        const map: Record<string, Question> = {};
        freshQuestions.forEach(q => {
            const solution = solutionsMap[q.uuid];
            // @ts-ignore - attaching solution to question object for display purposes
            map[q.uuid] = solution ? { ...q, solution } : q;
        });
        setFreshQuestionsMap(map);
      } catch (error) {
        console.error('Failed to fetch fresh question data:', error);
      }
    };
    fetchFreshData();
  }, [sections]);

  // Flatten and sort questions
  const allQuestions = useMemo(() => {
    const flat: Array<{ sq: SelectedQuestion; sectionIndex: number; absoluteIndex: number }> = [];
    let count = 0;
    sections.forEach((section, sIdx) => {
      const sortedQuestions = sortQuestionsForSection(section.selectedQuestions);
      sortedQuestions.forEach((sq) => {
        count++;
        // Use fresh question data if available
        const freshQuestion = freshQuestionsMap[sq.question.uuid] || sq.question;
        flat.push({ sq: { ...sq, question: freshQuestion }, sectionIndex: sIdx, absoluteIndex: count });
      });
    });
    return flat;
  }, [sections, freshQuestionsMap]);

  // Sync current index if out of bounds
  useEffect(() => {
    if (currentQuestionIndex >= allQuestions.length && allQuestions.length > 0) {
      setCurrentQuestionIndex(Math.max(0, allQuestions.length - 1));
    }
  }, [allQuestions.length, currentQuestionIndex]);

  // Jump to initial question if provided
  useEffect(() => {
    if (initialQuestionUuid && allQuestions.length > 0) {
      const index = allQuestions.findIndex(q => q.sq.question.uuid === initialQuestionUuid);
      if (index !== -1) {
        setCurrentQuestionIndex(index);
        onNavigationComplete?.();
      }
    }
  }, [initialQuestionUuid, allQuestions, onNavigationComplete]);

  const currentItem = allQuestions[currentQuestionIndex];
  const currentQuestion = currentItem?.sq.question;

  const handleNext = () => setCurrentQuestionIndex(prev => Math.min(prev + 1, allQuestions.length - 1));
  const handlePrev = () => setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
  const handleJumpToQuestion = (index: number) => setCurrentQuestionIndex(index);

  // Status Handlers
  const handleAcceptClick = () => {
    setChecklist({
      questionContent: false, optionContent: false, questionFormatting: false,
      optionFormatting: false, figureFormatting: false, solutionExistence: false,
      solutionFormatting: false
    });
    setIsAcceptModalOpen(true);
  };

  const confirmAccept = () => {
    if (!currentQuestion) return;
    // Map to Verification Level 1
    if (onVerifyQuestion) {
        onVerifyQuestion(currentQuestion.uuid, 'approved');
        // Update local fresh map immediately for UI responsiveness
        setFreshQuestionsMap(prev => ({
            ...prev,
            [currentQuestion.uuid]: { ...currentQuestion, verification_level_1: 'approved' }
        }));
    }
    onUpdateQuestionStatus(currentQuestion.uuid, 'accepted'); // Keep legacy status for export check
    setIsAcceptModalOpen(false);
    handleNext();
  };

  const handleReject = () => {
    if (!currentQuestion) return;
    if (onVerifyQuestion) {
        onVerifyQuestion(currentQuestion.uuid, 'rejected');
        setFreshQuestionsMap(prev => ({
            ...prev,
            [currentQuestion.uuid]: { ...currentQuestion, verification_level_1: 'rejected' }
        }));
    }
    // Also remove from test? User said "display on palette", so maybe keep it?
    // "if any question is already verified/rejected then it should be displayed on the palette"
    // So we DON'T remove it automatically anymore via onRemoveQuestion, unless user explicitly wants to remove.
    // However, usually Reject in review means "get this out". But let's stick to the prompt:
    // "map accept/reject button correspond to the verification level 1 now"
  };

  const handleEditClick = () => {
    if (currentQuestion) onStartEditing(currentQuestion);
  };

  const handleEditOriginal = (originalQuestion: Question) => {
      onStartEditing(originalQuestion);
  };

  const handleCloneAndEdit = async () => {
    if (!currentQuestion) return;
    setIsSwitchModalOpen(false);

    if (!window.electronAPI) return;

    try {
        const clonedQuestion = await window.electronAPI.questions.clone(currentQuestion.uuid);
        if (clonedQuestion) {
            // Replace in list
            onReplaceQuestion(currentQuestion.uuid, clonedQuestion);
            // Wait a tick for updates then edit
            setTimeout(() => {
                onStartEditing(clonedQuestion);
            }, 100);
        } else {
            alert('Failed to clone question.');
        }
    } catch (error) {
        console.error('Clone failed:', error);
        alert('An error occurred while cloning.');
    }
  };

  const handleSelectFromChapter = () => {
      setIsSwitchModalOpen(false);
      setIsChapterSelectionOpen(true);
  };

  const handleChapterSelectionReplace = (newQuestion: Question) => {
      if (!currentQuestion) return;
      if (confirm(`Replace current question with selected question (UUID: ${newQuestion.uuid.substring(0,8)}...)?`)) {
          onReplaceQuestion(currentQuestion.uuid, newQuestion);
          setIsChapterSelectionOpen(false);
      }
  };

  const getOriginalQuestionUuid = (q: Question | undefined): string | null => {
      if (!q || !q.links) return null;
      try {
          const links = JSON.parse(q.links);
          // If it's an IPQ switch, it should have a link to the original
          if (Array.isArray(links) && links.length > 0) {
              return links[0];
          }
      } catch (e) {
          return null;
      }
      return null;
  };

  const originalUuid = getOriginalQuestionUuid(currentQuestion);

  // Determine exportability (legacy status check)
  const canExport = useMemo(() => {
    if (allQuestions.length === 0) return false;
    // We can rely on verification_level_1 OR the local 'accepted' status.
    // The previous code used 'status' field in SelectedQuestion.
    return allQuestions.every(item => item.sq.question.verification_level_1 === 'approved');
  }, [allQuestions]);

  // UI Helper for Palette Colors
  const getPaletteClass = (q: Question, isActive: boolean) => {
      let base = 'bg-gray-100 dark:bg-white/5 text-text-secondary';
      if (q.verification_level_1 === 'approved') base = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      if (q.verification_level_1 === 'rejected') base = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';

      if (isActive) {
          return `${base} ring-2 ring-primary ring-offset-1 dark:ring-offset-[#1e1e2d] border-primary`;
      }
      return `${base} hover:bg-gray-200 dark:hover:bg-white/10 border border-transparent`;
  };

  const getCurrentSectionName = (): string => {
      const sectionIndex = currentItem?.sectionIndex;
      if (sectionIndex !== undefined && sections[sectionIndex]) {
          return sections[sectionIndex].name;
      }
      return 'Physics'; // Default fallback
  };

  const getCurrentChapters = (): Chapter[] => {
      const sectionIndex = currentItem?.sectionIndex;
      if (sectionIndex !== undefined && sections[sectionIndex]) {
          return sections[sectionIndex].chapters;
      }
      return [];
  };

  // If in chapter selection mode, overlay the QuestionSelection component
  if (isChapterSelectionOpen && currentQuestion) {
      return (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121121] flex flex-col animate-in slide-in-from-right duration-300">
             <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2d2d3b]">
                 <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                     <span className="material-symbols-outlined">library_books</span>
                     Select Replacement for Q.{currentItem.absoluteIndex}
                 </h2>
                 <button
                    onClick={() => setIsChapterSelectionOpen(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-[#252535] text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-[#2d2d3b] transition-colors"
                 >
                     Cancel
                 </button>
             </div>
             <div className="flex-1 overflow-hidden relative">
                 <QuestionSelection
                    sectionName={getCurrentSectionName() as any}
                    chapters={getCurrentChapters()}
                    alphaConstraint={{ chapters: [] }} // Dummy constraint
                    betaConstraint={{}}
                    onComplete={() => {}} // Not used in this mode
                    onBack={() => setIsChapterSelectionOpen(false)} // Should not be hit typically due to overlay
                    onStartEditing={() => {}} // Disabled
                    onClone={() => {}} // Disabled
                    lockedChapterCode={currentQuestion.tag_2 || undefined}
                    limitCount={1}
                    selectionMode="single-replace"
                    onSelectReplacement={handleChapterSelectionReplace}
                 />
             </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-[#121121] overflow-hidden">

      {/* Top Header - Compact */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-gray-200 dark:border-[#2d2d3b] bg-white dark:bg-[#1e1e2d]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#252535] text-text-secondary transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h2 className="text-base font-bold text-text-main dark:text-white">Test Review</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-[#252535] text-text-secondary">
             {allQuestions.length} Questions
          </span>
        </div>
        <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary cursor-pointer hover:text-text-main transition-colors">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${showSolutionsDefault ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`bg-white size-4 rounded-full shadow-md transform transition-transform ${showSolutionsDefault ? 'translate-x-4' : ''}`} />
                </div>
                <input
                    type="checkbox"
                    className="hidden"
                    checked={showSolutionsDefault}
                    onChange={(e) => setShowSolutionsDefault(e.target.checked)}
                />
                Show Solutions
            </label>
            <button
                onClick={onExport}
                disabled={!canExport}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    canExport
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90'
                    : 'bg-gray-200 dark:bg-[#252535] text-gray-400 cursor-not-allowed'
                }`}
            >
                <span className="material-symbols-outlined text-lg">ios_share</span>
                Export Test
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">

        {/* Palette Sidebar - Fixed Left */}
        <aside className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-[#2d2d3b] bg-white dark:bg-[#1e1e2d]">
            <div className="p-4 border-b border-gray-200 dark:border-[#2d2d3b]">
                <h3 className="font-bold text-sm text-text-main dark:text-white uppercase tracking-wider">Question Palette</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                {sections.map((section, idx) => {
                    const sectionQuestions = allQuestions.filter(q => q.sectionIndex === idx);
                    if (sectionQuestions.length === 0) return null;
                    return (
                        <div key={idx} className="mb-6 last:mb-0">
                            <h4 className="text-xs font-semibold text-text-secondary mb-3 uppercase">{section.name}</h4>
                            <div className="grid grid-cols-5 gap-2">
                                {sectionQuestions.map((item) => {
                                    const isActive = currentQuestionIndex === allQuestions.findIndex(q => q.sq.question.uuid === item.sq.question.uuid);
                                    return (
                                        <button
                                            key={item.sq.question.uuid}
                                            onClick={() => handleJumpToQuestion(allQuestions.findIndex(q => q.sq.question.uuid === item.sq.question.uuid))}
                                            className={`aspect-square rounded-md flex items-center justify-center text-xs font-bold transition-all ${getPaletteClass(item.sq.question, isActive)}`}
                                        >
                                            {item.absoluteIndex}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>

        {/* Center - Question Display */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-gray-50 dark:bg-[#121121]">
            {allQuestions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-text-secondary">
                    <span className="material-symbols-outlined text-4xl mb-2">content_paste_off</span>
                    <p>No questions selected.</p>
                </div>
            ) : currentQuestion ? (
                <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12">
                     <div className="max-w-4xl mx-auto flex flex-col gap-6">
                        {/* Status Banner */}
                        {currentQuestion.verification_level_1 === 'approved' && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                                Verified & Approved
                            </div>
                        )}
                        {currentQuestion.verification_level_1 === 'rejected' && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium">
                                <span className="material-symbols-outlined text-lg">cancel</span>
                                Rejected
                            </div>
                        )}

                        <div className="bg-white dark:bg-[#1e1e2d] rounded-2xl shadow-sm border border-gray-200 dark:border-[#2d2d3b] overflow-hidden">
                             <QuestionDisplay
                                question={currentQuestion}
                                questionNumber={currentItem.absoluteIndex}
                                showAnswer={true}
                                defaultSolutionExpanded={showSolutionsDefault}
                                showSolutionToggle={true}
                                key={`${currentQuestion.uuid}-${showSolutionsDefault}`} // Re-mount when default changes to force update state
                             />
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleEditClick}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-primary hover:bg-primary/10 transition-colors font-medium text-sm"
                            >
                                <span className="material-symbols-outlined text-lg">edit_note</span>
                                Edit Question Content
                            </button>
                        </div>
                     </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">Loading...</div>
            )}
        </main>
      </div>

      {/* Footer Nav Bar - Compact & Modern */}
      <footer className="flex-shrink-0 h-16 flex items-center justify-between px-6 border-t border-gray-200 dark:border-[#2d2d3b] bg-white dark:bg-[#1e1e2d] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-none z-10">

            {/* Left: Navigation */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handlePrev}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2d2d3b] hover:bg-gray-50 dark:hover:bg-[#252535] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold text-text-main dark:text-white"
                >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Prev
                </button>
                <button
                    onClick={handleNext}
                    disabled={currentQuestionIndex === allQuestions.length - 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2d2d3b] hover:bg-gray-50 dark:hover:bg-[#252535] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold text-text-main dark:text-white"
                >
                    Next
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
            </div>

            {/* Center: Actions */}
            <div className="flex items-center gap-3">
                 {originalUuid && (
                     <button
                        onClick={() => setIsComparisonModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 font-bold text-sm transition-all border border-purple-200 dark:border-purple-800/30"
                    >
                        <span className="material-symbols-outlined text-lg">compare_arrows</span>
                        Compare Original
                    </button>
                 )}

                 <button
                    onClick={handleReject}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all ${
                        currentQuestion?.verification_level_1 === 'rejected'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20'
                    }`}
                >
                    <span className="material-symbols-outlined text-lg">thumb_down</span>
                    Reject
                </button>

                <button
                    onClick={() => setIsSwitchModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 font-bold text-sm transition-all"
                >
                    <span className="material-symbols-outlined text-lg">swap_calls</span>
                    Switch Question
                </button>

                <button
                    onClick={handleAcceptClick}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all ${
                        currentQuestion?.verification_level_1 === 'approved'
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20'
                    }`}
                >
                    <span className="material-symbols-outlined text-lg">thumb_up</span>
                    Accept
                </button>
            </div>

            {/* Right: Info (Spacer) */}
            <div className="w-[140px] flex justify-end">
                {/* Could add hotkey hints here */}
            </div>
      </footer>

      {/* Acceptance Modal */}
      {isAcceptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-white dark:bg-[#1e1e2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2d2d3b] flex flex-col overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200">
                  <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2d2d3b] bg-gray-50 dark:bg-[#252535]">
                      <h3 className="text-lg font-bold text-text-main dark:text-white">Verify Question</h3>
                      <button onClick={() => setIsAcceptModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </header>
                  <div className="p-6 space-y-5">
                      <div className="space-y-3">
                          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-[#2d2d3b] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                              <input type="checkbox" className="size-5 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-[#121121]"
                                  checked={Object.values(checklist).every(Boolean)}
                                  onChange={(e) => {
                                      const checked = e.target.checked;
                                      setChecklist({
                                          questionContent: checked, optionContent: checked, questionFormatting: checked,
                                          optionFormatting: checked, figureFormatting: checked, solutionExistence: checked,
                                          solutionFormatting: checked
                                      });
                                  }}
                              />
                              <span className="font-semibold text-text-main dark:text-white">Select All Checks</span>
                          </label>

                          <div className="grid grid-cols-1 gap-2 pl-2">
                            {Object.entries({
                                questionContent: 'Question Content', optionContent: 'Option Content',
                                questionFormatting: 'Formatting', figureFormatting: 'Figures/Images',
                                solutionExistence: 'Solution Exists', solutionFormatting: 'Solution Quality'
                            }).map(([key, label]) => (
                                <label key={key} className="flex items-center gap-3 cursor-pointer text-sm text-text-secondary hover:text-text-main dark:hover:text-gray-200">
                                    <input type="checkbox" className="size-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 bg-transparent"
                                        checked={checklist[key as keyof typeof checklist]}
                                        onChange={(e) => setChecklist(prev => ({ ...prev, [key]: e.target.checked }))}
                                    />
                                    <span>{label}</span>
                                </label>
                            ))}
                          </div>
                      </div>
                  </div>
                  <footer className="flex justify-end gap-3 p-4 bg-gray-50 dark:bg-[#252535] border-t border-gray-200 dark:border-[#2d2d3b]">
                      <button onClick={() => setIsAcceptModalOpen(false)} className="px-4 py-2 rounded-lg font-medium text-text-secondary hover:bg-gray-200 dark:hover:bg-white/5 transition-all">Cancel</button>
                      <button
                          onClick={confirmAccept}
                          disabled={!Object.values(checklist).every(Boolean)}
                          className="px-6 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/20 transition-all flex items-center gap-2"
                      >
                          <span className="material-symbols-outlined">check_circle</span>
                          Approve
                      </button>
                  </footer>
              </div>
          </div>
      )}

      {/* Comparison Modal */}
      {isComparisonModalOpen && currentQuestion && originalUuid && (
        <IPQComparisonModal
            currentQuestion={currentQuestion}
            originalQuestionUuid={originalUuid}
            onClose={() => setIsComparisonModalOpen(false)}
            onEditCurrent={() => {
                setIsComparisonModalOpen(false);
                handleEditClick();
            }}
            onEditOriginal={handleEditOriginal}
        />
      )}

      {/* Switch Question Modal */}
      {isSwitchModalOpen && currentQuestion && (
          <SwitchQuestionModal
            question={currentQuestion}
            onClose={() => setIsSwitchModalOpen(false)}
            onSwitchWithIPQ={() => {
                setIsSwitchModalOpen(false);
                if (currentQuestion && onSwitchQuestion) {
                    onSwitchQuestion(currentQuestion.uuid);
                }
            }}
            onCloneAndEdit={handleCloneAndEdit}
            onSelectFromChapter={handleSelectFromChapter}
          />
      )}
    </div>
  );
};

export default TestReview;
