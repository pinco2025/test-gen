import React, { useState, useEffect, useMemo } from 'react';
import { SectionConfig, Question, SelectedQuestion } from '../types';
import { sortQuestionsForSection } from '../utils/sorting';
import QuestionDisplay from './QuestionDisplay';
import LatexRenderer from './LatexRenderer';
import '../styles/TestReview.css';

interface TestReviewProps {
  sections: SectionConfig[];
  onStartEditing: (question: Question) => void;
  onEditQuestion: (updatedQuestion: Question) => void;
  onBack: () => void;
  onExport: () => void;
  onRemoveQuestion: (questionUuid: string) => void;
  onUpdateQuestionStatus: (questionUuid: string, status: 'accepted' | 'review' | 'pending') => void;
}

const TestReview: React.FC<TestReviewProps> = ({
  sections,
  onStartEditing,
  onEditQuestion,
  onBack,
  onExport,
  onRemoveQuestion,
  onUpdateQuestionStatus
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // Palette is always visible, no toggling state needed for sidebar

  // All editing state and modals are removed in favor of the global QuestionEditor

  // Acceptance Checklist Modal State
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [checklist, setChecklist] = useState({
    questionContent: false,
    optionContent: false,
    questionFormatting: false,
    optionFormatting: false,
    figureFormatting: false,
    solutionExistence: false,
    solutionFormatting: false
  });

  // Store fresh questions from DB
  const [freshQuestionsMap, setFreshQuestionsMap] = useState<Record<string, Question>>({});

  // Fetch fresh question data on mount
  useEffect(() => {
    const fetchFreshData = async () => {
      if (!window.electronAPI) return;

      const allUuids = sections.flatMap(s => s.selectedQuestions.map(sq => sq.question.uuid));
      if (allUuids.length === 0) return;

      try {
        const freshQuestions = await window.electronAPI.questions.getByUUIDs(allUuids);
        const map: Record<string, Question> = {};
        freshQuestions.forEach(q => {
          map[q.uuid] = q;
        });
        setFreshQuestionsMap(map);
      } catch (error) {
        console.error('Failed to fetch fresh question data:', error);
      }
    };

    fetchFreshData();
  }, [sections]);

  // Flatten questions with sorted order
  const allQuestions = useMemo(() => {
    const flat: Array<{ sq: SelectedQuestion; sectionIndex: number; absoluteIndex: number }> = [];
    let count = 0;
    sections.forEach((section, sIdx) => {
      // Sort questions: First 20 Div 1, then Last 5 Div 2
      const sortedQuestions = sortQuestionsForSection(section.selectedQuestions);

      sortedQuestions.forEach((sq) => {
        count++;
        // Use fresh question data if available
        const freshQuestion = freshQuestionsMap[sq.question.uuid] || sq.question;

        flat.push({
          sq: { ...sq, question: freshQuestion },
          sectionIndex: sIdx,
          absoluteIndex: count
        });
      });
    });
    return flat;
  }, [sections, freshQuestionsMap]);

  // Adjust index if out of bounds (e.g. after deletion)
  useEffect(() => {
    if (allQuestions.length === 0) {
      setCurrentQuestionIndex(0);
    } else if (currentQuestionIndex >= allQuestions.length) {
      setCurrentQuestionIndex(Math.max(0, allQuestions.length - 1));
    }
  }, [allQuestions.length, currentQuestionIndex]);

  const currentItem = allQuestions[currentQuestionIndex];
  const currentQuestion = currentItem?.sq.question;

  // Navigation
  const handleNext = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    // Palette is always visible, no need to close
  };

  // Status Actions
  const handleAcceptClick = () => {
    // Open checklist modal
    setChecklist({
        questionContent: false,
        optionContent: false,
        questionFormatting: false,
        optionFormatting: false,
        figureFormatting: false,
        solutionExistence: false,
        solutionFormatting: false
    });
    setIsAcceptModalOpen(true);
  };

  const confirmAccept = () => {
      if (!currentQuestion) return;
      onUpdateQuestionStatus(currentQuestion.uuid, 'accepted');
      setIsAcceptModalOpen(false);
      // Auto-advance
      handleNext();
  };

  const handleMarkReview = () => {
    if (!currentQuestion) return;
    onUpdateQuestionStatus(currentQuestion.uuid, 'review');
    handleNext();
  };

  const handleReject = () => {
    if (!currentQuestion) return;
    // Remove from test
    onRemoveQuestion(currentQuestion.uuid);
    // Note: useEffect will handle index adjustment
  };

  // Export Check
  const canExport = useMemo(() => {
    if (allQuestions.length === 0) return false;
    return allQuestions.every(item => item.sq.status === 'accepted');
  }, [allQuestions]);

  const handleEditClick = () => {
    if (currentQuestion) {
      onStartEditing(currentQuestion);
    }
  };

  return (
    <div className="test-review-container">
      {/* Header */}
      <div className="review-header">
        <div className="header-left">
          <button
            className="btn-secondary"
            onClick={onBack}
            title="Back to Configuration"
            style={{marginRight: '1rem'}}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2>Review Test</h2>
        </div>
        <div className="header-right">
          <span className="progress-text">
             {allQuestions.length > 0 ? `${currentQuestionIndex + 1} / ${allQuestions.length}` : '0 / 0'}
          </span>
          <button
            className="btn-primary"
            onClick={onExport}
            disabled={!canExport}
            title={!canExport ? "All questions must be accepted to export" : "Export Test"}
          >
            Export Test
          </button>
        </div>
      </div>

      {/* Main Body: Sidebar + Content */}
      <div className="review-body">

        {/* Palette Sidebar */}
        <div className="palette-sidebar">
          <h3>Question Palette</h3>
          <div className="palette-sidebar-content">
              {sections.map((section, idx) => {
                const sectionQuestions = allQuestions.filter(q => q.sectionIndex === idx);
                if (sectionQuestions.length === 0) return null;

                return (
                  <div key={idx} className="palette-section">
                    <h4>{section.name}</h4>
                    <div className="palette-grid">
                      {sectionQuestions.map((item) => {
                        const status = item.sq.status || 'pending';
                        const isActive = currentQuestionIndex === allQuestions.findIndex(q => q.sq.question.uuid === item.sq.question.uuid);
                        return (
                          <button
                            key={item.sq.question.uuid}
                            className={`palette-item ${status} ${isActive ? 'current' : ''}`}
                            onClick={() => handleJumpToQuestion(allQuestions.findIndex(q => q.sq.question.uuid === item.sq.question.uuid))}
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
        </div>

        {/* Main Question Content */}
        <div className="review-main-single">
          {allQuestions.length === 0 ? (
            <div className="empty-state">
              <p>No questions in this test.</p>
              <button className="btn-secondary" onClick={onBack}>Back to Selection</button>
            </div>
          ) : currentQuestion ? (
            <div className="single-question-view">
              <QuestionDisplay
                question={currentQuestion}
                // questionNumber is no longer used for Q# display but might be used for logic if needed,
                // but we removed its usage in QuestionDisplay for Q#.
                // We can pass it if we want to retain sequential numbering for other purposes or just pass 0.
                // However, QuestionDisplay still accepts it.
                questionNumber={currentItem.absoluteIndex}
                showAnswer={true}
              />

              <div className="question-actions-bar">
                  <button className="btn-text" onClick={handleEditClick}>
                    <span className="material-symbols-outlined">edit</span> Edit Question
                  </button>
              </div>
            </div>
          ) : (
            <div>Loading...</div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="review-footer">
         <div className="nav-controls">
            <button className="btn-secondary" onClick={handlePrev} disabled={currentQuestionIndex === 0}>
              <span className="material-symbols-outlined">chevron_left</span> Prev
            </button>
         </div>

         <div className="status-controls">
            <button className="btn-reject" onClick={handleReject}>
               <span className="material-symbols-outlined">close</span> Reject
            </button>
            <button
              className={`btn-review ${currentItem?.sq.status === 'review' ? 'active' : ''}`}
              onClick={handleMarkReview}
            >
               <span className="material-symbols-outlined">flag</span> Mark for Review
            </button>
            <button
              className={`btn-accept ${currentItem?.sq.status === 'accepted' ? 'active' : ''}`}
              onClick={handleAcceptClick}
            >
               <span className="material-symbols-outlined">check</span> Accept
            </button>
         </div>

         <div className="nav-controls">
            <button className="btn-secondary" onClick={handleNext} disabled={currentQuestionIndex === allQuestions.length - 1}>
               Next <span className="material-symbols-outlined">chevron_right</span>
            </button>
         </div>
      </div>

      {/* Acceptance Checklist Modal */}
      {isAcceptModalOpen && (
          <div className="modal-overlay animate-fade-in">
              <div className="edit-modal animate-fade-in" style={{ maxWidth: '500px', width: '90%' }}>
                  <div className="edit-modal-header">
                      <h3>Review Verification</h3>
                      <button className="edit-modal-close" onClick={() => setIsAcceptModalOpen(false)}>
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  <div className="edit-modal-body">
                      <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                          Please confirm you have verified the following items. If an item does not exist (e.g., no figure), mark it as checked.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>
                              <input
                                  type="checkbox"
                                  checked={Object.values(checklist).every(Boolean)}
                                  onChange={(e) => {
                                      const checked = e.target.checked;
                                      setChecklist({
                                          questionContent: checked,
                                          optionContent: checked,
                                          questionFormatting: checked,
                                          optionFormatting: checked,
                                          figureFormatting: checked,
                                          solutionExistence: checked,
                                          solutionFormatting: checked
                                      });
                                  }}
                              />
                              <span>Select All</span>
                          </label>
                          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0 0 0.5rem' }} />

                          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                              <input
                                  type="checkbox"
                                  checked={checklist.questionContent}
                                  onChange={(e) => setChecklist(prev => ({ ...prev, questionContent: e.target.checked }))}
                              />
                              <span>Question Content</span>
                          </label>
                          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                              <input
                                  type="checkbox"
                                  checked={checklist.optionContent}
                                  onChange={(e) => setChecklist(prev => ({ ...prev, optionContent: e.target.checked }))}
                              />
                              <span>Option Content</span>
                          </label>
                          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                              <input
                                  type="checkbox"
                                  checked={checklist.questionFormatting}
                                  onChange={(e) => setChecklist(prev => ({ ...prev, questionFormatting: e.target.checked }))}
                              />
                              <span>Question Formatting</span>
                          </label>
                          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                              <input
                                  type="checkbox"
                                  checked={checklist.optionFormatting}
                                  onChange={(e) => setChecklist(prev => ({ ...prev, optionFormatting: e.target.checked }))}
                              />
                              <span>Option Formatting</span>
                          </label>
                          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                              <input
                                  type="checkbox"
                                  checked={checklist.figureFormatting}
                                  onChange={(e) => setChecklist(prev => ({ ...prev, figureFormatting: e.target.checked }))}
                              />
                              <span>Figure Formatting (If Exists)</span>
                          </label>
                          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                              <input
                                  type="checkbox"
                                  checked={checklist.solutionExistence}
                                  onChange={(e) => setChecklist(prev => ({ ...prev, solutionExistence: e.target.checked }))}
                              />
                              <span>Solution Existence</span>
                          </label>
                          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                              <input
                                  type="checkbox"
                                  checked={checklist.solutionFormatting}
                                  onChange={(e) => setChecklist(prev => ({ ...prev, solutionFormatting: e.target.checked }))}
                              />
                              <span>Solution Formatting (If image exists)</span>
                          </label>
                      </div>
                  </div>
                  <div className="edit-modal-footer">
                      <button className="btn-secondary" onClick={() => setIsAcceptModalOpen(false)}>Cancel</button>
                      <button
                          className="btn-primary"
                          onClick={confirmAccept}
                          disabled={!Object.values(checklist).every(Boolean)}
                      >
                          <span className="material-symbols-outlined">check</span>
                          Confirm Accept
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TestReview;
