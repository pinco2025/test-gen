import React, { useState, useEffect, useMemo } from 'react';
import { Question, Solution } from '../types';
import QuestionDisplay from './QuestionDisplay';
import ImageUpload from './ImageUpload';
import { FloatingTextMenu } from './FloatingTextMenu';
import { useUndoRedo } from '../hooks/useUndoRedo';

// Helper component for Undo/Redo buttons
const UndoRedoControls = ({ undoRedo }: { undoRedo: any }) => (
    <div className="flex items-center gap-0.5 ml-2 bg-gray-100 dark:bg-white/5 rounded-lg p-0.5 border border-border-light dark:border-border-dark">
        <button
            onClick={undoRedo.undo}
            disabled={!undoRedo.canUndo}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-text-secondary disabled:opacity-30 transition-colors"
            title="Undo"
            type="button"
        >
            <span className="material-symbols-outlined text-[16px]">undo</span>
        </button>
        <button
            onClick={undoRedo.redo}
            disabled={!undoRedo.canRedo}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-text-secondary disabled:opacity-30 transition-colors"
            title="Redo"
            type="button"
        >
            <span className="material-symbols-outlined text-[16px]">redo</span>
        </button>
    </div>
);

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface QuestionEditorProps {
  question: Question;
  solution?: Solution;
  onSave: (updatedQuestion: Question, updatedSolution?: Solution) => void;
  onIntermediateSave?: (updatedQuestion: Question, updatedSolution?: Solution) => void;
  onCancel: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  subject?: string;
  questionNumber?: number;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, solution, onSave, onIntermediateSave, onCancel, onNext, onPrevious, subject, questionNumber }) => {
  const [editedQuestion, setEditedQuestion] = useState<Question>(question);
  const [editedSolution, setEditedSolution] = useState<Solution | undefined>(solution);

  // Undo/Redo hooks for specific fields
  const questionText = useUndoRedo(question.question || '');
  const solutionText = useUndoRedo(solution?.solution_text || '');
  const optionA = useUndoRedo(question.option_a || '');
  const optionB = useUndoRedo(question.option_b || '');
  const optionC = useUndoRedo(question.option_c || '');
  const optionD = useUndoRedo(question.option_d || '');

  // Effect to sync undo/redo state back to main state object for saving
  useEffect(() => {
      setEditedQuestion(prev => {
          if (prev.question !== questionText.value ||
              prev.option_a !== optionA.value ||
              prev.option_b !== optionB.value ||
              prev.option_c !== optionC.value ||
              prev.option_d !== optionD.value) {
              return {
                  ...prev,
                  question: questionText.value,
                  option_a: optionA.value,
                  option_b: optionB.value,
                  option_c: optionC.value,
                  option_d: optionD.value
              };
          }
          return prev;
      });
  }, [questionText.value, optionA.value, optionB.value, optionC.value, optionD.value]);

  useEffect(() => {
      setEditedSolution(prev => {
          const defaultSol = { uuid: editedQuestion.uuid, solution_text: '', solution_image_url: '' };
          const s = prev || defaultSol;
          if (s.solution_text !== solutionText.value) {
              return { ...s, solution_text: solutionText.value };
          }
          return prev;
      });
  }, [solutionText.value, editedQuestion.uuid]);

  // Debounced auto-save
  const debouncedQuestion = useDebounce(editedQuestion, 1000);
  const debouncedSolution = useDebounce(editedSolution, 1000);

  useEffect(() => {
      if (onIntermediateSave) {
          onIntermediateSave(debouncedQuestion, debouncedSolution);
      }
  }, [debouncedQuestion, debouncedSolution, onIntermediateSave]);

  // Re-initialize undo stacks when question prop changes (switching questions)
  useEffect(() => {
      questionText.reset(question.question || '');
      solutionText.reset(solution?.solution_text || '');
      optionA.reset(question.option_a || '');
      optionB.reset(question.option_b || '');
      optionC.reset(question.option_c || '');
      optionD.reset(question.option_d || '');
  }, [question.uuid]);

  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableChapters, setAvailableChapters] = useState<{ [type: string]: string[] }>({});

  // Local state for chapters data to handle live updates
  const [chaptersData, setChaptersData] = useState<any>({});

  // State for additional topics UI
  const [showAdditionalTopics, setShowAdditionalTopics] = useState(false);
  const [addTopicSubject, setAddTopicSubject] = useState<string>(subject || '');
  const [addTopicChapter, setAddTopicChapter] = useState<string>('');
  const [addTopicId, setAddTopicId] = useState<string>('');

  // Add Topic Modal State
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  // Load chapters data from backend (filesystem)
  useEffect(() => {
      const loadChapters = async () => {
          if (!window.electronAPI) return;
          try {
              const data = await window.electronAPI.chapters.load();
              if (data) {
                  setChaptersData(data);
              }
          } catch (error) {
              console.error("Failed to load chapters from file:", error);
          }
      };
      loadChapters();
  }, []);

  useEffect(() => {
    setEditedQuestion(question);
    // Initialize showAdditionalTopics based on whether there are related concepts (multi-concept)
    if (question.is_multi_concept) {
        setShowAdditionalTopics(true);
    }

    const fetchSolution = async () => {
        if (!solution && window.electronAPI) {
            try {
                const fetchedSolution = await window.electronAPI.questions.getSolution(question.uuid);
                if (fetchedSolution) {
                    setEditedSolution(fetchedSolution);
                    solutionText.reset(fetchedSolution.solution_text || '');
                } else {
                    setEditedSolution({ uuid: question.uuid, solution_text: '', solution_image_url: '' });
                    solutionText.reset('');
                }
            } catch (error) {
                console.error("Failed to fetch solution:", error);
                setEditedSolution({ uuid: question.uuid, solution_text: '', solution_image_url: '' });
                solutionText.reset('');
            }
        } else {
             setEditedSolution(solution);
        }
    }
    fetchSolution();
  }, [question.uuid]);

  // Fetch metadata from database
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!window.electronAPI) return;
      try {
        const [types, years, chaptersByType] = await Promise.all([
          window.electronAPI.db.getTypes(),
          window.electronAPI.db.getYears(),
          window.electronAPI.db.getChaptersByType()
        ]);
        setAvailableTypes(types);
        setAvailableYears(years);
        setAvailableChapters(chaptersByType);
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
      }
    };
    fetchMetadata();
  }, []);

  // Sync addTopicSubject when subject prop changes or is available
  useEffect(() => {
      if (subject && !addTopicSubject) {
          setAddTopicSubject(subject);
      }
  }, [subject]);

  const handleQuestionChange = (field: keyof Question, value: any) => {
    setEditedQuestion(prev => ({ ...prev, [field]: value }));
  };

  const handleSolutionChange = (field: keyof Solution, value: any) => {
    setEditedSolution(prev => ({ ...(prev || { uuid: editedQuestion.uuid, solution_text: '', solution_image_url: '' }), [field]: value }));
  };

  const handleNext = async () => {
      if (onIntermediateSave) {
          await onIntermediateSave(editedQuestion, editedSolution);
      } else {
          onSave(editedQuestion, editedSolution);
      }
      onNext?.();
  };

  const handlePrevious = async () => {
      if (onIntermediateSave) {
          await onIntermediateSave(editedQuestion, editedSolution);
      } else {
          onSave(editedQuestion, editedSolution);
      }
      onPrevious?.();
  };

  const handleBack = async () => {
      // Ensure we save latest state before leaving
      if (onIntermediateSave) {
          await onIntermediateSave(editedQuestion, editedSolution);
      }
      onCancel();
  };

  const [showLegacyMetadata, setShowLegacyMetadata] = useState(false);

  const previewQuestion = {
      ...editedQuestion,
      solution: editedSolution
  };

  const isNumericalAnswer = (ans: string) => /^-?\d+(\.\d+)?$/.test(ans);
  const hasAnswer = editedQuestion.answer !== undefined && editedQuestion.answer !== null && editedQuestion.answer.trim() !== '';
  const isMCQType = ['MCQ', 'Assertion-Reason', 'Matrix Match'].includes(editedQuestion.type || '') || editedQuestion.type?.includes('MCQ') || !editedQuestion.type;

  let showOptions = true;
  if (hasAnswer) {
      showOptions = !isNumericalAnswer(editedQuestion.answer);
  } else {
      showOptions = isMCQType;
  }

  // Format Options Handler
  const handleFormatOptions = () => {
      const formatText = (text: string) => {
          if (!text) return text;
          const cleanText = text.replace(/\$/g, '').replace(/\\\\/g, '\\');
          return `$${cleanText}$`;
      };

      if (optionA.value) optionA.setValue(formatText(optionA.value));
      if (optionB.value) optionB.setValue(formatText(optionB.value));
      if (optionC.value) optionC.setValue(formatText(optionC.value));
      if (optionD.value) optionD.setValue(formatText(optionD.value));
  };

  // Helper to find topics for the current chapter (Primary Topic)
  const availableTopics = useMemo(() => {
      const chapterCode = editedQuestion.tag_2;
      if (!chapterCode) return null;

      // Search for the chapter in all subjects
      for (const subj of Object.values(chaptersData)) {
          const chapter = (subj as any[]).find((c: any) => c.code === chapterCode);
          if (chapter) {
              return (chapter.topics || {}) as Record<string, string>; // Return topics or empty object
          }
      }
      return null;
  }, [editedQuestion.tag_2, chaptersData]);

  // Helper to parse topic_tags (Primary Topic)
  const currentTopicTags = useMemo(() => {
      try {
          if (!editedQuestion.topic_tags) return [];
          const parsed = JSON.parse(editedQuestion.topic_tags);
          return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
          return editedQuestion.topic_tags ? [editedQuestion.topic_tags] : [];
      }
  }, [editedQuestion.topic_tags]);

  // Helper to parse related_concepts (Additional Topics)
  const currentRelatedConcepts = useMemo(() => {
      try {
          if (!editedQuestion.related_concepts) return [];
          const parsed = JSON.parse(editedQuestion.related_concepts);
          return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
          return [];
      }
  }, [editedQuestion.related_concepts]);

  const handlePrimaryTopicChange = (topicId: string) => {
      if (topicId === 'NEW_TOPIC') {
        openAddTopicModal();
        return;
      }

      // Update topic_tags (Primary Topic only)
      handleQuestionChange('topic_tags', JSON.stringify([topicId]));
  };

  const handleAddAdditionalTopic = () => {
      if (!addTopicChapter || !addTopicId) return;
      const topicString = `${addTopicChapter}-${addTopicId}`;

      if (!currentRelatedConcepts.includes(topicString)) {
          const newConcepts = [...currentRelatedConcepts, topicString];
          handleQuestionChange('related_concepts', JSON.stringify(newConcepts));
          handleQuestionChange('is_multi_concept', true);
      }
      // Reset selection
      setAddTopicId('');
  };

  const handleRemoveAdditionalTopic = (index: number) => {
      const newConcepts = currentRelatedConcepts.filter((_, i) => i !== index);
      handleQuestionChange('related_concepts', JSON.stringify(newConcepts));
      if (newConcepts.length === 0) {
          handleQuestionChange('is_multi_concept', false);
      }
  };

  // Helper for Additional Topic Dropdowns
  const availableAdditionalChapters = useMemo(() => {
      if (!addTopicSubject || !chaptersData[addTopicSubject]) return [];
      return chaptersData[addTopicSubject] as any[];
  }, [addTopicSubject, chaptersData]);

  const availableAdditionalTopics = useMemo(() => {
      if (!addTopicChapter) return null;
      // Find chapter in current subject (or search all if subject logic is loose)
      // Assuming addTopicSubject is correct context
      const chapter = availableAdditionalChapters.find(c => c.code === addTopicChapter);
      return chapter ? (chapter.topics || {}) : null;
  }, [addTopicChapter, availableAdditionalChapters]);

  const openAddTopicModal = () => {
    // We need to know which context we are adding for.
    // If primary topic dropdown triggered this, it uses editedQuestion.tag_2
    // If additional topic dropdown triggered this, we should support that too.
    // For now, implementing for primary topic add flow as requested in Step 1 of original request
    setIsTopicModalOpen(true);
    setNewTopicName('');
  };

  const handleConfirmAddTopic = async () => {
      if (!window.electronAPI) return;

      const chapterCode = editedQuestion.tag_2;
      if (!chapterCode) {
          alert("Please select a Chapter Code first.");
          return;
      }

       // Find the subject for this chapter
       let targetSubject = subject;
       if (!targetSubject) {
           for (const [subj, chapters] of Object.entries(chaptersData)) {
               if ((chapters as any[]).some((c: any) => c.code === chapterCode)) {
                   targetSubject = subj;
                   break;
               }
           }
       }

       if (!targetSubject) {
           alert("Could not determine subject for this chapter.");
           return;
       }

       if (!newTopicName || newTopicName.trim() === "") return;

       try {
        const result = await window.electronAPI.chapters.addTopic(targetSubject, chapterCode, newTopicName.trim());
        if (result.success && result.topicId) {
             // Update local chapters data
             setChaptersData((prev: any) => {
                 const newData = { ...prev };
                 const chapterIndex = newData[targetSubject!].findIndex((c: any) => c.code === chapterCode);
                 if (chapterIndex !== -1) {
                     if (!newData[targetSubject!][chapterIndex].topics) {
                         newData[targetSubject!][chapterIndex].topics = {};
                     }
                     newData[targetSubject!][chapterIndex].topics[result.topicId!] = newTopicName;
                 }
                 return newData;
             });

             // Select the new topic as primary
             handlePrimaryTopicChange(result.topicId);
             setIsTopicModalOpen(false);
        } else {
            alert("Failed to add topic: " + result.error);
        }
    } catch (error) {
        console.error("Error adding topic:", error);
        alert("An error occurred while adding the topic.");
    }
  };

  useEffect(() => {
    // Aggressively disable page-wide scrolling
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const cleanNewlines = (field: 'question' | 'solution_text' | string) => {
     let value = '';
     if (field === 'question') {
         value = questionText.value || '';
     } else if (field === 'solution_text') {
         value = solutionText.value || '';
     } else {
         return;
     }

     // Replace literal \n and real newlines with space
     const newValue = value.replace(/(\\n|\n)/g, ' ');

     if (field === 'question') {
         questionText.setValue(newValue);
     } else if (field === 'solution_text') {
         solutionText.setValue(newValue);
     }
  };

  return (
    <main
        className="flex-1 h-full min-h-0 w-full max-w-[1600px] mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 overflow-hidden !overflow-y-hidden !overflow-x-hidden bg-gray-50 dark:bg-[#121121] overscroll-none scrollbar-hide"
        style={{ overscrollBehavior: 'none', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
        <style>{`
            /* Globally hide scrollbars when this component is active */
            ::-webkit-scrollbar {
                display: none !important;
            }
            * {
                -ms-overflow-style: none !important;  /* IE and Edge */
                scrollbar-width: none !important;  /* Firefox */
            }
        `}</style>

        {/* Add Topic Modal */}
        {isTopicModalOpen && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl p-6 w-full max-w-md border border-border-light dark:border-border-dark transform scale-100 animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">Add New Topic</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Topic Name</label>
                            <input
                                autoFocus
                                type="text"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-border-light dark:border-border-dark rounded-lg text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                placeholder="Enter topic name..."
                                value={newTopicName}
                                onChange={(e) => setNewTopicName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddTopic()}
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setIsTopicModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmAddTopic}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                            >
                                Add Topic
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Left Pane: Preview */}
        <aside className="lg:col-span-5 flex flex-col gap-4 h-full overflow-hidden">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">visibility</span>
                    Student Preview
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
                <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm p-6 lg:p-8 flex flex-col gap-6 relative">
                   <QuestionDisplay question={previewQuestion} showAnswer={true} highlightCorrectAnswer={true} />
                </div>
                 <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-primary/10 border border-blue-100 dark:border-primary/20 flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary mt-0.5">info</span>
                    <div>
                        <p className="text-sm font-medium text-text-main dark:text-white">Rendering Note</p>
                        <p className="text-xs text-text-secondary mt-1">Mathematical expressions are rendered using KaTeX. The preview updates automatically as you type in the editor.</p>
                    </div>
                </div>
            </div>
        </aside>

        {/* Right Pane: Editor */}
        <section className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm relative">
            <FloatingTextMenu />
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined">edit_document</span>
                        Editing Interface
                    </h2>
                    {questionNumber !== undefined && (
                        <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-white/10 rounded text-text-secondary">
                            Q.{questionNumber}
                        </span>
                    )}
                </div>
                {subject && (
                    <span className="text-sm font-medium text-primary px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                        {subject} Section
                    </span>
                )}
            </div>
            {/* Reduced padding and spacing */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Section: Question Text */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center">
                            <label className="block text-sm font-semibold text-text-main dark:text-gray-200">Question Statement</label>
                            <UndoRedoControls undoRedo={questionText} />
                         </div>
                    </div>
                    <div className="relative border border-border-light dark:border-border-dark rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all group">
                        <textarea
                            className="w-full p-4 min-h-[120px] bg-transparent border-none focus:ring-0 outline-none text-text-main dark:text-gray-200 text-sm leading-relaxed resize-y"
                            placeholder="Type your question here... Use LaTeX for math like $x^2$."
                            value={questionText.value}
                            onChange={(e) => questionText.setValue(e.target.value)}
                        />
                        <button
                            onClick={() => cleanNewlines('question')}
                            className="absolute bottom-2 right-2 p-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-text-secondary hover:text-primary shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Clear Newlines (\n)"
                        >
                            <span className="material-symbols-outlined text-[16px]">format_align_justify</span>
                        </button>
                    </div>
                    <ImageUpload
                        label="Question Image"
                        imageUrl={editedQuestion.question_image_url}
                        onImageUrlChange={(url) => handleQuestionChange('question_image_url', url)}
                    />
                </div>

                {/* Section: Answer/Options */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-text-main dark:text-gray-200">
                          {showOptions
                            ? 'Options'
                            : 'Answer'}
                        </label>
                        <div className="flex items-center gap-2">
                             {showOptions && (
                                <button
                                    onClick={handleFormatOptions}
                                    className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center gap-1"
                                    title="Auto-format all options (clean $ and wrap in $...$)"
                                >
                                    <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                                    Format Options
                                </button>
                            )}
                            {showOptions && (
                                <span className="text-xs text-text-secondary">Select the radio button for the correct answer</span>
                            )}
                        </div>
                    </div>

                    {showOptions ? (
                        <div className="space-y-3">
                            {(['a', 'b', 'c', 'd'] as const).map(opt => {
                                const isChecked = editedQuestion.answer === opt.toUpperCase();
                                let currentOptionHook = optionA;
                                if (opt === 'b') currentOptionHook = optionB;
                                else if (opt === 'c') currentOptionHook = optionC;
                                else if (opt === 'd') currentOptionHook = optionD;

                                return (
                                    <div key={opt} className="flex items-start gap-3">
                                        <div className="pt-2.5">
                                            <input
                                                className="size-5 border-gray-300 text-primary focus:ring-primary dark:bg-white/5 dark:border-gray-600 cursor-pointer"
                                                name="correct_answer"
                                                type="radio"
                                                checked={isChecked}
                                                onChange={() => handleQuestionChange('answer', opt.toUpperCase())}
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col gap-2">
                                            <div className="flex w-full items-center gap-2">
                                                <div className="flex flex-1">
                                                    <div className={`w-10 flex-shrink-0 flex items-center justify-center border border-r-0 rounded-l-lg font-semibold text-sm ${isChecked ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-white/5 border-border-light dark:border-border-dark text-text-secondary'}`}>
                                                        {opt.toUpperCase()}
                                                    </div>
                                                    <input
                                                        className={`flex-1 min-w-0 px-4 py-2.5 bg-white dark:bg-[#1e1e2d] border border-l-0 rounded-r-lg focus:ring-2 focus:ring-primary/20 text-sm text-gray-900 dark:text-gray-100 transition-all ${isChecked ? 'border-primary font-medium' : 'border-border-light dark:border-border-dark focus:border-primary'}`}
                                                        placeholder={`Option ${opt.toUpperCase()} text`}
                                                        type="text"
                                                        value={currentOptionHook.value}
                                                        onChange={(e) => currentOptionHook.setValue(e.target.value)}
                                                    />
                                                </div>
                                                <UndoRedoControls undoRedo={currentOptionHook} />
                                            </div>
                                            <ImageUpload
                                                label=""
                                                imageUrl={editedQuestion[`option_${opt}_image_url`]}
                                                onImageUrlChange={(url) => handleQuestionChange(`option_${opt}_image_url`, url)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-3">
                           <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                                <input
                                    type="text"
                                    className="w-full p-4 bg-transparent border-none focus:ring-0 outline-none text-text-main dark:text-gray-200 text-sm leading-relaxed"
                                    placeholder="Enter the correct answer (e.g., 5, 3.14)"
                                    value={editedQuestion.answer}
                                    onChange={(e) => handleQuestionChange('answer', e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center">
                            <label className="block text-sm font-semibold text-text-main dark:text-gray-200">Detailed Solution</label>
                            <UndoRedoControls undoRedo={solutionText} />
                         </div>
                    </div>
                    <div className="relative border border-border-light dark:border-border-dark rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all group">
                        <textarea
                            className="w-full p-4 min-h-[300px] bg-transparent border-none focus:ring-0 text-text-main dark:text-gray-200 text-sm leading-relaxed resize-y"
                            placeholder="Explain the logic behind the correct answer..."
                            value={solutionText.value}
                            onChange={(e) => solutionText.setValue(e.target.value)}
                        />
                        <button
                            onClick={() => cleanNewlines('solution_text')}
                            className="absolute bottom-2 right-2 p-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-text-secondary hover:text-primary shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Clear Newlines (\n)"
                        >
                            <span className="material-symbols-outlined text-[16px]">format_align_justify</span>
                        </button>
                    </div>
                    <ImageUpload
                        label="Solution Image"
                        imageUrl={editedSolution?.solution_image_url || null}
                        onImageUrlChange={(url) => handleSolutionChange('solution_image_url', url)}
                    />
                </div>

                {/* Section: Legacy Images */}
                {(editedQuestion.legacy_question || editedQuestion.legacy_a || editedQuestion.legacy_b || editedQuestion.legacy_c || editedQuestion.legacy_d || editedQuestion.legacy_solution) && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-semibold text-text-main dark:text-gray-200">Legacy Images</label>
                            <span className="text-xs text-text-secondary bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded border border-yellow-200 dark:border-yellow-800">
                                Read-only Reference
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border-light dark:border-border-dark rounded-lg bg-gray-50 dark:bg-white/5">
                            {editedQuestion.legacy_question && (
                                <ImageUpload
                                    label="Legacy Question"
                                    imageUrl={editedQuestion.legacy_question}
                                    onImageUrlChange={(url) => handleQuestionChange('legacy_question', url)}
                                />
                            )}
                            {editedQuestion.legacy_a && (
                                <ImageUpload
                                    label="Legacy Option A"
                                    imageUrl={editedQuestion.legacy_a}
                                    onImageUrlChange={(url) => handleQuestionChange('legacy_a', url)}
                                />
                            )}
                            {editedQuestion.legacy_b && (
                                <ImageUpload
                                    label="Legacy Option B"
                                    imageUrl={editedQuestion.legacy_b}
                                    onImageUrlChange={(url) => handleQuestionChange('legacy_b', url)}
                                />
                            )}
                            {editedQuestion.legacy_c && (
                                <ImageUpload
                                    label="Legacy Option C"
                                    imageUrl={editedQuestion.legacy_c}
                                    onImageUrlChange={(url) => handleQuestionChange('legacy_c', url)}
                                />
                            )}
                            {editedQuestion.legacy_d && (
                                <ImageUpload
                                    label="Legacy Option D"
                                    imageUrl={editedQuestion.legacy_d}
                                    onImageUrlChange={(url) => handleQuestionChange('legacy_d', url)}
                                />
                            )}
                            {editedQuestion.legacy_solution && (
                                <ImageUpload
                                    label="Legacy Solution"
                                    imageUrl={editedQuestion.legacy_solution}
                                    onImageUrlChange={(url) => handleQuestionChange('legacy_solution', url)}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Section: Properties (Metadata) */}
                <div className="pt-6 border-t border-border-light dark:border-border-dark">
                    <h4 className="text-base font-bold text-text-main dark:text-white mb-4">Properties</h4>

                    {/* New Metadata Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Chapter Code (Tag 2) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Chapter Code (Tag 2)</label>
                            <select
                                className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
                                value={editedQuestion.tag_2 || ''}
                                onChange={(e) => handleQuestionChange('tag_2', e.target.value)}
                            >
                                <option value="">Select Chapter</option>
                                {subject && chaptersData[subject]
                                    ? (chaptersData[subject] as any[]).map(chapter => (
                                        <option key={chapter.code} value={chapter.code}>
                                            {chapter.code} - {chapter.name}
                                        </option>
                                    ))
                                    : Object.entries(availableChapters).flatMap(([type, chapters]) =>
                                        chapters.map(chapter => (
                                            <option key={`${type}-${chapter}`} value={chapter}>
                                                {chapter}
                                            </option>
                                        ))
                                    )
                                }
                            </select>
                        </div>

                        {/* Difficulty (Tag 3) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Difficulty (Tag 3)</label>
                            <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
                                {([{ label: 'Easy', value: 'E' }, { label: 'Medium', value: 'M' }, { label: 'Hard', value: 'H' }] as const).map(d => {
                                    const getDifficultyClasses = () => {
                                        switch (d.value) {
                                            case 'E': return 'peer-checked:bg-green-50 peer-checked:text-green-600 peer-checked:border-green-200 dark:peer-checked:bg-green-900/20 dark:peer-checked:border-green-800';
                                            case 'M': return 'peer-checked:bg-yellow-50 peer-checked:text-yellow-600 peer-checked:border-yellow-200 dark:peer-checked:bg-yellow-900/20 dark:peer-checked:border-yellow-800';
                                            case 'H': return 'peer-checked:bg-red-50 peer-checked:text-red-600 peer-checked:border-red-200 dark:peer-checked:bg-red-900/20 dark:peer-checked:border-red-800';
                                            default: return '';
                                        }
                                    };
                                    return (
                                        <label
                                            key={d.value}
                                            className="cursor-pointer flex-1"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleQuestionChange('tag_3', d.value);
                                            }}
                                        >
                                            <input
                                                className="peer sr-only"
                                                name="difficulty"
                                                type="radio"
                                                value={d.value}
                                                checked={editedQuestion.tag_3 === d.value}
                                                readOnly
                                            />
                                            <div className={`px-3 py-2 rounded-lg border border-border-light dark:border-border-dark text-xs font-medium text-text-secondary text-center ${getDifficultyClasses()}`}>
                                                {d.label}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Topic Selection */}
                        <div className="space-y-1.5 md:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Topic Selection</label>
                                <div className="flex items-center gap-2">
                                     <input
                                        type="checkbox"
                                        id="show_additional_topics"
                                        className="w-3.5 h-3.5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        checked={showAdditionalTopics}
                                        onChange={(e) => setShowAdditionalTopics(e.target.checked)}
                                    />
                                    <label htmlFor="show_additional_topics" className="text-xs text-text-secondary cursor-pointer">Additional Topics</label>
                                </div>
                            </div>

                            {/* Primary Topic */}
                            <div className="mb-2">
                                {availableTopics ? (
                                    <div className="flex gap-2">
                                        <select
                                            className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
                                            value={currentTopicTags[0] || ''}
                                            onChange={(e) => handlePrimaryTopicChange(e.target.value)}
                                        >
                                            <option value="">Select Topic</option>
                                            {Object.entries(availableTopics).map(([id, name]) => (
                                                <option key={id} value={id}>
                                                    {name}
                                                </option>
                                            ))}
                                            <option value="NEW_TOPIC" className="font-semibold text-primary">+ Add New Topic</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="text-sm text-text-secondary italic p-2 border border-border-light dark:border-border-dark rounded-lg bg-gray-50 dark:bg-white/5">
                                        Please select a Chapter Code (Tag 2) above to unlock topic selection.
                                    </div>
                                )}
                            </div>

                            {/* Additional Topics UI */}
                            {showAdditionalTopics && (
                                <div className="p-3 bg-gray-50 dark:bg-white/5 border border-border-light dark:border-border-dark rounded-lg space-y-3">
                                    <div className="text-xs font-semibold text-text-main dark:text-gray-300">Add Extra Topic</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <select
                                            className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-xs rounded p-2"
                                            value={addTopicSubject}
                                            onChange={(e) => {
                                                setAddTopicSubject(e.target.value);
                                                setAddTopicChapter('');
                                                setAddTopicId('');
                                            }}
                                        >
                                            <option value="">Select Subject</option>
                                            {Object.keys(chaptersData).map(subj => (
                                                <option key={subj} value={subj}>{subj}</option>
                                            ))}
                                        </select>

                                        <select
                                            className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-xs rounded p-2"
                                            value={addTopicChapter}
                                            onChange={(e) => {
                                                setAddTopicChapter(e.target.value);
                                                setAddTopicId('');
                                            }}
                                            disabled={!addTopicSubject}
                                        >
                                            <option value="">Select Chapter</option>
                                            {availableAdditionalChapters.map((c: any) => (
                                                <option key={c.code} value={c.code}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex gap-2">
                                        <select
                                            className="flex-1 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-xs rounded p-2"
                                            value={addTopicId}
                                            onChange={(e) => setAddTopicId(e.target.value)}
                                            disabled={!addTopicChapter}
                                        >
                                            <option value="">Select Topic</option>
                                            {availableAdditionalTopics && Object.entries(availableAdditionalTopics).map(([id, name]) => (
                                                <option key={id} value={id}>{name as string}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAddAdditionalTopic}
                                            disabled={!addTopicId}
                                            className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded disabled:opacity-50 hover:bg-primary/90"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    {/* List of added extra topics */}
                                    {currentRelatedConcepts.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                            {currentRelatedConcepts.map((tag, index) => (
                                                <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-600 rounded text-xs text-text-secondary">
                                                    {tag}
                                                    <button onClick={() => handleRemoveAdditionalTopic(index)} className="hover:text-red-500">
                                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Importance Level */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Importance Level</label>
                            <select
                                className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
                                value={editedQuestion.importance_level || ''}
                                onChange={(e) => handleQuestionChange('importance_level', e.target.value)}
                            >
                                <option value="">Select Level</option>
                                <option value="core">Core</option>
                                <option value="basic">Basic</option>
                                <option value="advanced">Advanced</option>
                                <option value="niche">Niche</option>
                            </select>
                        </div>

                        {/* JEE Mains Relevance */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">JEE Mains Relevance</label>
                                <span className="text-sm font-bold text-primary">
                                    {editedQuestion.jee_mains_relevance ?? 5}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="5"
                                step="1"
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary"
                                value={editedQuestion.jee_mains_relevance ?? 5}
                                onChange={(e) => handleQuestionChange('jee_mains_relevance', parseInt(e.target.value))}
                            />
                             <div className="flex justify-between text-[10px] text-text-secondary px-1">
                                <span>0</span>
                                <span>1</span>
                                <span>2</span>
                                <span>3</span>
                                <span>4</span>
                                <span>5</span>
                            </div>
                        </div>

                        {/* Verification Level 1 */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Verification Level 1</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleQuestionChange('verification_level_1', 'approved')}
                                    className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                                        editedQuestion.verification_level_1 === 'approved'
                                            ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                                            : 'bg-surface-light border-border-light text-text-secondary hover:bg-gray-50 dark:bg-surface-dark dark:border-border-dark dark:hover:bg-white/5'
                                    }`}
                                    title="Approve"
                                >
                                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                </button>
                                <button
                                    onClick={() => handleQuestionChange('verification_level_1', 'rejected')}
                                    className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                                        editedQuestion.verification_level_1 === 'rejected'
                                            ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                                            : 'bg-surface-light border-border-light text-text-secondary hover:bg-gray-50 dark:bg-surface-dark dark:border-border-dark dark:hover:bg-white/5'
                                    }`}
                                    title="Reject"
                                >
                                    <span className="material-symbols-outlined text-[20px]">cancel</span>
                                </button>
                                <button
                                    onClick={() => handleQuestionChange('verification_level_1', 'pending')}
                                    className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                                        !editedQuestion.verification_level_1 || editedQuestion.verification_level_1 === 'pending'
                                            ? 'bg-yellow-50 border-yellow-200 text-yellow-600 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400'
                                            : 'bg-surface-light border-border-light text-text-secondary hover:bg-gray-50 dark:bg-surface-dark dark:border-border-dark dark:hover:bg-white/5'
                                    }`}
                                    title="Pending"
                                >
                                    <span className="material-symbols-outlined text-[20px]">horizontal_rule</span>
                                </button>
                            </div>
                        </div>

                        {/* Verification Level 2 */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Verification Level 2</label>
                            <select
                                className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                value={editedQuestion.verification_level_2 || 'pending'}
                                onChange={(e) => handleQuestionChange('verification_level_2', e.target.value)}
                                disabled={!editedQuestion.verification_level_1 || editedQuestion.verification_level_1 === 'pending'}
                            >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        {/* Multi-Concept (Flags) */}
                        <div className="space-y-1.5">
                            <div className="flex flex-col gap-2 mt-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="scary"
                                        className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        checked={editedQuestion.scary || false}
                                        onChange={(e) => handleQuestionChange('scary', e.target.checked)}
                                    />
                                    <label htmlFor="scary" className="text-sm font-medium text-text-main dark:text-white">Difficult from view</label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="calc"
                                        className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        checked={editedQuestion.calc || false}
                                        onChange={(e) => handleQuestionChange('calc', e.target.checked)}
                                    />
                                    <label htmlFor="calc" className="text-sm font-medium text-text-main dark:text-white">Calculation Intensive</label>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-base font-bold text-text-main dark:text-white">Legacy Metadata</h4>
                        <button
                            onClick={() => setShowLegacyMetadata(!showLegacyMetadata)}
                            className="text-sm text-primary hover:underline focus:outline-none"
                        >
                            {showLegacyMetadata ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {showLegacyMetadata && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Topic (Tag 1)</label>
                                <input
                                    className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
                                    placeholder="e.g. Gravitation, Electromagnetism"
                                    type="text"
                                    value={editedQuestion.tag_1 || ''}
                                    onChange={(e) => handleQuestionChange('tag_1', e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Question Type</label>
                                <input
                                    className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
                                    placeholder="Type or select"
                                    type="text"
                                    list="type-options"
                                    value={editedQuestion.type || ''}
                                    onChange={(e) => handleQuestionChange('type', e.target.value)}
                                />
                                <datalist id="type-options">
                                    {availableTypes.map(type => (
                                        <option key={type} value={type} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Exam Year</label>
                                <input
                                    className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
                                    placeholder="Type or select"
                                    type="text"
                                    list="year-options"
                                    value={editedQuestion.year || ''}
                                    onChange={(e) => handleQuestionChange('year', e.target.value)}
                                />
                                <datalist id="year-options">
                                    {availableYears.map(year => (
                                        <option key={year} value={year} />
                                    ))}
                                </datalist>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Additional Tags (Tag 4)</label>
                                <input
                                    className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
                                    placeholder="e.g. Important, Frequently Asked"
                                    type="text"
                                    value={editedQuestion.tag_4 || ''}
                                    onChange={(e) => handleQuestionChange('tag_4', e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-6 py-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-surface-dark/50 flex items-center justify-between shrink-0">
                <button
                    onClick={handleBack}
                    className="px-5 py-2.5 rounded-lg border border-border-light dark:border-border-dark text-text-secondary hover:text-text-main dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 text-sm font-semibold transition-all">
                    Back
                </button>
                <div className="flex gap-3">
                     {(onPrevious || onNext) && (
                        <div className="flex mr-2">
                             {onPrevious && (
                                <button
                                    onClick={handlePrevious}
                                    className="p-2.5 rounded-l-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-light text-text-secondary hover:text-text-main dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                    title="Previous Question"
                                >
                                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                </button>
                             )}
                             {onNext && (
                                <button
                                    onClick={handleNext}
                                    className="p-2.5 rounded-r-lg border border-l-0 border-border-light dark:border-border-dark bg-white dark:bg-surface-light text-text-secondary hover:text-text-main dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                    title="Next Question"
                                >
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </button>
                             )}
                        </div>
                     )}
                </div>
            </div>
        </section>
    </main>
  );
};

export default QuestionEditor;
