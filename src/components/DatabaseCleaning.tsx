import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Question,
  Chapter,
  SectionName,
  Solution
} from '../types';
import FilterMenu, { FilterState } from './FilterMenu';
import QuestionRow from './QuestionRow';
import QuestionEditor from './QuestionEditor';
import { useNotification } from './Notification';

interface DatabaseCleaningProps {
  onStartEditing: (question: Question) => void;
  onClone: (question: Question) => void;
  scrollToQuestionUuid?: string | null;
  onScrollComplete?: () => void;
  refreshTrigger?: number;
  chaptersPath?: string | null;
}

interface ItemData {
  questions: Question[];
  onEdit: (e: React.MouseEvent, question: Question) => void;
  onClone: (e: React.MouseEvent, question: Question) => void;
  setSize: (index: number, size: number) => void;
  zoomLevel: number;
}

const isNumericalAnswer = (question: Question): boolean => !['A', 'B', 'C', 'D'].includes(question.answer.toUpperCase().trim());

const Row = ({ index, style, data }: ListChildComponentProps<ItemData>) => {
  const { questions, onEdit, onClone, setSize, zoomLevel } = data;
  const question = questions[index];
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = rowRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize(index, element.getBoundingClientRect().height));
    observer.observe(element);
    return () => observer.disconnect();
  }, [setSize, index]);

  return (
    <div style={style}>
      <div ref={rowRef}>
        <QuestionRow
          question={question}
          index={index}
          selected={false}
          isDivision2Question={isNumericalAnswer(question)}
          onToggle={() => {}} // No toggle functionality
          onEdit={onEdit}
          onClone={onClone}
          highlightCorrectAnswer={true}
          zoomLevel={zoomLevel}
        />
      </div>
    </div>
  );
};

export const DatabaseCleaning: React.FC<DatabaseCleaningProps> = ({
  scrollToQuestionUuid,
  onScrollComplete,
  refreshTrigger = 0,
  chaptersPath
}) => {
  const { addNotification } = useNotification();
  const [activeSection, setActiveSection] = useState<SectionName>('Physics');
  const [activeChapterCode, setActiveChapterCode] = useState<string | null>(null);
  const [chaptersData, setChaptersData] = useState<any>({});
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchUuid, setSearchUuid] = useState('');
  const [filters, setFilters] = useState<FilterState>({
      chapter: 'all', difficulty: 'all', division: 'all', type: 'all', year: 'all', tag1: '', tag4: '', sort: 'default', selectedOnly: false,
      verificationLevel1: 'all', verificationLevel2: 'all'
  });

  // Local editing state
  const [editingQuestion, setEditingQuestion] = useState<{ question: Question, solution?: Solution } | null>(null);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleEdit = (e: React.MouseEvent, question: Question) => {
    e.stopPropagation();
    setEditingQuestion({ question });
  };

  const handleClone = (e: React.MouseEvent, question: Question) => {
    e.stopPropagation();
    const clonedQuestion = {
      ...question,
      uuid: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      frequency: 0,
    };
    setEditingQuestion({ question: clonedQuestion });
  };

  const listRef = useRef<List>(null);
  const sizeMap = useRef<{ [index: number]: number }>({});
  const setSize = useCallback((index: number, size: number) => {
    if (sizeMap.current[index] !== size) {
      sizeMap.current[index] = size;
      listRef.current?.resetAfterIndex(index);
    }
  }, []);
  const getSize = useCallback((index: number) => sizeMap.current[index] || 500, []);

  const { availableTypes, availableYears } = useMemo(() => {
    const types = new Set<string>();
    const years = new Set<string>();
    availableQuestions.forEach(q => {
      if (q.type) types.add(q.type);
      if (q.year) years.add(q.year);
    });
    return { availableTypes: Array.from(types).sort(), availableYears: Array.from(years).sort().reverse() };
  }, [availableQuestions]);

  useEffect(() => {
    sizeMap.current = {};
    listRef.current?.scrollTo(0);
  }, [filters, searchText, searchUuid, activeSection]);

  useEffect(() => {
    sizeMap.current = {};
    listRef.current?.resetAfterIndex(0);
  }, [zoomLevel]);

  // Load chapters data when component mounts or chaptersPath changes
  useEffect(() => {
    const loadChaptersData = async () => {
      if (window.electronAPI) {
        try {
          const data = await window.electronAPI.chapters.load();
          if (data) {
            setChaptersData(data);
          } else {
            // If load returns null (e.g. no file selected), clear data
            setChaptersData({});
          }
        } catch (error) {
          console.error("Failed to load chapters:", error);
          setChaptersData({});
        }
      }
    };
    loadChaptersData();
  }, [chaptersPath]);

  // Update chapters list when activeSection or chaptersData changes
  useEffect(() => {
    const sectionChapters = chaptersData[activeSection] || [];
    const loadedChapters: Chapter[] = Array.isArray(sectionChapters) ? sectionChapters.map((ch: any) => ({
        code: ch.code,
        name: ch.name,
        level: ch.level
    })) : [];
    setChapters(loadedChapters);
    setActiveChapterCode(null); // Reset chapter selection on subject change
  }, [activeSection, chaptersData]);


  // Load questions when activeChapterCode changes
  useEffect(() => {
    const loadQuestions = async () => {
      if (!activeChapterCode) {
        setAvailableQuestions([]);
        return;
      }

      setLoading(true);
      try {
        const questions = await window.electronAPI.questions.getAllForSubject([activeChapterCode]);
        setAvailableQuestions(questions);
      } catch (error) {
        console.error('Failed to load questions:', error);
        setAvailableQuestions([]);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [activeChapterCode, refreshTrigger]);

  const filteredQuestions = useMemo(() => {
    return availableQuestions
      .filter(q => {
        if (filters.difficulty !== 'all' && q.tag_3 !== filters.difficulty) return false;
        if (filters.division !== 'all') {
            if (filters.division === '1' && isNumericalAnswer(q)) return false;
            if (filters.division === '2' && !isNumericalAnswer(q)) return false;
        }
        if (filters.type !== 'all' && q.type !== filters.type) return false;
        if (filters.year !== 'all' && q.year !== filters.year) return false;
        if (filters.verificationLevel1 !== 'all' && (q.verification_level_1 || 'pending') !== filters.verificationLevel1) return false;
        if (filters.verificationLevel2 !== 'all' && (q.verification_level_2 || 'pending') !== filters.verificationLevel2) return false;
        if (searchText && !q.question.toLowerCase().includes(searchText.toLowerCase())) return false;
        if (searchUuid && !q.uuid.toLowerCase().includes(searchUuid.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case 'year_desc': return (b.year || '').localeCompare(a.year || '');
          case 'year_asc': return (a.year || '').localeCompare(b.year || '');
          case 'freq_desc': return (b.frequency || 0) - (a.frequency || 0);
          case 'freq_asc': return (a.frequency || 0) - (b.frequency || 0);
          default: return 0;
        }
      });
  }, [availableQuestions, filters, searchText, searchUuid]);

    // Scroll to edited question when returning from edit mode
    useEffect(() => {
        if (scrollToQuestionUuid && !loading && filteredQuestions.length > 0) {
          const questionIndex = filteredQuestions.findIndex(q => q.uuid === scrollToQuestionUuid);
          if (questionIndex !== -1) {
            // Small delay to ensure the list is fully rendered
            setTimeout(() => {
              listRef.current?.scrollToItem(questionIndex, 'center');
              onScrollComplete?.();
            }, 100);
          } else {
            // Question not found in filtered list (might be filtered out)
            onScrollComplete?.();
          }
        }
      }, [scrollToQuestionUuid, loading, filteredQuestions, onScrollComplete]);

  const itemData = useMemo(() => ({
    questions: filteredQuestions,
    onEdit: handleEdit,
    onClone: handleClone,
    setSize,
    zoomLevel
  }), [filteredQuestions, handleEdit, handleClone, setSize, zoomLevel]);

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      const newZoom = direction === 'in' ? prev + 0.1 : prev - 0.1;
      return Math.max(0.5, Math.min(1.5, newZoom));
    });
  };

  const scrollToTop = () => listRef.current?.scrollToItem(0);
  const scrollToBottom = () => listRef.current?.scrollToItem(filteredQuestions.length - 1);

  // Save functionality
  const handleSaveQuestion = async (updatedQuestion: Question, updatedSolution?: Solution) => {
    if (!window.electronAPI) return;

    try {
      // Check if it's a new question (clone) or update
      const existing = availableQuestions.find(q => q.uuid === updatedQuestion.uuid);
      let success = false;

      if (!existing && editingQuestion?.question.uuid === updatedQuestion.uuid) {
          // It's a new question (from clone)
          success = await window.electronAPI.questions.createQuestion(updatedQuestion);
      } else {
          success = await window.electronAPI.questions.updateQuestion(
            updatedQuestion.uuid,
            {
              question: updatedQuestion.question,
              question_image_url: updatedQuestion.question_image_url,
              option_a: updatedQuestion.option_a,
              option_a_image_url: updatedQuestion.option_a_image_url,
              option_b: updatedQuestion.option_b,
              option_b_image_url: updatedQuestion.option_b_image_url,
              option_c: updatedQuestion.option_c,
              option_c_image_url: updatedQuestion.option_c_image_url,
              option_d: updatedQuestion.option_d,
              option_d_image_url: updatedQuestion.option_d_image_url,
              answer: updatedQuestion.answer,
              type: updatedQuestion.type,
              year: updatedQuestion.year,
              tag_1: updatedQuestion.tag_1,
              tag_2: updatedQuestion.tag_2,
              tag_3: updatedQuestion.tag_3,
              tag_4: updatedQuestion.tag_4,
              topic_tags: updatedQuestion.topic_tags,
              importance_level: updatedQuestion.importance_level,
              verification_level_1: updatedQuestion.verification_level_1,
              verification_level_2: updatedQuestion.verification_level_2,
              jee_mains_relevance: updatedQuestion.jee_mains_relevance,
              is_multi_concept: updatedQuestion.is_multi_concept,
              related_concepts: updatedQuestion.related_concepts,
              updated_at: new Date().toISOString()
            }
          );
      }

      if (success) {
        // Save solution
        if (updatedSolution) {
           await window.electronAPI.questions.saveSolution(
             updatedQuestion.uuid,
             updatedSolution.solution_text || '',
             updatedSolution.solution_image_url || ''
           );
        }

        // Update local state
        setAvailableQuestions(prev => {
             const index = prev.findIndex(q => q.uuid === updatedQuestion.uuid);
             if (index !== -1) {
                 const newQuestions = [...prev];
                 newQuestions[index] = updatedQuestion;
                 return newQuestions;
             } else {
                 return [...prev, updatedQuestion];
             }
        });

        addNotification('success', 'Question saved successfully!');
      } else {
        addNotification('error', 'Failed to save question.');
      }
    } catch (error) {
      console.error(error);
      addNotification('error', 'An error occurred while saving.');
    }
  };

  // const handleFinishEditing = (updatedQuestion: Question | null, updatedSolution?: Solution) => {
  //     if (updatedQuestion) {
  //         handleSaveQuestion(updatedQuestion, updatedSolution);
  //     }
  //     setEditingQuestion(null);
  // };

  // Navigation logic
  const navigateQuestion = (direction: 'next' | 'prev') => {
      if (!editingQuestion) return;

      const currentUuid = editingQuestion.question.uuid;
      const currentIndex = filteredQuestions.findIndex(q => q.uuid === currentUuid);

      let nextIndex = -1;
      if (direction === 'next') {
          nextIndex = currentIndex + 1;
      } else {
          nextIndex = currentIndex - 1;
      }

      // Check bounds
      if (nextIndex >= 0 && nextIndex < filteredQuestions.length) {
          const nextQuestion = filteredQuestions[nextIndex];
          setEditingQuestion({ question: nextQuestion }); // Solution will be fetched by QuestionEditor
      } else {
          addNotification('info', direction === 'next' ? 'End of list reached.' : 'Start of list reached.');
      }
  };

  // Render Editor if active
  if (editingQuestion) {
      return (
          <QuestionEditor
              question={editingQuestion.question}
              solution={editingQuestion.solution}
              onSave={(q, s) => handleSaveQuestion(q, s)} // Just save, don't close
              onCancel={() => setEditingQuestion(null)}
              onNext={() => navigateQuestion('next')}
              onPrevious={() => navigateQuestion('prev')}
              subject={activeSection}
          />
      );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-[#121121]">
      {/* Subject Tabs */}
      <div className="flex-shrink-0 bg-white dark:bg-[#1e1e2d] border-b border-gray-200 dark:border-[#2d2d3b] px-6 py-0 sticky top-0 z-20 shadow-sm">
        <div className="flex gap-8">
            {['Physics', 'Chemistry', 'Mathematics'].map((subject) => (
                <button
                    key={subject}
                    onClick={() => setActiveSection(subject as SectionName)}
                    className={`py-4 font-semibold text-lg border-b-2 transition-all ${
                        activeSection === subject
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    {subject}
                </button>
            ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-6 py-6" style={{ minHeight: '0' }}>
        {!activeChapterCode ? (
             /* Chapter Selection Grid */
             <div className="bg-white dark:bg-[#1e1e2d] p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                 <h2 className="text-xl font-bold text-text-main dark:text-white mb-6">Select a Chapter</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {chapters.map((chapter) => (
                         <button
                             key={chapter.code}
                             onClick={() => setActiveChapterCode(chapter.code)}
                             className="p-4 rounded-lg border border-border-light dark:border-border-dark hover:border-primary dark:hover:border-primary hover:bg-blue-50 dark:hover:bg-primary/10 transition-all text-left group flex flex-col gap-2"
                         >
                             <div className="flex items-center justify-between w-full">
                                 <span className="font-semibold text-text-main dark:text-white group-hover:text-primary transition-colors line-clamp-2">{chapter.name}</span>
                                 <span className="text-xs font-mono text-text-secondary bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">{chapter.code}</span>
                             </div>
                             <div className="text-xs text-text-secondary">
                                 Level: {chapter.level}
                             </div>
                         </button>
                     ))}
                 </div>
                 {chapters.length === 0 && (
                     <div className="text-center py-12 text-text-secondary">No chapters found for this subject.</div>
                 )}
             </div>
        ) : (
          /* Question List View */
          <div className="bg-white dark:bg-[#1e1e2d] p-4 rounded-xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 mb-4 flex items-center gap-4">
                <button
                    onClick={() => setActiveChapterCode(null)}
                    className="flex items-center gap-2 text-text-secondary hover:text-text-main dark:hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    <span className="font-medium">Back to Chapters</span>
                </button>
                <div className="h-6 w-px bg-gray-200 dark:bg-[#2d2d3b]"></div>
                <h2 className="text-lg font-bold text-text-main dark:text-white">
                    {chapters.find(c => c.code === activeChapterCode)?.name || activeChapterCode}
                </h2>
            </div>

            {/* Search and Filters */}
            <div className="flex-shrink-0 flex gap-4 mb-4">
              <div className="relative flex-grow">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">search</span>
                <input type="text" placeholder="Search questions..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-full pl-11 pr-4 py-2 border border-gray-200 dark:border-[#2d2d3b] rounded-full bg-gray-50 dark:bg-[#252535] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
              </div>
              <div className="relative w-48">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">fingerprint</span>
                <input type="text" placeholder="UUID" value={searchUuid} onChange={(e) => setSearchUuid(e.target.value)} className="w-full pl-12 pr-4 py-2 border border-gray-200 dark:border-[#2d2d3b] rounded-full bg-gray-50 dark:bg-[#252535] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
              </div>
              <FilterMenu chapters={[]} availableTypes={availableTypes} availableYears={availableYears} currentFilters={filters} onFilterChange={handleFilterChange} />
            </div>

            {/* Questions List */}
            <div className="flex-1 relative questions-panel border-t border-gray-100 dark:border-[#2d2d3b] mt-1 pt-4">
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <button onClick={() => handleZoom('in')} className="bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-full size-8 flex items-center justify-center shadow-md hover:bg-gray-100 dark:hover:bg-[#252535] text-gray-900 dark:text-white transition-all">
                      <span className="material-symbols-outlined">add</span>
                  </button>
                  <button onClick={() => handleZoom('out')} className="bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-full size-8 flex items-center justify-center shadow-md hover:bg-gray-100 dark:hover:bg-[#252535] text-gray-900 dark:text-white transition-all">
                      <span className="material-symbols-outlined">remove</span>
                  </button>
                   <div className="h-px bg-gray-200 dark:bg-[#2d2d3b] my-1"></div>
                  <button onClick={scrollToTop} className="bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-full size-8 flex items-center justify-center shadow-md hover:bg-gray-100 dark:hover:bg-[#252535] text-gray-900 dark:text-white transition-all">
                      <span className="material-symbols-outlined">vertical_align_top</span>
                  </button>
                  <button onClick={scrollToBottom} className="bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-full size-8 flex items-center justify-center shadow-md hover:bg-gray-100 dark:hover:bg-[#252535] text-gray-900 dark:text-white transition-all">
                      <span className="material-symbols-outlined">vertical_align_bottom</span>
                  </button>
              </div>

              {loading ? <div className="text-center p-8">Loading questions for {activeChapterCode}...</div> :
                !loading && filteredQuestions.length === 0 ? <div className="text-center p-8">No questions found for this chapter.</div> :
                <AutoSizer>
                  {({ height, width }) => (
                    <List ref={listRef} height={height} width={width} itemCount={filteredQuestions.length} itemSize={getSize} itemData={itemData}>
                      {Row}
                    </List>
                  )}
                </AutoSizer>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseCleaning;
