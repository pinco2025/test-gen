import React, { useState, useEffect, useMemo } from 'react';
import { SectionConfig, Question, SelectedQuestion, Chapter } from '../types';
import { sortQuestionsForSection } from '../utils/sorting';
import QuestionDisplay from './QuestionDisplay';
import IPQComparisonModal from './IPQComparisonModal';
import SwitchQuestionModal from './SwitchQuestionModal';
import QuestionSelection from './QuestionSelection';
import ViewLinksModal from './ViewLinksModal';

interface TestReviewProps {
    sections: SectionConfig[];
    onStartEditing: (question: Question) => void;
    onBack: () => void;
    onExport: () => void; // This will now effectively "Proceed to Next Step"
    onRemoveQuestion: (questionUuid: string) => void;
    onUpdateQuestionStatus: (questionUuid: string, status: 'accepted' | 'review' | 'pending') => void;
    onVerifyQuestion?: (questionUuid: string, status: 'approved' | 'rejected' | 'pending') => void;
    onReplaceQuestion: (oldUuid: string, newQuestion: Question) => void;
    initialQuestionUuid?: string | null;
    onNavigationComplete?: () => void;
    onSwitchQuestion?: (question: Question) => void;
}

const TestReview: React.FC<TestReviewProps> = ({
    sections,
    onStartEditing,
    onBack,
    onExport,
    // onUpdateQuestionStatus can be removed if not used elsewhere, but maybe keep in props interface
    // onUpdateQuestionStatus, 
    onVerifyQuestion,
    onReplaceQuestion,
    initialQuestionUuid,
    onNavigationComplete,
    onSwitchQuestion
}) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    // Initialize freshQuestionsMap from sections to preserve verification status on remount
    const [freshQuestionsMap, setFreshQuestionsMap] = useState<Record<string, Question>>(() => {
        const initial: Record<string, Question> = {};
        sections.forEach(s => s.selectedQuestions.forEach(sq => {
            // Explicitly ensure we use the question from sections
            initial[sq.question.uuid] = sq.question;
        }));
        return initial;
    });
    const [solutionsMap, setSolutionsMap] = useState<Record<string, { solution_text: string; solution_image_url: string }>>({});

    // Local overrides for immediate UI feedback (before sections prop updates)
    const [localVerificationOverrides, setLocalVerificationOverrides] = useState<Record<string, 'approved' | 'rejected' | 'pending'>>({});

    const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
    const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
    const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
    const [isChapterSelectionOpen, setIsChapterSelectionOpen] = useState(false);
    const [isViewLinksModalOpen, setIsViewLinksModalOpen] = useState(false);

    // Sidebar Toggle
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Removed Solution Visibility State
    // const [showSolutionsDefault, setShowSolutionsDefault] = useState(false);
    // const [isCurrentSolutionVisible, setIsCurrentSolutionVisible] = useState(false);

    const [checklist, setChecklist] = useState({
        questionContent: false,
        optionContent: false,
        questionFormatting: false,
        optionFormatting: false,
        figureFormatting: false,
        solutionExistence: false,
        solutionFormatting: false
    });

    // Fetch fresh data on mount, when sections change, or when returning from editing
    useEffect(() => {
        const fetchFreshData = async () => {
            if (!window.electronAPI) return;
            const allUuids = sections.flatMap(s => s.selectedQuestions.map(sq => sq.question.uuid));
            if (allUuids.length === 0) return;
            console.log('[TestReview] Fetching fresh data for', allUuids.length, 'questions');
            try {
                const freshQuestions = await window.electronAPI.questions.getByUUIDs(allUuids);

                // IMPORTANT: Merge with existing state but PRIORITIZE sections prop verification status
                setFreshQuestionsMap(prev => {
                    const map: Record<string, Question> = { ...prev };

                    freshQuestions.forEach(q => {
                        // Find the authoritative status from the sections prop
                        // This ensures that even if DB is stale (pending), we keep 'approved' if App state has it
                        let verificationStatus = q.verification_level_1; // Start with DB status

                        // Check sections prop
                        for (const section of sections) {
                            const sq = section.selectedQuestions.find(sq => sq.question.uuid === q.uuid);
                            if (sq?.question.verification_level_1 === 'approved' || sq?.question.verification_level_1 === 'rejected') {
                                verificationStatus = sq.question.verification_level_1;
                                break;
                            }
                        }

                        // Also check local overrides (optimistic)
                        const localOverride = prev[q.uuid]?.verification_level_1;
                        if (localOverride === 'approved' || localOverride === 'rejected') {
                            // If previous map had it (maybe from a different source), honor it? 
                            // Better to trust sections prop mostly.
                            // But let's stick to the logic: sections > DB
                        }

                        map[q.uuid] = { ...q, verification_level_1: verificationStatus };
                    });
                    return map;
                });
                console.log('[TestReview] Refreshed freshQuestionsMap');

                // Fetch solutions for all questions
                const solutionPromises = allUuids.map(async (uuid) => {
                    try {
                        // Try to determine examSource from the question
                        const question = freshQuestions.find(q => q.uuid === uuid) ||
                            sections.flatMap(s => s.selectedQuestions).find(sq => sq.question.uuid === uuid)?.question;
                        const examSource = (question as any)?.examSource;

                        if (examSource === 'IPQ') {
                            const sol = await window.electronAPI.ipq.getSolution(uuid);
                            return { uuid, solution: sol };
                        } else {
                            const sol = await window.electronAPI.questions.getSolution(uuid, examSource);
                            return { uuid, solution: sol };
                        }
                    } catch {
                        return { uuid, solution: null };
                    }
                });

                const solutions = await Promise.all(solutionPromises);
                const solMap: Record<string, { solution_text: string; solution_image_url: string }> = {};
                solutions.forEach(({ uuid, solution }) => {
                    if (solution) {
                        solMap[uuid] = {
                            solution_text: solution.solution_text || '',
                            solution_image_url: solution.solution_image_url || ''
                        };
                    }
                });
                setSolutionsMap(solMap);
            } catch (error) {
                console.error('Failed to fetch fresh question data:', error);
            }
        };
        fetchFreshData();
    }, [sections, initialQuestionUuid]); // Added initialQuestionUuid to trigger refetch after editing

    // Flatten and sort questions
    // ARCHITECTURE: localVerificationOverrides for immediate UI, sections prop for persistence
    const allQuestions = useMemo(() => {
        const flat: Array<{ sq: SelectedQuestion; sectionIndex: number; absoluteIndex: number }> = [];
        let count = 0;
        sections.forEach((section, sIdx) => {
            const sortedQuestions = sortQuestionsForSection(section.selectedQuestions);
            sortedQuestions.forEach((sq) => {
                count++;
                // Merge fresh data from DB with sections prop data
                const freshData = freshQuestionsMap[sq.question.uuid];

                // PRIORITY: localOverrides > sections prop (for immediate UI feedback)
                const verificationStatus = localVerificationOverrides[sq.question.uuid]
                    ?? sq.question.verification_level_1;

                const mergedQuestion = freshData
                    ? { ...freshData, verification_level_1: verificationStatus }
                    : { ...sq.question, verification_level_1: verificationStatus };

                const solution = solutionsMap[sq.question.uuid];
                const questionWithSolution = solution ? { ...mergedQuestion, solution } : mergedQuestion;
                flat.push({ sq: { ...sq, question: questionWithSolution }, sectionIndex: sIdx, absoluteIndex: count });
            });
        });
        return flat;
    }, [sections, freshQuestionsMap, solutionsMap, localVerificationOverrides]);

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
        // Set local override for immediate UI feedback (still good for instant responsiveness)
        setLocalVerificationOverrides(prev => ({ ...prev, [currentQuestion.uuid]: 'approved' }));

        // Update parent for persistence
        // This handles both verification_level_1 AND status='accepted'
        if (onVerifyQuestion) {
            onVerifyQuestion(currentQuestion.uuid, 'approved');
        }
        setIsAcceptModalOpen(false);
        handleNext();
    };

    const handleReject = () => {
        if (!currentQuestion) return;
        // Set local override for immediate UI feedback
        setLocalVerificationOverrides(prev => ({ ...prev, [currentQuestion.uuid]: 'rejected' }));
        // Also update parent for persistence
        if (onVerifyQuestion) {
            onVerifyQuestion(currentQuestion.uuid, 'rejected');
        }
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
                onReplaceQuestion(currentQuestion.uuid, clonedQuestion);
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

    const handleChapterSelectionReplace = async (newQuestion: Question) => {
        if (!currentQuestion) return;
        if (confirm(`Replace current question with selected question (UUID: ${newQuestion.uuid.substring(0, 8)}...)?`)) {
            // Update frequencies: decrement old, increment new
            if (window.electronAPI) {
                try {
                    // Decrement frequency of the replaced question
                    await window.electronAPI.questions.decrementFrequency(
                        currentQuestion.uuid,
                        currentQuestion.examSource as any
                    );
                    // Increment frequency of the newly selected question
                    await window.electronAPI.questions.incrementFrequency(
                        newQuestion.uuid,
                        newQuestion.examSource as any
                    );
                } catch (e) {
                    console.error('Failed to update frequencies:', e);
                }
            }
            onReplaceQuestion(currentQuestion.uuid, newQuestion);
            setIsChapterSelectionOpen(false);
        }
    };

    const getLinkedUuids = (q: Question | undefined): string[] => {
        if (!q || !q.links) return [];
        try {
            const links = JSON.parse(q.links);
            if (Array.isArray(links)) return links;
        } catch (e) {
            // ignore parse errors
        }
        return [];
    };

    const linkedUuids = getLinkedUuids(currentQuestion);
    const originalUuid = linkedUuids.length > 0 ? linkedUuids[0] : null;

    const canExport = useMemo(() => {
        if (allQuestions.length === 0) return false;
        return allQuestions.every(item => item.sq.question.verification_level_1 === 'approved');
    }, [allQuestions]);

    const getPaletteClass = (q: Question, isActive: boolean) => {
        let base = 'bg-gray-100 dark:bg-white/5 text-text-secondary';

        // Priority: approved (green) > rejected (red) > class=1 unapproved (blue) > default (gray)
        if (q.verification_level_1 === 'approved') {
            base = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
        } else if (q.verification_level_1 === 'rejected') {
            base = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
        } else if (q.class === 1) {
            // Highlight class=1 questions with blue when not approved/rejected
            base = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        } else if (q.legacy_solution) {
            // Highlight questions with legacy solution (yellow)
            base = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
        }

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
        return 'Physics';
    };

    const getCurrentChapters = (): Chapter[] => {
        const sectionIndex = currentItem?.sectionIndex;
        if (sectionIndex !== undefined && sections[sectionIndex]) {
            return sections[sectionIndex].chapters;
        }
        return [];
    };

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
                        alphaConstraint={{ chapters: [] }}
                        betaConstraint={{}}
                        onComplete={() => { }}
                        onBack={() => setIsChapterSelectionOpen(false)}
                        onStartEditing={() => { }}
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
            <header className="flex-shrink-0 h-14 flex items-center justify-between px-3 md:px-6 border-b border-gray-200 dark:border-[#2d2d3b] bg-white dark:bg-[#1e1e2d]">
                <div className="flex items-center gap-2 md:gap-4">
                    <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#252535] text-text-secondary transition-colors">
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </button>
                    {/* Toggle Sidebar Button */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#252535] text-text-secondary transition-colors ${isSidebarOpen ? 'bg-gray-100 dark:bg-[#252535] text-primary' : ''}`}
                        title={isSidebarOpen ? "Collapse Palette" : "Expand Palette"}
                    >
                        <span className="material-symbols-outlined text-xl">
                            {isSidebarOpen ? 'left_panel_close' : 'left_panel_open'}
                        </span>
                    </button>

                    <h2 className="text-sm md:text-base font-bold text-text-main dark:text-white truncate max-w-[150px] md:max-w-none">Test Review</h2>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-[#252535] text-text-secondary whitespace-nowrap hidden sm:inline-block">
                        {allQuestions.length} Qs
                    </span>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Solution Toggle Removed */}
                    <button
                        onClick={onExport}
                        disabled={!canExport}
                        className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${canExport
                            ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90'
                            : 'bg-gray-200 dark:bg-[#252535] text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        <span className="hidden md:inline">Export Test</span>
                        <span className="md:hidden">Export</span>
                        <span className="material-symbols-outlined text-lg">ios_share</span>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">

                {/* Palette Sidebar - Collapsible */}
                <aside
                    className={`flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-[#2d2d3b] bg-white dark:bg-[#1e1e2d] transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}
                >
                    <div className="p-4 border-b border-gray-200 dark:border-[#2d2d3b] min-w-[320px]">
                        <h3 className="font-bold text-sm text-text-main dark:text-white uppercase tracking-wider">Question Palette</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 min-w-[320px]">
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
                        <div className="flex-1 overflow-y-auto p-2 md:p-6 lg:p-12">
                            <div className="max-w-4xl mx-auto flex flex-col gap-4 md:gap-6">
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
                                        defaultSolutionExpanded={true}
                                        showSolutionToggle={true}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pb-4">
                                    {/* Solution Toggle Button Removed */}
                                    <button
                                        onClick={handleEditClick}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-primary hover:bg-primary/10 transition-colors font-medium text-sm"
                                    >
                                        <span className="material-symbols-outlined text-lg">edit_note</span>
                                        <span className="hidden md:inline">Edit Question Content</span>
                                        <span className="md:hidden">Edit</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">Loading...</div>
                    )}
                </main>
            </div>

            {/* Footer Nav Bar - Compact & Modern & Responsive */}
            <footer className="flex-shrink-0 h-16 flex items-center justify-between px-3 md:px-6 border-t border-gray-200 dark:border-[#2d2d3b] bg-white dark:bg-[#1e1e2d] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-none z-10 overflow-x-auto gap-2">

                {/* Left: Navigation */}
                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                    <button
                        onClick={handlePrev}
                        disabled={currentQuestionIndex === 0}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2d2d3b] hover:bg-gray-50 dark:hover:bg-[#252535] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold text-text-main dark:text-white"
                        title="Previous Question"
                    >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        <span className="hidden md:inline">Prev</span>
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentQuestionIndex === allQuestions.length - 1}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2d2d3b] hover:bg-gray-50 dark:hover:bg-[#252535] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold text-text-main dark:text-white"
                        title="Next Question"
                    >
                        <span className="hidden md:inline">Next</span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                </div>

                {/* Center: Actions */}
                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                    {linkedUuids.length > 0 && (
                        <button
                            onClick={() => setIsViewLinksModalOpen(true)}
                            className="flex items-center gap-2 px-3 md:px-5 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 font-bold text-sm transition-all border border-purple-200 dark:border-purple-800/30"
                            title="View Linked Questions"
                        >
                            <span className="material-symbols-outlined text-lg">link</span>
                            <span className="hidden md:inline">View Links</span>
                            {linkedUuids.length > 1 && (
                                <span className="text-xs bg-purple-200 dark:bg-purple-800/50 px-1.5 py-0.5 rounded-full">
                                    {linkedUuids.length}
                                </span>
                            )}
                        </button>
                    )}

                    <button
                        onClick={handleReject}
                        className={`flex items-center gap-2 px-3 md:px-5 py-2 rounded-lg font-bold text-sm transition-all ${currentQuestion?.verification_level_1 === 'rejected'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20'
                            }`}
                        title="Reject Question"
                    >
                        <span className="material-symbols-outlined text-lg">thumb_down</span>
                        <span className="hidden md:inline">Reject</span>
                    </button>

                    <button
                        onClick={() => setIsSwitchModalOpen(true)}
                        className="flex items-center gap-2 px-3 md:px-5 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 font-bold text-sm transition-all"
                        title="Switch Question"
                    >
                        <span className="material-symbols-outlined text-lg">swap_calls</span>
                        <span className="hidden md:inline">Switch</span>
                    </button>

                    <button
                        onClick={handleAcceptClick}
                        className={`flex items-center gap-2 px-3 md:px-5 py-2 rounded-lg font-bold text-sm transition-all ${currentQuestion?.verification_level_1 === 'approved'
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20'
                            }`}
                        title="Accept Question"
                    >
                        <span className="material-symbols-outlined text-lg">thumb_up</span>
                        <span className="hidden md:inline">Accept</span>
                    </button>
                </div>

                {/* Right: Info (Spacer) - Hidden on small */}
                <div className="hidden md:flex w-[140px] justify-end">
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

            {/* Comparison Modal (Legacy - kept for backwards compatibility) */}
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

            {/* View Links Modal */}
            {isViewLinksModalOpen && currentQuestion && linkedUuids.length > 0 && (
                <ViewLinksModal
                    currentQuestion={currentQuestion}
                    linkedUuids={linkedUuids}
                    onClose={() => setIsViewLinksModalOpen(false)}
                    onEditCurrent={() => {
                        setIsViewLinksModalOpen(false);
                        handleEditClick();
                    }}
                    onEditLinked={(linkedQuestion) => {
                        setIsViewLinksModalOpen(false);
                        handleEditOriginal(linkedQuestion);
                    }}
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
                            onSwitchQuestion(currentQuestion);
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
