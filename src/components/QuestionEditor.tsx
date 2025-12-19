import React, { useState, useEffect, useMemo } from 'react';
import { Question, Solution } from '../types';
import QuestionDisplay from './QuestionDisplay';
import ImageUpload from './ImageUpload'; // Import the new component
import chaptersData from '../data/chapters.json';

interface QuestionEditorProps {
  question: Question;
  solution?: Solution;
  onSave: (updatedQuestion: Question, updatedSolution?: Solution) => void;
  onCancel: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, solution, onSave, onCancel, onNext, onPrevious }) => {
  const [editedQuestion, setEditedQuestion] = useState<Question>(question);
  const [editedSolution, setEditedSolution] = useState<Solution | undefined>(solution);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableChapters, setAvailableChapters] = useState<{ [type: string]: string[] }>({});

  useEffect(() => {
    setEditedQuestion(question);
    const fetchSolution = async () => {
        if (!solution && window.electronAPI) {
            try {
                const fetchedSolution = await window.electronAPI.questions.getSolution(question.uuid);
                if (fetchedSolution) {
                    setEditedSolution(fetchedSolution);
                } else {
                    setEditedSolution({ uuid: question.uuid, solution_text: '', solution_image_url: '' });
                }
            } catch (error) {
                console.error("Failed to fetch solution:", error);
                setEditedSolution({ uuid: question.uuid, solution_text: '', solution_image_url: '' });
            }
        } else {
             setEditedSolution(solution);
        }
    }
    fetchSolution();
  }, [question, solution]);

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

  const handleQuestionChange = (field: keyof Question, value: any) => {
    setEditedQuestion(prev => ({ ...prev, [field]: value }));
  };

  const handleSolutionChange = (field: keyof Solution, value: any) => {
    setEditedSolution(prev => ({ ...(prev || { uuid: editedQuestion.uuid, solution_text: '', solution_image_url: '' }), [field]: value }));
  };

  const handleSave = () => {
    onSave(editedQuestion, editedSolution);
  };

  const handleNext = () => {
      onSave(editedQuestion, editedSolution);
      onNext?.();
  };

  const handlePrevious = () => {
      onSave(editedQuestion, editedSolution);
      onPrevious?.();
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

  // Helper to find topics for the current chapter
  const availableTopics = useMemo(() => {
      const chapterCode = editedQuestion.tag_2;
      if (!chapterCode) return null;

      // Search for the chapter in all subjects
      for (const subject of Object.values(chaptersData)) {
          const chapter = (subject as any[]).find((c: any) => c.code === chapterCode);
          if (chapter && chapter.topics) {
              return chapter.topics as Record<string, string>; // { "1": "Topic Name", "2": "..." }
          }
      }
      return null;
  }, [editedQuestion.tag_2]);

  // Helper to parse topic_tags (assuming it's a JSON array string e.g., '["1"]')
  const currentTopicId = useMemo(() => {
      try {
          if (!editedQuestion.topic_tags) return '';
          const parsed = JSON.parse(editedQuestion.topic_tags);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : '';
      } catch (e) {
          // Fallback if not JSON or just a raw string
          return editedQuestion.topic_tags || '';
      }
  }, [editedQuestion.topic_tags]);

  const handleTopicChange = (topicId: string) => {
      // Store as JSON array string containing the single ID
      const newValue = topicId ? JSON.stringify([topicId]) : null;
      handleQuestionChange('topic_tags', newValue);
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
        <section className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-main dark:text-white">Editing Interface</h2>
            </div>
            {/* Reduced padding and spacing */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Section: Question Text */}
                <div className="space-y-3">
                    <label className="block text-sm font-semibold text-text-main dark:text-gray-200">Question Statement</label>
                    <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                        <textarea
                            className="w-full p-4 min-h-[120px] bg-transparent border-none focus:ring-0 outline-none text-text-main dark:text-gray-200 text-sm leading-relaxed resize-y"
                            placeholder="Type your question here... Use LaTeX for math like $x^2$."
                            value={editedQuestion.question}
                            onChange={(e) => handleQuestionChange('question', e.target.value)}
                        />
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
                         {showOptions && (
                            <span className="text-xs text-text-secondary">Select the radio button for the correct answer</span>
                        )}
                    </div>

                    {showOptions ? (
                        <div className="space-y-3">
                            {(['a', 'b', 'c', 'd'] as const).map(opt => {
                                const isChecked = editedQuestion.answer === opt.toUpperCase();
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
                                            <div className="flex w-full">
                                                <div className={`w-10 flex-shrink-0 flex items-center justify-center border border-r-0 rounded-l-lg font-semibold text-sm ${isChecked ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-white/5 border-border-light dark:border-border-dark text-text-secondary'}`}>
                                                    {opt.toUpperCase()}
                                                </div>
                                                <input
                                                    className={`flex-1 min-w-0 px-4 py-2.5 bg-white dark:bg-[#1e1e2d] border border-l-0 rounded-r-lg focus:ring-2 focus:ring-primary/20 text-sm text-gray-900 dark:text-gray-100 transition-all ${isChecked ? 'border-primary font-medium' : 'border-border-light dark:border-border-dark focus:border-primary'}`}
                                                    placeholder={`Option ${opt.toUpperCase()} text`}
                                                    type="text"
                                                    value={editedQuestion[`option_${opt}`] || ''}
                                                    onChange={(e) => handleQuestionChange(`option_${opt}`, e.target.value)}
                                                />
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
                    <label className="block text-sm font-semibold text-text-main dark:text-gray-200">Detailed Solution</label>
                    <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                        <textarea
                            className="w-full p-4 min-h-[100px] bg-transparent border-none focus:ring-0 text-text-main dark:text-gray-200 text-sm leading-relaxed resize-y"
                            placeholder="Explain the logic behind the correct answer..."
                            value={editedSolution?.solution_text || ''}
                            onChange={(e) => handleSolutionChange('solution_text', e.target.value)}
                        />
                    </div>
                    <ImageUpload
                        label="Solution Image"
                        imageUrl={editedSolution?.solution_image_url || null}
                        onImageUrlChange={(url) => handleSolutionChange('solution_image_url', url)}
                    />
                </div>

                {/* Section: Legacy Images */}
                <div className="space-y-3">
                    <label className="block text-sm font-semibold text-text-main dark:text-gray-200">Legacy Images</label>
                    <div className="p-4 border border-border-light dark:border-border-dark rounded-lg bg-gray-50 dark:bg-white/5 text-center text-text-secondary text-sm">
                        Legacy image functionality coming soon.
                    </div>
                </div>

                {/* Section: Properties (Metadata) */}
                <div className="pt-6 border-t border-border-light dark:border-border-dark">
                    <h4 className="text-base font-bold text-text-main dark:text-white mb-4">Properties</h4>

                    {/* New Metadata Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Chapter Code (Moved from Legacy) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Chapter Code (Tag 2)</label>
                            <select
                                className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
                                value={editedQuestion.tag_2 || ''}
                                onChange={(e) => handleQuestionChange('tag_2', e.target.value)}
                            >
                                <option value="">Select Chapter</option>
                                {Object.entries(availableChapters).flatMap(([type, chapters]) =>
                                    chapters.map(chapter => (
                                        <option key={`${type}-${chapter}`} value={chapter}>
                                            {chapter}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* Difficulty (Moved from Legacy) */}
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
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Topic Selection</label>
                            {availableTopics ? (
                                <select
                                    className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
                                    value={currentTopicId}
                                    onChange={(e) => handleTopicChange(e.target.value)}
                                >
                                    <option value="">Select Topic</option>
                                    {Object.entries(availableTopics).map(([id, name]) => (
                                        <option key={id} value={id}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-sm text-text-secondary italic p-2 border border-border-light dark:border-border-dark rounded-lg bg-gray-50 dark:bg-white/5">
                                    {editedQuestion.tag_2 ? 'No specific topics available for this chapter.' : 'Please select a Chapter Code (Tag 2) above to see available topics.'}
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
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">JEE Mains Relevance (1-5)</label>
                            <input
                                className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
                                type="number"
                                min="1"
                                max="5"
                                value={editedQuestion.jee_mains_relevance || ''}
                                onChange={(e) => handleQuestionChange('jee_mains_relevance', parseInt(e.target.value) || null)}
                            />
                        </div>

                        {/* Verification Level 1 */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Verification Level 1</label>
                            <select
                                className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
                                value={editedQuestion.verification_level_1 || 'pending'}
                                onChange={(e) => handleQuestionChange('verification_level_1', e.target.value)}
                            >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
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

                        {/* Multi-Concept */}
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 mt-6">
                                <input
                                    type="checkbox"
                                    id="is_multi_concept"
                                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    checked={editedQuestion.is_multi_concept || false}
                                    onChange={(e) => handleQuestionChange('is_multi_concept', e.target.checked)}
                                />
                                <label htmlFor="is_multi_concept" className="text-sm font-medium text-text-main dark:text-white">Is Multi-Concept?</label>
                            </div>
                        </div>

                        {/* Related Concepts */}
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Related Concepts (JSON Array)</label>
                            <input
                                className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
                                placeholder='e.g. ["Gravity", "Motion"]'
                                type="text"
                                value={editedQuestion.related_concepts || ''}
                                onChange={(e) => handleQuestionChange('related_concepts', e.target.value)}
                            />
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
                    onClick={onCancel}
                    className="px-5 py-2.5 rounded-lg border border-border-light dark:border-border-dark text-text-secondary hover:text-text-main dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 text-sm font-semibold transition-all">
                    Cancel
                </button>
                <div className="flex gap-3">
                     {(onPrevious || onNext) && (
                        <div className="flex mr-2">
                             {onPrevious && (
                                <button
                                    onClick={handlePrevious}
                                    className="p-2.5 rounded-l-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-light text-text-secondary hover:text-text-main dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                    title="Previous Question (Auto-saves)"
                                >
                                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                </button>
                             )}
                             {onNext && (
                                <button
                                    onClick={handleNext}
                                    className="p-2.5 rounded-r-lg border border-l-0 border-border-light dark:border-border-dark bg-white dark:bg-surface-light text-text-secondary hover:text-text-main dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                    title="Next Question (Auto-saves)"
                                >
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </button>
                             )}
                        </div>
                     )}
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 rounded-lg bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/90 text-sm font-bold transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Save Changes
                    </button>
                </div>
            </div>
        </section>
    </main>
  );
};

export default QuestionEditor;
