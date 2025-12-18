import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Question,
  Chapter,
  SectionName,
  Difficulty
} from '../types';
import FilterMenu, { FilterState } from './FilterMenu';
import QuestionRow from './QuestionRow';
import chaptersData from '../data/chapters.json';

interface DatabaseCleaningProps {
  onStartEditing: (question: Question) => void;
  onClone: (question: Question) => void;
  scrollToQuestionUuid?: string | null;
  onScrollComplete?: () => void;
  refreshTrigger?: number;
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
  onStartEditing,
  onClone,
  scrollToQuestionUuid,
  onScrollComplete,
  refreshTrigger = 0
}) => {
  const [activeSection, setActiveSection] = useState<SectionName>('Physics');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [searchUuid, setSearchUuid] = useState('');
  const [filters, setFilters] = useState<FilterState>({ chapter: 'all', difficulty: 'all', division: 'all', type: 'all', year: 'all', tag1: '', tag4: '', sort: 'default', selectedOnly: false });

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleEdit = (e: React.MouseEvent, question: Question) => {
    e.stopPropagation();
    onStartEditing(question);
  };

  const handleClone = (e: React.MouseEvent, question: Question) => {
    e.stopPropagation();
    onClone(question);
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

  // Load chapters and questions for the active section
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const typeMap = { 'Physics': 'physics', 'Chemistry': 'chemistry', 'Mathematics': 'mathematics' };
        const normalizedType = typeMap[activeSection];

        // 1. Get all chapters from chapters.json
        // @ts-ignore
        const sectionChapters = chaptersData[activeSection] || [];

        const loadedChapters: Chapter[] = sectionChapters.map((ch: any) => ({
            code: ch.code,
            name: ch.name,
            level: ch.level
        }));
        setChapters(loadedChapters);

        const chapterCodes = loadedChapters.map(ch => ch.code);

        // 2. Get all questions for these chapters using the dedicated cleaner loader
        if (chapterCodes.length > 0) {
            const questions = await window.electronAPI.questions.getAllForSubject(chapterCodes);
            setAvailableQuestions(questions);
        } else {
            setAvailableQuestions([]);
        }

      } catch (error) {
        console.error('Failed to load questions:', error);
        setAvailableQuestions([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeSection, refreshTrigger]);

  const filteredQuestions = useMemo(() => {
    return availableQuestions
      .filter(q => {
        if (filters.chapter !== 'all' && q.tag_2 !== filters.chapter) return false;
        if (filters.difficulty !== 'all' && q.tag_3 !== filters.difficulty) return false;
        if (filters.division !== 'all') {
            if (filters.division === '1' && isNumericalAnswer(q)) return false;
            if (filters.division === '2' && !isNumericalAnswer(q)) return false;
        }
        if (filters.type !== 'all' && q.type !== filters.type) return false;
        if (filters.year !== 'all' && q.year !== filters.year) return false;
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
          <div className="bg-white dark:bg-[#1e1e2d] p-4 rounded-xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm flex flex-col h-full overflow-hidden">
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
              <FilterMenu chapters={chapters} availableTypes={availableTypes} availableYears={availableYears} currentFilters={filters} onFilterChange={handleFilterChange} />
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

              {loading ? <div className="text-center p-8">Loading...</div> :
                !loading && filteredQuestions.length === 0 ? <div className="text-center p-8">No questions found.</div> :
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
      </div>
    </div>
  );
};

export default DatabaseCleaning;
