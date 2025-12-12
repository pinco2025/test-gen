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
  initialSelectedQuestions?: SelectedQuestion[];
  onChange?: (selectedQuestions: SelectedQuestion[]) => void;
}

interface ItemData {
  questions: Question[];
  selectedUuids: Set<string>;
  onToggle: (question: Question) => void;
  onEdit: (e: React.MouseEvent, question: Question) => void;
  setSize: (index: number, size: number) => void;
  zoomLevel: number;
}

// Helper function to check if a question should go to Division 2 (B)
const isNumericalAnswer = (question: Question): boolean => {
  const answerUpper = question.answer.toUpperCase().trim();
  return !['A', 'B', 'C', 'D'].includes(answerUpper);
};

const Row = ({ index, style, data }: ListChildComponentProps<ItemData>) => {
  const { questions, selectedUuids, onToggle, onEdit, setSize, zoomLevel } = data;
  const question = questions[index];
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = rowRef.current;
    if (!element) return;

    // Initial measurement
    setSize(index, element.getBoundingClientRect().height);

    // Observer for changes
    const observer = new ResizeObserver(() => {
      setSize(index, element.getBoundingClientRect().height);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [setSize, index]);

  const isDivision2Question = isNumericalAnswer(question);
  const selected = selectedUuids.has(question.uuid);

  return (
    <div style={style}>
      <div ref={rowRef}>
        <QuestionRow
          question={question}
          index={index}
          selected={selected}
          isDivision2Question={isDivision2Question}
          onToggle={onToggle}
          onEdit={onEdit}
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
  initialSelectedQuestions = [],
  onChange
}) => {
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>(initialSelectedQuestions);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  
  const [filters, setFilters] = useState<FilterState>({
    chapter: 'all',
    difficulty: 'all',
    division: 'all',
    type: 'all',
    year: 'all',
    tag1: '',
    tag4: '',
    sort: 'default'
  });

  const handleEdit = (e: React.MouseEvent, question: Question) => {
    e.stopPropagation();
    onStartEditing(question);
  };

  // Sync selections to parent immediately when they change
  useEffect(() => {
    if (onChange) {
      onChange(selectedQuestions);
    }
  }, [selectedQuestions, onChange]);


  // Virtualization refs
  const listRef = useRef<List>(null);
  const sizeMap = useRef<{ [index: number]: number }>({});
  const setSize = useCallback((index: number, size: number) => {
    if (sizeMap.current[index] !== size) {
      sizeMap.current[index] = size;
      if (listRef.current) {
        listRef.current.resetAfterIndex(index);
      }
    }
  }, []);
  const getSize = useCallback((index: number) => sizeMap.current[index] || 300, []); // Default to 300

  // Extract unique Types and Years for filters
  const { availableTypes, availableYears } = useMemo(() => {
    const types = new Set<string>();
    const years = new Set<string>();
    availableQuestions.forEach(q => {
        if (q.type) types.add(q.type);
        if (q.year) years.add(q.year);
    });
    return {
        availableTypes: Array.from(types).sort(),
        availableYears: Array.from(years).sort().reverse()
    };
  }, [availableQuestions]);

  // Reset list scroll when filters change
  useEffect(() => {
    // Clear size map on filter change as indices mean different questions now
    sizeMap.current = {};
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }
  }, [filters, searchText]);

  // Reset size map when zoom changes
  useEffect(() => {
    sizeMap.current = {};
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [zoomLevel]);

  // Load questions based on selected chapters
  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      try {
        const chapterCodes = chapters.map(ch => ch.code);
        const typeMap: { [key in SectionName]: string } = {
          'Physics': 'physics',
          'Chemistry': 'chemistry',
          'Mathematics': 'mathematics'
        };

        const questions = await window.electronAPI.questions.getByChapterCodes(
          typeMap[sectionName],
          chapterCodes
        );

        setAvailableQuestions(questions);
      } catch (error) {
        console.error('Failed to load questions:', error);
        setAvailableQuestions([]);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [sectionName, chapters]);

  // Auto-correct existing selections: move numerical answers from Division 1 to Division 2
  useEffect(() => {
    let correctionsMade = false;
    const correctedSelections = selectedQuestions.map(sq => {
      // If this question has numerical answer but is in Division 1, move to Division 2
      if (isNumericalAnswer(sq.question) && sq.division === 1) {
        correctionsMade = true;
        return { ...sq, division: 2 as 1 | 2 };
      }
      return sq;
    });

    if (correctionsMade) {
      setSelectedQuestions(correctedSelections);
    }
  }, [selectedQuestions]);

  // Memoize summary calculation - only recompute when selectedQuestions or alphaConstraint changes
  const summary = useMemo((): SelectionSummary => {
    const byChapter: SelectionSummary['byChapter'] = {};
    let totalE = 0, totalM = 0, totalH = 0;
    let requiredE = 0, requiredM = 0, requiredH = 0;
    let div1Count = 0, div2Count = 0;

    // Initialize byChapter with alpha constraints
    alphaConstraint.chapters.forEach(ch => {
      byChapter[ch.chapterCode] = {
        chapterName: ch.chapterName,
        a: 0,
        b: 0,
        required_a: ch.a,
        required_b: ch.b
      };
      requiredE += ch.e;
      requiredM += ch.m;
      requiredH += ch.h;
    });

    // Count current selections - single pass
    selectedQuestions.forEach(sq => {
      if (byChapter[sq.chapterCode]) {
        if (sq.division === 1) {
          byChapter[sq.chapterCode].a++;
          div1Count++;
        } else {
          byChapter[sq.chapterCode].b++;
          div2Count++;
        }
      } else {
        // Question not in any tracked chapter
        if (sq.division === 1) div1Count++;
        else div2Count++;
      }

      if (sq.difficulty === 'E') totalE++;
      else if (sq.difficulty === 'M') totalM++;
      else if (sq.difficulty === 'H') totalH++;
    });

    return {
      total: selectedQuestions.length,
      division1: div1Count,
      division2: div2Count,
      byChapter,
      byDifficulty: {
        easy: totalE,
        medium: totalM,
        hard: totalH,
        required_e: requiredE,
        required_m: requiredM,
        required_h: requiredH
      }
    };
  }, [selectedQuestions, alphaConstraint]);

  // Create a Set for O(1) lookup of selected question UUIDs
  const selectedUuids = useMemo(() => {
    return new Set(selectedQuestions.map(sq => sq.question.uuid));
  }, [selectedQuestions]);

  // Memoize toggleQuestion to prevent recreation on every render
  const toggleQuestion = useCallback(async (question: Question) => {
    const isSelected = selectedUuids.has(question.uuid);
    const isDiv2 = isNumericalAnswer(question);

    // Check constraints before selecting
    if (!isSelected) {
        if (isDiv2) {
          if (summary.division2 >= 5) {
            // alert(`This question has numerical answer (${question.answer}) and can only be placed in Division 2 (B), which is already full (5/5).`);
            return;
          }
        } else {
          if (summary.division1 >= 20) {
            // alert(`Division 1 (A) is already full (20/20). Cannot select more Multiple Choice Questions.`);
            return;
          }
        }
    }

    if (isSelected) {
      // Deselecting - decrement frequency
      try {
        await window.electronAPI.questions.decrementFrequency(question.uuid);
        // Update the local question's frequency
        setAvailableQuestions(prev => prev.map(q =>
          q.uuid === question.uuid
            ? { ...q, frequency: Math.max((q.frequency || 0) - 1, 0) }
            : q
        ));
      } catch (error) {
        console.error('[FREQUENCY] Error decrementing frequency:', error);
      }
      setSelectedQuestions(prev =>
        prev.filter(sq => sq.question.uuid !== question.uuid)
      );
    } else {
      // Selecting - increment frequency
      const chapterCode = question.tag_2 || chapters[0]?.code || '';
      const chapter = chapters.find(ch => ch.code === chapterCode);
      const chapterName = chapter ? chapter.name : chapters[0]?.name || '';
      const difficulty: Difficulty = (question.tag_3 as Difficulty) || 'M';
      const division: 1 | 2 = isDiv2 ? 2 : 1;

      try {
        await window.electronAPI.questions.incrementFrequency(question.uuid);
        // Update the local question's frequency
        setAvailableQuestions(prev => prev.map(q =>
          q.uuid === question.uuid
            ? { ...q, frequency: (q.frequency || 0) + 1 }
            : q
        ));
      } catch (error) {
        console.error('[FREQUENCY] Error incrementing frequency:', error);
      }
      const newSelection: SelectedQuestion = {
        question,
        chapterCode,
        chapterName,
        difficulty,
        division,
        status: 'pending'
      };
      setSelectedQuestions(prev => [...prev, newSelection]);
    }
  }, [selectedUuids, summary.division1, summary.division2, chapters]);

  // Memoize filtered questions - only recompute when filters or data changes
  const filteredQuestions = useMemo(() => {
    const searchLower = searchText.toLowerCase();

    let result = availableQuestions.filter(q => {
      // Filter by chapter
      if (filters.chapter !== 'all' && q.tag_2 !== filters.chapter) {
        return false;
      }

      // Filter by difficulty
      if (filters.difficulty !== 'all' && q.tag_3 !== filters.difficulty) {
        return false;
      }

      // Filter by division type (numerical vs multiple choice)
      if (filters.division !== 'all') {
        const isDiv2Type = isNumericalAnswer(q);
        if (filters.division === '1' && isDiv2Type) return false;
        if (filters.division === '2' && !isDiv2Type) return false;
      }

      // Filter by Type
      if (filters.type !== 'all' && q.type !== filters.type) {
        return false;
      }

      // Filter by Year
      if (filters.year !== 'all' && q.year !== filters.year) {
        return false;
      }

      // Filter by Tag 1 (Partial Match)
      if (filters.tag1 && (!q.tag_1 || !q.tag_1.toLowerCase().includes(filters.tag1.toLowerCase()))) {
        return false;
      }

      // Filter by Tag 4 (Partial Match)
      if (filters.tag4 && (!q.tag_4 || !q.tag_4.toLowerCase().includes(filters.tag4.toLowerCase()))) {
        return false;
      }

      // Filter by search text
      if (searchText && !q.question.toLowerCase().includes(searchLower)) {
        return false;
      }

      return true;
    });

    // Apply Sorting
    if (filters.sort !== 'default') {
        result.sort((a, b) => {
            switch (filters.sort) {
                case 'year_desc':
                    return (b.year || '').localeCompare(a.year || '');
                case 'year_asc':
                    return (a.year || '').localeCompare(b.year || '');
                case 'freq_asc':
                    return (a.frequency || 0) - (b.frequency || 0);
                case 'freq_desc':
                    return (b.frequency || 0) - (a.frequency || 0);
                default:
                    return 0;
            }
        });
    }

    return result;
  }, [availableQuestions, filters, searchText]);

  // Memoize isSelectionValid
  const isSelectionValid = useMemo(() => {
    return summary.division1 === 20 && summary.division2 === 5;
  }, [summary.division1, summary.division2]);

  // Track visible range for scrolling logic
  const visibleRangeRef = useRef({ start: 0, stop: 0 });
  const onItemsRendered = ({ visibleStartIndex, visibleStopIndex }: { visibleStartIndex: number; visibleStopIndex: number }) => {
    visibleRangeRef.current = { start: visibleStartIndex, stop: visibleStopIndex };
  };

  // Navigation handlers
  const scrollToSelected = (direction: 'next' | 'prev') => {
    const selectedIndices = filteredQuestions
      .map((q, index) => selectedUuids.has(q.uuid) ? index : -1)
      .filter(index => index !== -1);

    if (selectedIndices.length === 0) return;

    const { start } = visibleRangeRef.current;
    let targetIndex = -1;

    if (direction === 'next') {
        // Find first selected index greater than current start (roughly)
        // If within view, go to next. If fully below, go to that.
        // Actually, let's find the first selected index AFTER the current visible stop.
        // Or if we are at the top, just the first one.
        
        // Simple logic: find first index > start + 1 (to skip top one if slightly visible)
        // But better: find first index > start.
        for (const idx of selectedIndices) {
            if (idx > start) {
                targetIndex = idx;
                break;
            }
        }
        // Wrap around
        if (targetIndex === -1) targetIndex = selectedIndices[0];
    } else {
        // Find last index < start
        for (let i = selectedIndices.length - 1; i >= 0; i--) {
            if (selectedIndices[i] < start) {
                targetIndex = selectedIndices[i];
                break;
            }
        }
        // Wrap around
        if (targetIndex === -1) targetIndex = selectedIndices[selectedIndices.length - 1];
    }

    if (targetIndex !== -1 && listRef.current) {
         listRef.current.scrollToItem(targetIndex, 'start');
    }
  };

  const scrollToList = (position: 'top' | 'bottom') => {
    if (listRef.current) {
      if (position === 'top') {
        listRef.current.scrollToItem(0);
      } else {
        // Scroll to the last item, aligning it to the end (bottom) of the container
        listRef.current.scrollToItem(filteredQuestions.length - 1, 'end');
      }
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 1.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  const itemData = useMemo(() => ({
      questions: filteredQuestions,
      selectedUuids,
      onToggle: toggleQuestion,
      onEdit: handleEdit,
      setSize,
      zoomLevel
  }), [filteredQuestions, selectedUuids, toggleQuestion, setSize, zoomLevel]);

  return (
    <div className="question-selection">
      <div className="selection-header">
        <h2>
          <span className="material-symbols-outlined" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>
            {sectionName === 'Physics' ? 'science' : sectionName === 'Chemistry' ? 'biotech' : 'calculate'}
          </span>
          {sectionName} - Question Selection
        </h2>
        <div className="selection-progress">
          <span className={summary.division1 === 20 ? 'valid' : 'invalid'}>
            Division 1: {summary.division1}/20
          </span>
          <span className={summary.division2 === 5 ? 'valid' : 'invalid'}>
            Division 2: {summary.division2}/5
          </span>
          <span>Total: {summary.total}/25</span>
        </div>
      </div>

      <div className="selection-layout">
        {/* Left Panel - Constraints Summary */}
        <div className="constraints-panel">
          <h3>
            <span className="material-symbols-outlined" style={{ marginRight: '0.375rem', fontSize: '1.125rem' }}>tune</span>
            Alpha Constraints
          </h3>

          <div className="constraint-section">
            <h4>By Chapter</h4>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>A</th>
                  <th>B</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.byChapter).map(([chapterCode, counts]) => (
                  <tr key={chapterCode}>
                    <td>
                      <span className="chapter-code-small">{chapterCode}</span>
                      {counts.chapterName}
                    </td>
                    <td className={counts.a === counts.required_a ? 'valid' : 'invalid'}>
                      {counts.a}/{counts.required_a}
                    </td>
                    <td className={counts.b === counts.required_b ? 'valid' : 'invalid'}>
                      {counts.b}/{counts.required_b}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="constraint-section">
            <h4>By Difficulty</h4>
            <div className="difficulty-summary">
              <div className={summary.byDifficulty.easy === summary.byDifficulty.required_e ? 'valid' : ''}>
                Easy: {summary.byDifficulty.easy}/{summary.byDifficulty.required_e}
              </div>
              <div className={summary.byDifficulty.medium === summary.byDifficulty.required_m ? 'valid' : ''}>
                Medium: {summary.byDifficulty.medium}/{summary.byDifficulty.required_m}
              </div>
              <div className={summary.byDifficulty.hard === summary.byDifficulty.required_h ? 'valid' : ''}>
                Hard: {summary.byDifficulty.hard}/{summary.byDifficulty.required_h}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Question List */}
        <div className="questions-panel" style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 220px)', /* Match constraints panel height */
          height: '100%',
          overflow: 'hidden'
        }}>

          {/* Filters moved to top */}
          <div className="filters" style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0, marginBottom: '1rem' }}>
             <div style={{ flex: 1, position: 'relative', marginRight: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    fontSize: '1.25rem'
                }}>search</span>
                <input
                type="text"
                placeholder="Search questions..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input"
                style={{
                    paddingLeft: '2.5rem',
                    width: '100%'
                }}
                />
            </div>

            <FilterMenu
                chapters={chapters}
                availableTypes={availableTypes}
                availableYears={availableYears}
                currentFilters={filters}
                onFilterChange={(newFilters) => {
                    setFilters(prev => ({ ...prev, ...newFilters }));
                }}
            />
          </div>

          <div
            className="question-list"
            style={{
                flex: 1, /* Fill remaining space */
                display: 'block',
                position: 'relative',
                width: '100%',
                boxSizing: 'border-box'
            }}
          >
            {loading && (
                 <div className="loading" style={{
                     position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10
                 }}>Loading questions...</div>
             )}

            {!loading && filteredQuestions.length === 0 ? (
              <div className="no-questions">
                No questions available. Please adjust filters or load a database.
              </div>
            ) : (
                !loading && (
                    <AutoSizer onResize={() => {
                        // Clear cached sizes when container width changes (e.g. window resize)
                        if (listRef.current) {
                            sizeMap.current = {};
                            listRef.current.resetAfterIndex(0);
                        }
                    }}>
                        {({ height, width }) => (
                            <List
                                ref={listRef}
                                height={height}
                                width={width}
                                itemCount={filteredQuestions.length}
                                itemSize={getSize}
                                itemData={itemData}
                                onItemsRendered={onItemsRendered}
                            >
                                {Row}
                            </List>
                        )}
                    </AutoSizer>
                )
            )}
          </div>

          {/* Floating Navigation Buttons - Fixed relative to panel */}
          <div style={{
            position: 'absolute',
            top: '80px', /* Adjusted for filters at top */
            right: '40px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            {/* Zoom Controls - Updated */}
            <div className="zoom-controls">
                <button
                onClick={handleZoomIn}
                className="zoom-btn"
                title="Zoom In"
                disabled={zoomLevel >= 1.5}
                >
                <span className="material-symbols-outlined">add</span>
                </button>
                <button
                onClick={handleZoomOut}
                className="zoom-btn"
                title="Zoom Out"
                disabled={zoomLevel <= 0.5}
                >
                <span className="material-symbols-outlined">remove</span>
                </button>
            </div>

            <button
              onClick={() => scrollToList('top')}
              className="zoom-btn float-nav-btn"
              style={{ background: 'var(--bg-card)', marginTop: '0.5rem' }}
              title="Scroll to Top"
            >
              <span className="material-symbols-outlined">vertical_align_top</span>
            </button>

            {selectedQuestions.length > 0 && (
              <>
                <button
                  onClick={() => scrollToSelected('prev')}
                  className="zoom-btn float-nav-btn"
                  style={{ background: 'var(--bg-card)' }}
                  title="Previous Selected"
                >
                  <span className="material-symbols-outlined">arrow_upward</span>
                </button>
                <button
                  onClick={() => scrollToSelected('next')}
                  className="zoom-btn float-nav-btn"
                  style={{ background: 'var(--bg-card)' }}
                  title="Next Selected"
                >
                  <span className="material-symbols-outlined">arrow_downward</span>
                </button>
              </>
            )}

            <button
              onClick={() => scrollToList('bottom')}
              className="zoom-btn float-nav-btn"
              style={{ background: 'var(--bg-card)' }}
              title="Scroll to Bottom"
            >
              <span className="material-symbols-outlined">vertical_align_bottom</span>
            </button>
          </div>

        </div>
      </div>

      <div className="selection-actions">
        <button className="btn-secondary" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Configuration
        </button>
        <button
          className="btn-primary"
          onClick={() => onComplete(selectedQuestions)}
          disabled={!isSelectionValid}
        >
          {isSelectionValid
            ? <>Continue to Next Section <span className="material-symbols-outlined">arrow_forward</span></>
            : `Need ${20 - summary.division1} more for Div1, ${5 - summary.division2} more for Div2`}
        </button>
      </div>

    </div>
  );
};

export default QuestionSelection;
