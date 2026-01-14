import React, { useState, useEffect } from 'react';
import { Question, Solution } from '../types';
import QuestionDisplay from './QuestionDisplay';

interface ViewLinksModalProps {
    currentQuestion: Question;
    linkedUuids: string[];
    onClose: () => void;
    onEditCurrent: () => void;
    onEditLinked?: (question: Question) => void;
}

const ViewLinksModal: React.FC<ViewLinksModalProps> = ({
    currentQuestion,
    linkedUuids,
    onClose,
    onEditCurrent,
    onEditLinked
}) => {
    const [linkedQuestions, setLinkedQuestions] = useState<Array<Question & { solution?: Solution }>>([]);
    const [currentQuestionWithSolution, setCurrentQuestionWithSolution] = useState<(Question & { solution?: Solution }) | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (!window.electronAPI) return;

                // Fetch linked questions
                const fetchedLinked = await window.electronAPI.questions.getByUUIDs(linkedUuids);

                // Fetch solutions for linked questions
                const linkedWithSolutions = await Promise.all(
                    fetchedLinked.map(async (q) => {
                        let sol: Solution | null = null;
                        try {
                            if (q.examSource === 'IPQ') {
                                sol = await window.electronAPI.ipq.getSolution(q.uuid);
                            } else {
                                sol = await window.electronAPI.questions.getSolution(q.uuid, q.examSource as any);
                            }
                        } catch (e) {
                            console.warn("Failed to fetch solution for linked question", q.uuid, e);
                        }
                        return { ...q, solution: sol || undefined };
                    })
                );

                setLinkedQuestions(linkedWithSolutions);

                // Fetch solution for current question
                let currentSol: Solution | null = null;
                try {
                    if (currentQuestion.examSource === 'IPQ') {
                        currentSol = await window.electronAPI.ipq.getSolution(currentQuestion.uuid);
                    } else {
                        currentSol = await window.electronAPI.questions.getSolution(currentQuestion.uuid, currentQuestion.examSource as any);
                    }
                } catch (e) {
                    console.warn("Failed to fetch current solution", e);
                }

                setCurrentQuestionWithSolution({ ...currentQuestion, solution: currentSol || undefined });

            } catch (error) {
                console.error("Failed to fetch linked questions data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [linkedUuids, currentQuestion]);

    // Prevent background scrolling
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const selectedLinkedQuestion = linkedQuestions[selectedIndex] || null;
    const hasMultipleLinks = linkedQuestions.length > 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[95vw] h-[90vh] bg-white dark:bg-[#1e1e2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2d2d3b] flex flex-col overflow-hidden">

                {/* Header */}
                <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#2d2d3b] bg-gray-50 dark:bg-[#252535]">
                    <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">link</span>
                        View Linked Questions
                        {linkedQuestions.length > 0 && (
                            <span className="text-sm font-normal text-text-secondary ml-2">
                                ({linkedQuestions.length} linked)
                            </span>
                        )}
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
                            {/* Left: Current Question */}
                            <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-[#2d2d3b] bg-gray-50/50 dark:bg-[#121121]/50">
                                <div className="p-3 bg-gray-100 dark:bg-[#252535] border-b border-gray-200 dark:border-[#2d2d3b] flex justify-between items-center">
                                    <span className="font-bold text-sm text-text-secondary uppercase tracking-wider">Current Question</span>
                                    <span className="text-xs font-mono bg-white dark:bg-black/20 px-2 py-0.5 rounded text-text-secondary">
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
                                <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-[#2d2d3b] flex justify-end bg-gray-100 dark:bg-[#252535]">
                                    <button
                                        onClick={() => {
                                            onClose();
                                            onEditCurrent();
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all font-semibold shadow-lg shadow-primary/20"
                                    >
                                        <span className="material-symbols-outlined text-lg">edit_note</span>
                                        Edit This Question
                                    </button>
                                </div>
                            </div>

                            {/* Right: Linked Question(s) */}
                            <div className="flex-1 flex flex-col bg-white dark:bg-[#1e1e2d]">
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/20 flex justify-between items-center gap-4">
                                    <span className="font-bold text-sm text-purple-700 dark:text-purple-400 uppercase tracking-wider flex-shrink-0">
                                        Linked Question
                                    </span>

                                    {/* Dropdown for multiple linked questions */}
                                    {hasMultipleLinks ? (
                                        <select
                                            value={selectedIndex}
                                            onChange={(e) => setSelectedIndex(parseInt(e.target.value, 10))}
                                            className="flex-1 max-w-xs px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-[#1e1e2d] border border-purple-200 dark:border-purple-800/30 text-purple-700 dark:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {linkedQuestions.map((q, idx) => (
                                                <option key={q.uuid} value={idx}>
                                                    {idx + 1}. {q.uuid.substring(0, 8)}... ({q.examSource || 'Unknown'})
                                                </option>
                                            ))}
                                        </select>
                                    ) : selectedLinkedQuestion && (
                                        <span className="text-xs font-mono bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded text-purple-700 dark:text-purple-400">
                                            {selectedLinkedQuestion.uuid.substring(0, 8)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                                    {selectedLinkedQuestion ? (
                                        <QuestionDisplay
                                            question={selectedLinkedQuestion}
                                            showAnswer={true}
                                        />
                                    ) : (
                                        <div className="text-center text-red-500 mt-10">
                                            Failed to load linked question.
                                        </div>
                                    )}
                                </div>
                                {/* Edit Linked Button */}
                                {onEditLinked && selectedLinkedQuestion && (
                                    <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-[#2d2d3b] flex justify-end bg-gray-50 dark:bg-[#252535]">
                                        <button
                                            onClick={() => {
                                                onClose();
                                                onEditLinked(selectedLinkedQuestion);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-all font-semibold shadow-lg shadow-purple-600/20"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                            Edit Linked Question
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewLinksModal;
