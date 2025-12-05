import React, { useState, useEffect } from 'react';
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

interface QuestionSelectionProps {
  sectionName: SectionName;
  chapters: Chapter[];
  alphaConstraint: AlphaConstraint;
  betaConstraint: BetaConstraint;
  onComplete: (selectedQuestions: SelectedQuestion[]) => void;
  onBack: () => void;
}

/**
 * Component for selecting questions based on Alpha/Beta constraints
 */
export const QuestionSelection: React.FC<QuestionSelectionProps> = ({
  sectionName,
  chapters,
  alphaConstraint,
  onComplete,
  onBack
}) => {
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChapter, setFilterChapter] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterDivision, setFilterDivision] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionName, chapters]);

  const getSummary = (): SelectionSummary => {
    const byChapter: SelectionSummary['byChapter'] = {};
    let totalE = 0, totalM = 0, totalH = 0;
    let requiredE = 0, requiredM = 0, requiredH = 0;

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

    // Count current selections
    selectedQuestions.forEach(sq => {
      if (byChapter[sq.chapterCode]) {
        if (sq.division === 1) {
          byChapter[sq.chapterCode].a++;
        } else {
          byChapter[sq.chapterCode].b++;
        }
      }

      if (sq.difficulty === 'E') totalE++;
      if (sq.difficulty === 'M') totalM++;
      if (sq.difficulty === 'H') totalH++;
    });

    const div1Count = selectedQuestions.filter(sq => sq.division === 1).length;
    const div2Count = selectedQuestions.filter(sq => sq.division === 2).length;

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
  };

  const summary = getSummary();

  const isQuestionSelected = (uuid: string): boolean => {
    return selectedQuestions.some(sq => sq.question.uuid === uuid);
  };

  const toggleQuestion = (
    question: Question,
    chapterCode: string,
    chapterName: string,
    difficulty: Difficulty,
    division: 1 | 2
  ) => {
    if (isQuestionSelected(question.uuid)) {
      setSelectedQuestions(
        selectedQuestions.filter(sq => sq.question.uuid !== question.uuid)
      );
    } else {
      const newSelection: SelectedQuestion = {
        question,
        chapterCode,
        chapterName,
        difficulty,
        division
      };
      setSelectedQuestions([...selectedQuestions, newSelection]);
    }
  };

  const getFilteredQuestions = (): Question[] => {
    return availableQuestions.filter(q => {
      if (filterChapter !== 'all' && q.tag_2 !== filterChapter) {
        return false;
      }

      if (searchText) {
        const search = searchText.toLowerCase();
        if (!q.question.toLowerCase().includes(search)) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredQuestions = getFilteredQuestions();

  const isSelectionValid = (): boolean => {
    return summary.division1 === 20 && summary.division2 === 5;
  };

  return (
    <div className="question-selection">
      <div className="selection-header">
        <h2>{sectionName} - Question Selection</h2>
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
          <h3>Alpha Constraints</h3>

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

          <div className="question-list">
            {loading ? (
              <div className="loading">Loading questions...</div>
            ) : filteredQuestions.length === 0 ? (
              <div className="no-questions">
                No questions available. Please adjust filters or load a database.
              </div>
            ) : (
              <div className="questions-info">
                <p>
                  Click on questions below to select them. You must assign each question
                  to a chapter, difficulty level, and division.
                </p>
                <p className="note">
                  Note: For MVP, questions will need manual categorization.
                  Use tag_1/tag_2 from database as chapter hint.
                </p>
              </div>
            )}

            {filteredQuestions.map(question => (
              <div key={question.uuid} className="selectable-question">
                <QuestionDisplay
                  question={question}
                  showAnswer={false}
                  showCheckbox={true}
                  isSelected={isQuestionSelected(question.uuid)}
                  onSelect={() => {
                    // For MVP: Simple selection
                    // In production: Show modal to select chapter, difficulty, division
                    const chapterCode = question.tag_2 || chapters[0].code;
                    const chapter = chapters.find(ch => ch.code === chapterCode);
                    const chapterName = chapter ? chapter.name : chapters[0].name;
                    const difficulty: Difficulty = 'M'; // Default
                    const division: 1 | 2 = summary.division1 < 20 ? 1 : 2;

                    toggleQuestion(question, chapterCode, chapterName, difficulty, division);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="selection-actions">
        <button className="btn-secondary" onClick={onBack}>
          Back to Configuration
        </button>
        <button
          className="btn-primary"
          onClick={() => onComplete(selectedQuestions)}
          disabled={!isSelectionValid()}
        >
          {isSelectionValid()
            ? 'Continue to Next Section'
            : `Need ${20 - summary.division1} more for Div1, ${5 - summary.division2} more for Div2`}
        </button>
      </div>
    </div>
  );
};

export default QuestionSelection;
