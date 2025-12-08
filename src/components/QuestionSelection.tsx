import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import QuestionDisplay from './QuestionDisplay';
import chaptersData from '../data/chapters.json';

interface QuestionSelectionProps {
  sectionName: SectionName;
  chapters: Chapter[];
  alphaConstraint: AlphaConstraint;
  betaConstraint: BetaConstraint;
  onComplete: (selectedQuestions: SelectedQuestion[]) => void;
  onBack: () => void;
  initialSelectedQuestions?: SelectedQuestion[];
  onChange?: (selectedQuestions: SelectedQuestion[]) => void;
}

// Edit modal state interface
interface EditModalState {
  isOpen: boolean;
  question: Question | null;
  difficulty: Difficulty;
  chapterCode: string;
}

// Helper function to check if a question should go to Division 2 (B)
const isNumericalAnswer = (question: Question): boolean => {
  const answerUpper = question.answer.toUpperCase().trim();
  return !['A', 'B', 'C', 'D'].includes(answerUpper);
};

// Memoized Question Row component
interface QuestionRowProps {
  question: Question;
  index: number;
  selected: boolean;
  isDivision2Question: boolean;
  summary: SelectionSummary;
  chapters: Chapter[];
  onToggle: (
    question: Question,
    chapterCode: string,
    chapterName: string,
    difficulty: Difficulty,
    division: 1 | 2
  ) => void;
  onEdit: (e: React.MouseEvent, question: Question) => void;
}

const QuestionRow = React.memo<QuestionRowProps>(({
  question,
  index,
  selected,
  isDivision2Question,
  summary,
  chapters,
  onToggle,
  onEdit
}) => {
  const handleClick = useCallback(() => {
    // If Division 2 question and Division 2 is full, prevent selection
    if (isDivision2Question && summary.division2 >= 5 && !selected) {
      alert(`This question has numerical answer (${question.answer}) and can only be placed in Division 2 (B), which is already full (5/5).`);
      return;
    }

    const chapterCode = question.tag_2 || chapters[0]?.code || '';
    const chapter = chapters.find(ch => ch.code === chapterCode);
    const chapterName = chapter ? chapter.name : chapters[0]?.name || '';
    const difficulty: Difficulty = (question.tag_3 as Difficulty) || 'M';
    const division: 1 | 2 = isDivision2Question ? 2 : (summary.division1 < 20 ? 1 : 2);

    onToggle(question, chapterCode, chapterName, difficulty, division);
  }, [question, isDivision2Question, summary.division2, summary.division1, selected, chapters, onToggle]);

  return (
    <div
      className="question-row-container"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '350px',
        marginBottom: '0.5rem',
        marginRight: '0.5rem'
      }}
    >
      <div
        className={`selectable-question ${selected ? 'selected' : ''}`}
        onClick={handleClick}
        style={{
          cursor: 'pointer',
          border: selected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          transition: 'border-color 0.15s, background-color 0.15s',
          backgroundColor: selected ? 'var(--primary-light)' : 'var(--bg-card-light)'
        }}
      >
        <div className="question-card-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.5rem'
        }}>
          <div style={{ flex: 1 }}>
            {isDivision2Question && (
              <div style={{
                background: 'var(--amber)',
                color: 'white',
                padding: '0.25rem 0.625rem',
                borderRadius: 'var(--radius)',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit_note</span>
                NUMERICAL ANSWER ({question.answer}) - Division 2 (B) Only
              </div>
            )}
          </div>
          <button
            className="question-edit-btn"
            onClick={(e) => onEdit(e, question)}
            title="Edit question properties"
            style={{
              background: 'var(--bg-light)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius)',
              padding: '0.375rem 0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary-light)',
              transition: 'var(--transition)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit</span>
            Edit
          </button>
        </div>
        <QuestionDisplay
          question={question}
          showAnswer={false}
          showCheckbox={false}
          isSelected={selected}
          hideOptions={isDivision2Question}
          questionNumber={index + 1}
        />
      </div>
    </div>
  );
});

QuestionRow.displayName = 'QuestionRow';

export const QuestionSelection: React.FC<QuestionSelectionProps> = ({
  sectionName,
  chapters,
  alphaConstraint,
  onComplete,
  onBack,
  initialSelectedQuestions = [],
  onChange
}) => {
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>(initialSelectedQuestions);

  // Edit modal state
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    question: null,
    difficulty: 'M',
    chapterCode: ''
  });

  // Get valid chapters for current section - memoized
  const validChaptersForSection = useMemo(() => {
    const sectionKey = sectionName as keyof typeof chaptersData;
    const sectionChapters = chaptersData[sectionKey] || [];
    return sectionChapters.map(ch => ({ code: ch.code, name: ch.name }));
  }, [sectionName]);

  // Open edit modal for a question
  const openEditModal = (e: React.MouseEvent, question: Question) => {
    e.stopPropagation(); // Prevent question selection
    setEditModal({
      isOpen: true,
      question,
      difficulty: (question.tag_3 as Difficulty) || 'M',
      chapterCode: question.tag_2 || ''
    });
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModal({
      isOpen: false,
      question: null,
      difficulty: 'M',
      chapterCode: ''
    });
  };

  // Save question edits to database
  const saveQuestionEdit = async () => {
    if (!editModal.question) return;

    try {
      // Update in database
      await window.electronAPI.questions.updateQuestion(editModal.question.uuid, {
        tag_3: editModal.difficulty,
        tag_2: editModal.chapterCode
      });

      // Update local state
      setAvailableQuestions(prev => prev.map(q =>
        q.uuid === editModal.question!.uuid
          ? { ...q, tag_3: editModal.difficulty, tag_2: editModal.chapterCode }
          : q
      ));

      // Update selected questions if this question is selected
      setSelectedQuestions(prev => prev.map(sq =>
        sq.question.uuid === editModal.question!.uuid
          ? {
              ...sq,
              question: { ...sq.question, tag_3: editModal.difficulty, tag_2: editModal.chapterCode },
              difficulty: editModal.difficulty,
              chapterCode: editModal.chapterCode,
              chapterName: validChaptersForSection.find(ch => ch.code === editModal.chapterCode)?.name || sq.chapterName
            }
          : sq
      ));

      closeEditModal();
    } catch (error) {
      console.error('[EDIT] Error saving question edit:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  // Sync selections to parent immediately when they change
  useEffect(() => {
    if (onChange) {
      onChange(selectedQuestions);
    }
  }, [selectedQuestions, onChange]);

  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChapter, setFilterChapter] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterDivision, setFilterDivision] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Refs for list scrolling
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Reset list scroll when filters change
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [filterChapter, filterDifficulty, filterDivision, searchText]);

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

        console.log('=== QuestionSelection Debug ===');
        console.log('Section:', sectionName);
        console.log('Type for query:', typeMap[sectionName]);
        console.log('Chapter codes:', chapterCodes);

        const questions = await window.electronAPI.questions.getByChapterCodes(
          typeMap[sectionName],
          chapterCodes
        );

        console.log('Questions loaded:', questions.length);
        if (questions.length > 0) {
          console.log('First question type:', questions[0].type);
          console.log('First question tag_2:', questions[0].tag_2);
        }
        console.log('===============================');

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
        console.log(`[AUTO-CORRECT] Moving question ${sq.question.uuid} from Division 1 to Division 2 (numerical answer: ${sq.question.answer})`);
        correctionsMade = true;
        return { ...sq, division: 2 as 1 | 2 };
      }
      return sq;
    });

    if (correctionsMade) {
      console.log('[AUTO-CORRECT] Correcting numerical answer questions assignments');
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
  const toggleQuestion = useCallback(async (
    question: Question,
    chapterCode: string,
    chapterName: string,
    difficulty: Difficulty,
    division: 1 | 2
  ) => {
    if (selectedUuids.has(question.uuid)) {
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
        division
      };
      setSelectedQuestions(prev => [...prev, newSelection]);
    }
  }, [selectedUuids]);

  // Memoize filtered questions - only recompute when filters or data changes
  const filteredQuestions = useMemo(() => {
    const searchLower = searchText.toLowerCase();

    return availableQuestions.filter(q => {
      // Filter by chapter
      if (filterChapter !== 'all' && q.tag_2 !== filterChapter) {
        return false;
      }

      // Filter by difficulty
      if (filterDifficulty !== 'all' && q.tag_3 !== filterDifficulty) {
        return false;
      }

      // Filter by division type (numerical vs multiple choice)
      if (filterDivision !== 'all') {
        const isDiv2Type = isNumericalAnswer(q);
        if (filterDivision === '1' && isDiv2Type) return false;
        if (filterDivision === '2' && !isDiv2Type) return false;
      }

      // Filter by search text
      if (searchText && !q.question.toLowerCase().includes(searchLower)) {
        return false;
      }

      return true;
    });
  }, [availableQuestions, filterChapter, filterDifficulty, filterDivision, searchText]);

  // Memoize isSelectionValid
  const isSelectionValid = useMemo(() => {
    return summary.division1 === 20 && summary.division2 === 5;
  }, [summary.division1, summary.division2]);

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
        <div className="questions-panel">
          <div className="filters">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
            />

            <select
              value={filterChapter}
              onChange={(e) => setFilterChapter(e.target.value)}
            >
              <option value="all">All Chapters</option>
              {chapters.map(ch => (
                <option key={ch.code} value={ch.code}>
                  {ch.code} - {ch.name}
                </option>
              ))}
            </select>

            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
            >
              <option value="all">All Difficulties</option>
              <option value="E">Easy</option>
              <option value="M">Medium</option>
              <option value="H">Hard</option>
            </select>

            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
            >
              <option value="all">All Divisions</option>
              <option value="1">Division 1</option>
              <option value="2">Division 2</option>
            </select>
          </div>

          <div className="question-list" ref={listContainerRef} style={{ overflowY: 'auto', height: '100%', display: 'block' }}>
            {loading ? (
              <div className="loading">Loading questions...</div>
            ) : filteredQuestions.length === 0 ? (
              <div className="no-questions">
                No questions available. Please adjust filters or load a database.
              </div>
            ) : (
              <>
                <div className="questions-info" style={{ marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0 }}>
                    Showing {filteredQuestions.length} questions. Click to select.
                  </p>
                </div>
                {/* Render all questions without virtualization */}
                {filteredQuestions.map((question, index) => {
                  const isDivision2Question = isNumericalAnswer(question);
                  const selected = selectedUuids.has(question.uuid);
                  return (
                    <QuestionRow
                      key={question.uuid}
                      question={question}
                      index={index}
                      selected={selected}
                      isDivision2Question={isDivision2Question}
                      summary={summary}
                      chapters={chapters}
                      onToggle={toggleQuestion}
                      onEdit={openEditModal}
                    />
                  );
                })}
              </>
            )}
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

      {/* Edit Question Modal */}
      {editModal.isOpen && editModal.question && (
        <div className="edit-modal-overlay" onClick={closeEditModal}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>
                <span className="material-symbols-outlined" style={{ marginRight: '0.5rem' }}>edit</span>
                Edit Question Properties
              </h3>
              <button className="edit-modal-close" onClick={closeEditModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="edit-modal-body">
              <div className="edit-modal-question-preview">
                <div className="edit-modal-uuid">
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>tag</span>
                  {editModal.question.uuid}
                </div>
                <p className="edit-modal-question-text">
                  {editModal.question.question.length > 200
                    ? editModal.question.question.substring(0, 200) + '...'
                    : editModal.question.question}
                </p>
              </div>

              <div className="edit-modal-fields">
                <div className="edit-modal-field">
                  <label>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: '0.375rem' }}>speed</span>
                    Difficulty
                  </label>
                  <div className="edit-modal-radio-group">
                    {(['E', 'M', 'H'] as Difficulty[]).map((diff) => (
                      <label key={diff} className={`edit-modal-radio ${editModal.difficulty === diff ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="difficulty"
                          value={diff}
                          checked={editModal.difficulty === diff}
                          onChange={() => setEditModal(prev => ({ ...prev, difficulty: diff }))}
                        />
                        <span className="radio-label">
                          {diff === 'E' ? 'Easy' : diff === 'M' ? 'Medium' : 'Hard'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="edit-modal-field">
                  <label>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: '0.375rem' }}>menu_book</span>
                    Chapter / Topic
                  </label>
                  <select
                    value={editModal.chapterCode}
                    onChange={(e) => setEditModal(prev => ({ ...prev, chapterCode: e.target.value }))}
                    className="edit-modal-select"
                  >
                    <option value="">Select a chapter...</option>
                    {validChaptersForSection.map(ch => (
                      <option key={ch.code} value={ch.code}>
                        {ch.code} - {ch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="btn-secondary" onClick={closeEditModal}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={saveQuestionEdit}
                disabled={!editModal.chapterCode}
              >
                <span className="material-symbols-outlined">save</span>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionSelection;
