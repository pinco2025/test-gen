import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Question,
  AlphaConstraint,
  BetaConstraint,
  SelectedQuestion,
  SectionName,
  Difficulty,
  SelectionSummary,
  Chapter
} from '../types';
import FilterMenu, { FilterState } from './FilterMenu';
import QuestionRow from './QuestionRow';

interface QuestionSelectionProps {
  sectionName: SectionName;
  chapters: Chapter[];
  alphaConstraint: AlphaConstraint;
  betaConstraint: BetaConstraint;
  onComplete: (selectedQuestions: SelectedQuestion[]) => void;
  onBack: () => void;
  onStartEditing: (question: Question) => void;
  onClone: (question: Question) => void;
  initialSelectedQuestions?: SelectedQuestion[];
  onChange?: (selectedQuestions: SelectedQuestion[]) => void;
  scrollToQuestionUuid?: string | null;
  onScrollComplete?: () => void;
  refreshTrigger?: number;
  // New props for Full Test constraints
  lockedChapterCode?: string;
  limitCount?: number;
  lockedDivision?: 1 | 2;
  onNextChapter?: (selectedQuestions: SelectedQuestion[]) => void; // Added for Full Test Flow
}

interface ItemData {
  questions: Question[];
  selectedUuids: Set<string>;
  onToggle: (question: Question) => void;
  onEdit: (e: React.MouseEvent, question: Question) => void;
  onClone: (e: React.MouseEvent, question: Question) => void;
  setSize: (index: number, size: number) => void;
  zoomLevel: number;
}

const isNumericalAnswer = (question: Question): boolean => !['A', 'B', 'C', 'D'].includes(question.answer.toUpperCase().trim());

const Row = ({ index, style, data }: ListChildComponentProps<ItemData>) => {
  const { questions, selectedUuids, onToggle, onEdit, onClone, setSize, zoomLevel } = data;
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
          selected={selectedUuids.has(question.uuid)}
          isDivision2Question={isNumericalAnswer(question)}
          onToggle={onToggle}
          onEdit={onEdit}
          onClone={onClone}
          highlightCorrectAnswer={true}
          zoomLevel={zoomLevel}
        />
      </div>
    </div>
  );
};

export const QuestionSelection: React.FC<QuestionSelectionProps> = ({
  sectionName,
  chapters,
  alphaConstraint,
  onComplete,
  onBack,
  onStartEditing,
  onClone,
  initialSelectedQuestions = [],
  onChange,
  scrollToQuestionUuid,
  onScrollComplete,
  refreshTrigger = 0,
  lockedChapterCode,
  limitCount,
  lockedDivision,
  onNextChapter
}) => {
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>(initialSelectedQuestions);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [searchUuid, setSearchUuid] = useState('');
  const [filters, setFilters] = useState<FilterState>({
      chapter: 'all', difficulty: 'all', division: 'all', type: 'all', year: 'all', tag1: '', tag4: '', sort: 'default', selectedOnly: false,
      verificationLevel1: 'all', verificationLevel2: 'all'
  });

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

  useEffect(() => {
    onChange?.(selectedQuestions);
  }, [selectedQuestions, onChange]);

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
  }, [filters, searchText, searchUuid]);

  useEffect(() => {
    sizeMap.current = {};
    listRef.current?.resetAfterIndex(0);
  }, [zoomLevel]);

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      try {
        // If locked to a single chapter, only fetch that one (optimization)
        const chapterCodes = lockedChapterCode ? [lockedChapterCode] : chapters.map(ch => ch.code);
        const typeMap = { 'Physics': 'physics', 'Chemistry': 'chemistry', 'Mathematics': 'mathematics' };
        const questions = await window.electronAPI.questions.getByChapterCodes(typeMap[sectionName] as any, chapterCodes);
        setAvailableQuestions(questions);
      } catch (error) {
        console.error('Failed to load questions:', error);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [sectionName, chapters, refreshTrigger, lockedChapterCode]);

  // Apply locked filters & presets
  useEffect(() => {
    if (lockedChapterCode) {
        // Full Test Preset: PYQ type, Year Descending Sort
        setFilters(prev => ({
             ...prev,
             chapter: lockedChapterCode,
             type: 'PYQ',
             sort: 'year_desc'
        }));
    }
    if (lockedDivision) {
        setFilters(prev => ({ ...prev, division: lockedDivision.toString() as '1' | '2' }));
    }
  }, [lockedChapterCode, lockedDivision]);

  const selectedUuids = useMemo(() => new Set(selectedQuestions.map(sq => sq.question.uuid)), [selectedQuestions]);

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
        if (filters.selectedOnly && !selectedUuids.has(q.uuid)) return false;
        if (filters.verificationLevel1 !== 'all' && (q.verification_level_1 || 'pending') !== filters.verificationLevel1) return false;
        if (filters.verificationLevel2 !== 'all' && (q.verification_level_2 || 'pending') !== filters.verificationLevel2) return false;
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
  }, [availableQuestions, filters, searchText, searchUuid, selectedUuids]);

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

  const summary = useMemo((): SelectionSummary => {
    let div1Count = 0, div2Count = 0;
    const byChapter: SelectionSummary['byChapter'] = {};
    alphaConstraint.chapters.forEach(ch => {
      byChapter[ch.chapterCode] = {
        chapterName: ch.chapterName,
        a: 0,
        b: 0,
        e: 0,
        m: 0,
        h: 0,
        required_a: ch.a,
        required_b: ch.b,
        required_e: ch.e,
        required_m: ch.m,
        required_h: ch.h
      };
    });
    selectedQuestions.forEach(sq => {
      if (sq.division === 1) div1Count++; else div2Count++;
      if (byChapter[sq.chapterCode]) {
        if (sq.division === 1) byChapter[sq.chapterCode].a++; else byChapter[sq.chapterCode].b++;
        // Track difficulty
        if (sq.difficulty === 'E') byChapter[sq.chapterCode].e++;
        else if (sq.difficulty === 'M') byChapter[sq.chapterCode].m++;
        else if (sq.difficulty === 'H') byChapter[sq.chapterCode].h++;
      }
    });
    return { total: selectedQuestions.length, division1: div1Count, division2: div2Count, byChapter, byDifficulty: { easy: 0, medium: 0, hard: 0, required_e: 0, required_m: 0, required_h: 0 } };
  }, [selectedQuestions, alphaConstraint]);

  const toggleQuestion = useCallback(async (question: Question) => {
    const isSelected = selectedUuids.has(question.uuid);

    // Check Full Test Constraint
    if (!isSelected && limitCount !== undefined && lockedChapterCode) {
        // Count currently selected for this chapter
        const currentCount = selectedQuestions.filter(sq => sq.chapterCode === lockedChapterCode).length;
        if (currentCount >= limitCount) {
             alert(`You have already selected ${currentCount}/${limitCount} questions for this chapter.`);
             return;
        }
    }

    // Check Part Test Division Limits (Legacy logic)
    const isDiv2 = isNumericalAnswer(question);
    if (limitCount === undefined) { // Only enforce Part Test limits if not in Full Test mode (where limitCount is set)
        if (!isSelected && ((isDiv2 && summary.division2 >= 5) || (!isDiv2 && summary.division1 >= 20))) return;
    }

    if (isSelected) {
      await window.electronAPI.questions.decrementFrequency(question.uuid);
      setSelectedQuestions(prev => prev.filter(sq => sq.question.uuid !== question.uuid));
    } else {
      await window.electronAPI.questions.incrementFrequency(question.uuid);
      const chapter = chapters.find(ch => ch.code === question.tag_2);
      setSelectedQuestions(prev => [...prev, { question, chapterCode: question.tag_2 || '', chapterName: chapter?.name || '', difficulty: (question.tag_3 as Difficulty) || 'M', division: isDiv2 ? 2 : 1, status: 'pending' }]);
    }
  }, [selectedUuids, summary, chapters, limitCount, lockedChapterCode, selectedQuestions]);

  const isSelectionValid = useMemo(() => {
      // Full Test Validation
      if (limitCount !== undefined && lockedChapterCode) {
           const currentCount = selectedQuestions.filter(sq => sq.chapterCode === lockedChapterCode).length;
           return currentCount === limitCount;
      }
      // Part Test Validation
      return summary.division1 === 20 && summary.division2 === 5;
  }, [summary, limitCount, lockedChapterCode, selectedQuestions]);

  const itemData = useMemo(() => ({
    questions: filteredQuestions,
    selectedUuids,
    onToggle: toggleQuestion,
    onEdit: handleEdit,
    onClone: handleClone,
    setSize,
    zoomLevel
  }), [filteredQuestions, selectedUuids, toggleQuestion, handleEdit, handleClone, setSize, zoomLevel]);

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      const newZoom = direction === 'in' ? prev + 0.1 : prev - 0.1;
      return Math.max(0.5, Math.min(1.5, newZoom));
    });
  };

  const scrollToTop = () => listRef.current?.scrollToItem(0);
  const scrollToBottom = () => listRef.current?.scrollToItem(filteredQuestions.length - 1);

  // Implementation using a ref to track the last navigated index
  const lastNavigatedIndex = useRef<number>(-1);

  const handleScrollToNextSelected = () => {
    const selectedIndices = filteredQuestions
      .map((q, idx) => selectedUuids.has(q.uuid) ? idx : -1)
      .filter(idx => idx !== -1);

    if (selectedIndices.length === 0) return;

    // Find the first index greater than lastNavigatedIndex
    let nextIndex = selectedIndices.find(idx => idx > lastNavigatedIndex.current);

    // If not found (wrap around), go to first
    if (nextIndex === undefined) {
      nextIndex = selectedIndices[0];
    }

    lastNavigatedIndex.current = nextIndex;
    listRef.current?.scrollToItem(nextIndex, 'center');
  };

  const handleScrollToPrevSelected = () => {
    const selectedIndices = filteredQuestions
      .map((q, idx) => selectedUuids.has(q.uuid) ? idx : -1)
      .filter(idx => idx !== -1);

    if (selectedIndices.length === 0) return;

    // Find the last index less than lastNavigatedIndex
    // Reverse logic
    let prevIndex = [...selectedIndices].reverse().find(idx => idx < lastNavigatedIndex.current);

    if (prevIndex === undefined) {
      prevIndex = selectedIndices[selectedIndices.length - 1];
    }

    lastNavigatedIndex.current = prevIndex;
    listRef.current?.scrollToItem(prevIndex, 'center');
  };

  // Determine hidden filters based on locking
  const hiddenFilters = useMemo(() => {
      const hidden: string[] = [];
      if (lockedChapterCode) hidden.push('chapter');
      if (lockedDivision) hidden.push('division');
      return hidden;
  }, [lockedChapterCode, lockedDivision]);

  // Default filters for preset (used for Reset button)
  const defaultFilters = useMemo(() => {
      if (lockedChapterCode) {
          const defaults: Partial<FilterState> = { type: 'PYQ', sort: 'year_desc', chapter: lockedChapterCode };
          if (lockedDivision) defaults.division = lockedDivision.toString();
          return defaults;
      }
      return {};
  }, [lockedChapterCode, lockedDivision]);

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 pb-0">
        <div className="bg-white dark:bg-[#1e1e2d] p-4 rounded-xl mb-4 border border-gray-200 dark:border-[#2d2d3b] shadow-sm flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="material-symbols-outlined">{sectionName === 'Physics' ? 'science' : sectionName === 'Chemistry' ? 'biotech' : 'calculate'}</span>
          {sectionName} - Question Selection
        </h2>
        <div className="flex gap-2 text-sm font-semibold">
          {limitCount !== undefined && lockedChapterCode ? (
             // Full Test Header
             <span className={`px-3 py-1 rounded-full ${selectedQuestions.filter(sq => sq.chapterCode === lockedChapterCode).length === limitCount ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                Selected: {selectedQuestions.filter(sq => sq.chapterCode === lockedChapterCode).length} / {limitCount}
             </span>
          ) : (
            // Part Test Header
            <>
              <span className={`px-3 py-1 rounded-full ${summary.division1 === 20 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>Div 1: {summary.division1}/20</span>
              <span className={`px-3 py-1 rounded-full ${summary.division2 === 5 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>Div 2: {summary.division2}/5</span>
              <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">Total: {summary.total}/25</span>
            </>
          )}
        </div>
      </div>
      </div>

      {/* Main Content Area - INCREASED HEIGHT WITH SCROLLBAR */}
      <div className="flex-1 px-4 pb-4" style={{ minHeight: '1000px' }}>
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: '1000px' }}>
        {/* Left Sidebar: Constraints or Status Panel */}
        <div className="col-span-3 h-full overflow-hidden flex flex-col">
          {limitCount !== undefined && lockedChapterCode ? (
               // Full Test Status Panel
               <div className="bg-white dark:bg-[#1e1e2d] p-4 rounded-xl border-2 border-gray-300 dark:border-[#2d2d3b] shadow-md h-full overflow-hidden flex flex-col">
                    <h3 className="flex-shrink-0 font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                        <span className="material-symbols-outlined text-lg">fact_check</span>Status
                    </h3>
                    <div className="flex-1 overflow-y-auto">
                        <div className="mb-6">
                            <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Target Chapter</h4>
                            <p className="text-xl font-bold text-primary">{lockedChapterCode}</p>
                             <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                Required Questions: <span className="font-bold">{limitCount}</span>
                            </div>
                        </div>

                        <div className="mb-6">
                             <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Selection Progress</h4>
                             <div className="flex items-end gap-2 mb-1">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {selectedQuestions.filter(sq => sq.chapterCode === lockedChapterCode).length}
                                </span>
                                <span className="text-gray-500 mb-1">/ {limitCount}</span>
                             </div>
                             <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ease-out ${selectedQuestions.filter(sq => sq.chapterCode === lockedChapterCode).length === limitCount ? 'bg-green-500' : 'bg-primary'}`}
                                    style={{ width: `${(selectedQuestions.filter(sq => sq.chapterCode === lockedChapterCode).length / limitCount) * 100}%` }}
                                />
                             </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Topic Breakdown</h4>
                            <div className="space-y-2">
                                {Array.from(new Set(filteredQuestions.filter(q => selectedUuids.has(q.uuid)).flatMap(q => {
                                    if (!q.topic_tags) return ['Unspecified'];
                                    try {
                                        const tags = JSON.parse(q.topic_tags);
                                        return Array.isArray(tags) && tags.length > 0 ? tags : ['Unspecified'];
                                    } catch {
                                        // If it's a plain string, use it. If malformed JSON, treat as Unspecified.
                                        return typeof q.topic_tags === 'string' && q.topic_tags.trim() !== '' ? [q.topic_tags] : ['Unspecified'];
                                    }
                                }))).map(topicIdOrName => {
                                    // Resolve Topic Name from ID if possible
                                    const currentChapter = chapters.find(c => c.code === lockedChapterCode);
                                    const topicName = currentChapter?.topics?.[topicIdOrName] || topicIdOrName;

                                    const count = filteredQuestions.filter(q => {
                                        if (!selectedUuids.has(q.uuid)) return false;
                                        if (!q.topic_tags) return topicIdOrName === 'Unspecified';

                                        let tags: string[] = [];
                                        try {
                                            const parsed = JSON.parse(q.topic_tags);
                                            tags = Array.isArray(parsed) && parsed.length > 0 ? parsed : ['Unspecified'];
                                        } catch {
                                            tags = typeof q.topic_tags === 'string' && q.topic_tags.trim() !== '' ? [q.topic_tags] : ['Unspecified'];
                                        }
                                        return tags.includes(topicIdOrName);
                                    }).length;

                                    return (
                                        <div key={topicIdOrName} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-[#252535] rounded-lg">
                                            <span className="truncate max-w-[150px]" title={topicName}>{topicName}</span>
                                            <span className="font-bold bg-white dark:bg-[#1e1e2d] px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">{count}</span>
                                        </div>
                                    )
                                })}
                                {selectedQuestions.filter(sq => sq.chapterCode === lockedChapterCode).length === 0 && (
                                    <p className="text-sm text-gray-400 italic">No questions selected yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
               </div>
          ) : (
            // Existing Part Test Constraints
            <div className="bg-white dark:bg-[#1e1e2d] p-4 rounded-xl border-2 border-gray-300 dark:border-[#2d2d3b] shadow-md h-full overflow-hidden flex flex-col">
                <h3 className="flex-shrink-0 font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white"><span className="material-symbols-outlined text-lg">tune</span>Constraints</h3>
                <div className="flex-1 overflow-y-auto text-xs">
                <h4 className="font-bold uppercase text-gray-600 dark:text-gray-400 mb-2">By Chapter</h4>
                <table className="w-full text-gray-900 dark:text-white border-collapse">
                    <thead className="sticky top-0 bg-white dark:bg-[#1e1e2d] z-10">
                    <tr className="border-b-2 border-gray-300 dark:border-[#2d2d3b]">
                        <th className="text-left py-2 pr-2 font-bold">Chapter</th>
                        <th className="text-center py-2 px-1 font-bold">A</th>
                        <th className="text-center py-2 px-1 font-bold">B</th>
                        <th className="text-center py-2 px-1 font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300">E</th>
                        <th className="text-center py-2 px-1 font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300">M</th>
                        <th className="text-center py-2 px-1 font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300">H</th>
                    </tr>
                    </thead>
                    <tbody>
                    {Object.entries(summary.byChapter).map(([code, counts]) => (
                        <tr key={code} className="border-t border-gray-200 dark:border-[#2d2d3b] hover:bg-gray-50 dark:hover:bg-[#252535] transition-colors">
                        <td className="py-2 pr-2 font-medium truncate max-w-[80px]" title={counts.chapterName}>{code}</td>
                        <td className={`text-center py-2 px-1 font-semibold ${counts.a === counts.required_a ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{counts.a}/{counts.required_a}</td>
                        <td className={`text-center py-2 px-1 font-semibold ${counts.b === counts.required_b ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{counts.b}/{counts.required_b}</td>
                        <td className={`text-center py-2 px-1 font-bold bg-blue-50/30 dark:bg-blue-900/10 ${counts.e === counts.required_e ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{counts.e}/{counts.required_e}</td>
                        <td className={`text-center py-2 px-1 font-bold bg-blue-50/30 dark:bg-blue-900/10 ${counts.m === counts.required_m ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{counts.m}/{counts.required_m}</td>
                        <td className={`text-center py-2 px-1 font-bold bg-blue-50/30 dark:bg-blue-900/10 ${counts.h === counts.required_h ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{counts.h}/{counts.required_h}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
          )}
        </div>

        {/* Right Panel: Questions */}
        <div className="col-span-9 h-full flex flex-col">
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
              <FilterMenu
                chapters={chapters}
                availableTypes={availableTypes}
                availableYears={availableYears}
                currentFilters={filters}
                onFilterChange={handleFilterChange}
                hiddenFilters={hiddenFilters}
                defaultFilters={defaultFilters}
              />
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
                   <div className="h-px bg-gray-200 dark:bg-[#2d2d3b] my-1"></div>
                  <button onClick={handleScrollToPrevSelected} title="Previous Selected" className="bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-full size-8 flex items-center justify-center shadow-md hover:bg-gray-100 dark:hover:bg-[#252535] text-gray-900 dark:text-white transition-all">
                      <span className="material-symbols-outlined">keyboard_arrow_up</span>
                  </button>
                  <button onClick={handleScrollToNextSelected} title="Next Selected" className="bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-full size-8 flex items-center justify-center shadow-md hover:bg-gray-100 dark:hover:bg-[#252535] text-gray-900 dark:text-white transition-all">
                      <span className="material-symbols-outlined">keyboard_arrow_down</span>
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
      </div>

      {/* Footer - Always visible at bottom */}
      <div className="flex-shrink-0 p-4 pt-4 border-t border-gray-200 dark:border-[#2d2d3b] flex justify-between bg-gray-50 dark:bg-[#121121] sticky bottom-0 z-10">
        <button onClick={onBack} className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-[#2d2d3b] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252535] font-semibold transition-all">Back</button>
        {onNextChapter && lockedChapterCode ? (
            // Full Test Next Chapter Button
            <button
                onClick={() => onNextChapter(selectedQuestions)}
                disabled={!isSelectionValid}
                className="px-6 py-2.5 rounded-lg bg-primary text-white disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold hover:bg-primary/90 transition-all shadow-md disabled:shadow-none flex items-center gap-2"
            >
                {isSelectionValid ? (
                     <>
                        Next Chapter
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                     </>
                ) : (
                    `Need ${limitCount} questions`
                )}
            </button>
        ) : (
            // Existing Continue Button
            <button onClick={() => onComplete(selectedQuestions)} disabled={!isSelectionValid} className="px-6 py-2.5 rounded-lg bg-primary text-white disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold hover:bg-primary/90 transition-all shadow-md disabled:shadow-none">
                {isSelectionValid ? 'Continue' : (limitCount ? `Need ${limitCount} questions` : `Need ${20 - summary.division1} for Div1, ${5 - summary.division2} for Div2`)}
            </button>
        )}
      </div>
    </div>
  );
};

export default QuestionSelection;
