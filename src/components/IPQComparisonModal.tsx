import React, { useState, useEffect } from 'react';
import { Question, Solution } from '../types';
import QuestionDisplay from './QuestionDisplay';

interface IPQComparisonModalProps {
  currentQuestion: Question;
  originalQuestionUuid: string;
  onClose: () => void;
  onEditCurrent: () => void;
  onEditOriginal?: (question: Question) => void;
}

const IPQComparisonModal: React.FC<IPQComparisonModalProps> = ({
  currentQuestion,
  originalQuestionUuid,
  onClose,
  onEditCurrent,
  onEditOriginal
}) => {
  const [originalQuestion, setOriginalQuestion] = useState<(Question & { solution?: Solution }) | null>(null);
  const [currentQuestionWithSolution, setCurrentQuestionWithSolution] = useState<(Question & { solution?: Solution }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!window.electronAPI) return;

        // Fetch original question
        const [fetchedOriginal] = await window.electronAPI.questions.getByUUIDs([originalQuestionUuid]);

        // Fetch solutions for both
        let originalSol: Solution | null = null;
        let currentSol: Solution | null = null;

        try {
          // Pass examSource to fetch from correct exam-specific solutions table
          originalSol = await window.electronAPI.questions.getSolution(originalQuestionUuid, fetchedOriginal?.examSource as any);
        } catch (e) { console.warn("Failed to fetch original solution", e); }

        try {
          // Pass examSource to fetch from correct exam-specific solutions table (for IPQ, use IPQ API)
          if (currentQuestion.examSource === 'IPQ') {
            currentSol = await window.electronAPI.ipq.getSolution(currentQuestion.uuid);
          } else {
            currentSol = await window.electronAPI.questions.getSolution(currentQuestion.uuid, currentQuestion.examSource as any);
          }
        } catch (e) { console.warn("Failed to fetch current solution", e); }

        if (fetchedOriginal) {
          setOriginalQuestion({ ...fetchedOriginal, solution: originalSol || undefined });
        }

        setCurrentQuestionWithSolution({ ...currentQuestion, solution: currentSol || undefined });

      } catch (error) {
        console.error("Failed to fetch comparison data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [originalQuestionUuid, currentQuestion]);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Determine Titles
  const isIPQ = currentQuestion.type === 'IPQ';
  const mainTitle = "Compare Questions";
  const rightPanelTitle = isIPQ ? "New IPQ Question" : "New Cloned Question";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[95vw] h-[90vh] bg-white dark:bg-[#1e1e2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2d2d3b] flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#2d2d3b] bg-gray-50 dark:bg-[#252535]">
          <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">compare_arrows</span>
            {mainTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-text-secondary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Left: Original Question */}
              <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-[#2d2d3b] bg-gray-50/50 dark:bg-[#121121]/50">
                <div className="p-3 bg-gray-100 dark:bg-[#252535] border-b border-gray-200 dark:border-[#2d2d3b] flex justify-between items-center">
                  <span className="font-bold text-sm text-text-secondary uppercase tracking-wider">Original Question</span>
                  <span className="text-xs font-mono bg-white dark:bg-black/20 px-2 py-0.5 rounded text-text-secondary">
                    {originalQuestion?.uuid.substring(0, 8)}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                  {originalQuestion ? (
                    <QuestionDisplay
                      question={originalQuestion}
                      showAnswer={true}
                    />
                  ) : (
                    <div className="text-center text-red-500 mt-10">Failed to load original question.</div>
                  )}
                </div>
                {/* Edit Original Button */}
                {onEditOriginal && originalQuestion && (
                  <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-[#2d2d3b] flex justify-end bg-gray-100 dark:bg-[#252535]">
                    <button
                      onClick={() => {
                        onClose(); // Close modal first
                        onEditOriginal(originalQuestion);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-[#2d2d3b] text-text-main dark:text-white hover:bg-gray-300 dark:hover:bg-[#353545] transition-all font-semibold"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                      Edit Original
                    </button>
                  </div>
                )}
              </div>

              {/* Right: New Question */}
              <div className="flex-1 flex flex-col bg-white dark:bg-[#1e1e2d]">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/20 flex justify-between items-center">
                  <span className="font-bold text-sm text-blue-700 dark:text-blue-400 uppercase tracking-wider">{rightPanelTitle}</span>
                  <span className="text-xs font-mono bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded text-blue-700 dark:text-blue-400">
                    {currentQuestion.uuid.substring(0, 8)}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                  {currentQuestionWithSolution && (
                    <QuestionDisplay
                      question={currentQuestionWithSolution}
                      showAnswer={true}
                    />
                  )}
                </div>
                <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-[#2d2d3b] flex justify-end bg-gray-50 dark:bg-[#252535]">
                  <button
                    onClick={onEditCurrent}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all font-semibold shadow-lg shadow-primary/20"
                  >
                    <span className="material-symbols-outlined text-lg">edit_note</span>
                    Edit This Question
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default IPQComparisonModal;
