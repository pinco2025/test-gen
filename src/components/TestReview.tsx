import React, { useState, useEffect, useMemo } from 'react';
import { SectionConfig, Question, SelectedQuestion } from '../types';
import { sortQuestionsForSection } from '../utils/sorting';
import QuestionDisplay from './QuestionDisplay';

interface TestReviewProps {
  sections: SectionConfig[];
  onStartEditing: (question: Question) => void;
  onBack: () => void;
  onExport: () => void;
  onRemoveQuestion: (questionUuid: string) => void;
  onUpdateQuestionStatus: (questionUuid: string, status: 'accepted' | 'review' | 'pending') => void;
  initialQuestionUuid?: string | null;
  onNavigationComplete?: () => void;
}

const TestReview: React.FC<TestReviewProps> = ({
  sections,
  onStartEditing,
  onBack,
  onExport,
  onRemoveQuestion,
  onUpdateQuestionStatus,
  initialQuestionUuid,
  onNavigationComplete
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [checklist, setChecklist] = useState({
    questionContent: false,
    optionContent: false,
    questionFormatting: false,
    optionFormatting: false,
    figureFormatting: false,
    solutionExistence: false,
    solutionFormatting: false
  });
  const [freshQuestionsMap, setFreshQuestionsMap] = useState<Record<string, Question>>({});

  useEffect(() => {
    const fetchFreshData = async () => {
      if (!window.electronAPI) return;
      const allUuids = sections.flatMap(s => s.selectedQuestions.map(sq => sq.question.uuid));
      if (allUuids.length === 0) return;
      try {
        const freshQuestions = await window.electronAPI.questions.getByUUIDs(allUuids);
        const map: Record<string, Question> = {};
        freshQuestions.forEach(q => { map[q.uuid] = q; });
        setFreshQuestionsMap(map);
      } catch (error) {
        console.error('Failed to fetch fresh question data:', error);
      }
    };
    fetchFreshData();
  }, [sections]);

  const allQuestions = useMemo(() => {
    const flat: Array<{ sq: SelectedQuestion; sectionIndex: number; absoluteIndex: number }> = [];
    let count = 0;
    sections.forEach((section, sIdx) => {
      const sortedQuestions = sortQuestionsForSection(section.selectedQuestions);
      sortedQuestions.forEach((sq) => {
        count++;
        const freshQuestion = freshQuestionsMap[sq.question.uuid] || sq.question;
        flat.push({ sq: { ...sq, question: freshQuestion }, sectionIndex: sIdx, absoluteIndex: count });
      });
    });
    return flat;
  }, [sections, freshQuestionsMap]);

  useEffect(() => {
    if (currentQuestionIndex >= allQuestions.length) {
      setCurrentQuestionIndex(Math.max(0, allQuestions.length - 1));
    }
  }, [allQuestions.length, currentQuestionIndex]);

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
    onUpdateQuestionStatus(currentQuestion.uuid, 'accepted');
    setIsAcceptModalOpen(false);
    handleNext();
  };

  const handleMarkReview = () => {
    if (!currentQuestion) return;
    onUpdateQuestionStatus(currentQuestion.uuid, 'review');
    handleNext();
  };

  const handleReject = () => {
    if (currentQuestion) onRemoveQuestion(currentQuestion.uuid);
  };

  const canExport = useMemo(() => {
    if (allQuestions.length === 0) return false;
    return allQuestions.every(item => item.sq.status === 'accepted');
  }, [allQuestions]);

  const handleEditClick = () => {
    if (currentQuestion) onStartEditing(currentQuestion);
  };

  const statusClasses = {
    pending: 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200',
    review: 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200',
    accepted: 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200',
    current: 'ring-2 ring-primary ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark'
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background-light dark:bg-background-dark text-text-main dark:text-text-dark">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} title="Back to Configuration" className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-xl font-bold">Review Test</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-semibold text-text-secondary dark:text-gray-400">
            {allQuestions.length > 0 ? `${currentQuestionIndex + 1} / ${allQuestions.length}` : '0 / 0'}
          </span>
          <button
            onClick={onExport}
            disabled={!canExport}
            title={!canExport ? "All questions must be accepted to export" : "Export Test"}
            className="px-5 py-2 text-sm font-bold text-white transition-all bg-primary rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/90"
          >
            Export Test
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="grid flex-1 grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* Palette Sidebar */}
        <aside className="flex flex-col col-span-3 overflow-y-auto border rounded-lg bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark">
          <h3 className="p-4 text-lg font-bold border-b border-border-light dark:border-border-dark">Question Palette</h3>
          <div className="p-4 space-y-6">
            {sections.map((section, idx) => {
              const sectionQuestions = allQuestions.filter(q => q.sectionIndex === idx);
              if (sectionQuestions.length === 0) return null;
              return (
                <div key={idx} className="space-y-3">
                  <h4 className="font-semibold">{section.name}</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {sectionQuestions.map((item) => {
                      const status = item.sq.status || 'pending';
                      const isActive = currentQuestionIndex === allQuestions.findIndex(q => q.sq.question.uuid === item.sq.question.uuid);
                      return (
                        <button
                          key={item.sq.question.uuid}
                          onClick={() => handleJumpToQuestion(allQuestions.findIndex(q => q.sq.question.uuid === item.sq.question.uuid))}
                          className={`flex items-center justify-center w-full aspect-square rounded-md text-sm font-bold transition-all ${statusClasses[status]} ${isActive ? statusClasses.current : ''}`}
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

        {/* Main Question Content */}
        <section className="flex flex-col col-span-9 overflow-hidden">
          {allQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary">
              <p className="mb-4 text-lg">No questions in this test.</p>
              <button onClick={onBack} className="px-5 py-2.5 rounded-lg border border-border-light dark:border-border-dark hover:bg-black/5 dark:hover:bg-white/5 text-sm font-semibold transition-all">Back to Selection</button>
            </div>
          ) : currentQuestion ? (
            <div className="flex-1 overflow-y-auto">
              <QuestionDisplay question={currentQuestion} questionNumber={currentItem.absoluteIndex} showAnswer={true} />
              <div className="p-4 text-right">
                <button onClick={handleEditClick} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors rounded-md text-primary hover:bg-primary/10">
                  <span className="material-symbols-outlined text-base">edit</span> Edit Question
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>
          )}
        </section>
      </main>

      {/* Footer Controls */}
      <footer className="flex items-center justify-between p-4 border-t border-border-light dark:border-border-dark shrink-0">
        <div className="w-1/3">
          <button onClick={handlePrev} disabled={currentQuestionIndex === 0} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border-light dark:border-border-dark hover:bg-black/5 dark:hover:bg-white/5 text-sm font-semibold transition-all disabled:opacity-50">
            <span className="material-symbols-outlined">chevron_left</span> Prev
          </button>
        </div>
        <div className="flex justify-center flex-1 gap-3">
          <button onClick={handleReject} className="px-5 py-2.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-semibold transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-base">close</span> Reject
          </button>
          <button onClick={handleMarkReview} className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${currentItem?.sq.status === 'review' ? 'bg-yellow-400/80 text-yellow-900' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'}`}>
            <span className="material-symbols-outlined text-base">flag</span> Mark for Review
          </button>
          <button onClick={handleAcceptClick} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${currentItem?.sq.status === 'accepted' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'}`}>
            <span className="material-symbols-outlined text-base">check</span> Accept
          </button>
        </div>
        <div className="flex justify-end w-1/3">
          <button onClick={handleNext} disabled={currentQuestionIndex === allQuestions.length - 1} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border-light dark:border-border-dark hover:bg-black/5 dark:hover:bg-white/5 text-sm font-semibold transition-all disabled:opacity-50">
            Next <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </footer>

      {/* Acceptance Checklist Modal */}
      {isAcceptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="w-full max-w-lg bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg border border-border-light dark:border-border-dark flex flex-col">
                  <header className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
                      <h3 className="text-lg font-bold">Review Verification</h3>
                      <button onClick={() => setIsAcceptModalOpen(false)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </header>
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-text-secondary">
                          Please confirm you have verified the following items. If an item does not exist (e.g., no figure), mark it as checked.
                      </p>
                      <div className="space-y-3">
                          <label className="flex items-center gap-3 font-semibold cursor-pointer">
                              <input type="checkbox" className="w-5 h-5 rounded text-primary focus:ring-primary"
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
                              <span>Select All</span>
                          </label>
                          <hr className="border-border-light dark:border-border-dark" />
                          {Object.entries({
                            questionContent: 'Question Content', optionContent: 'Option Content',
                            questionFormatting: 'Question Formatting', optionFormatting: 'Option Formatting',
                            figureFormatting: 'Figure Formatting (If Exists)', solutionExistence: 'Solution Existence',
                            solutionFormatting: 'Solution Formatting (If image exists)'
                          }).map(([key, label]) => (
                            <label key={key} className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 rounded text-primary focus:ring-primary"
                                    checked={checklist[key as keyof typeof checklist]}
                                    onChange={(e) => setChecklist(prev => ({ ...prev, [key]: e.target.checked }))}
                                />
                                <span>{label}</span>
                            </label>
                          ))}
                      </div>
                  </div>
                  <footer className="flex justify-end gap-3 p-4 bg-background-light dark:bg-background-dark/50 border-t border-border-light dark:border-border-dark">
                      <button onClick={() => setIsAcceptModalOpen(false)} className="px-5 py-2.5 rounded-lg border border-border-light dark:border-border-dark text-text-secondary hover:text-text-main dark:hover:text-white hover:bg-white dark:hover:bg-white/5 text-sm font-semibold transition-all">Cancel</button>
                      <button
                          onClick={confirmAccept}
                          disabled={!Object.values(checklist).every(Boolean)}
                          className="px-5 py-2.5 rounded-lg bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/90 text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                          <span className="material-symbols-outlined text-base">check</span>
                          Confirm Accept
                      </button>
                  </footer>
              </div>
          </div>
      )}
    </div>
  );
};

export default TestReview;
