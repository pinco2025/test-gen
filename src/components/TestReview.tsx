import React, { useState, useEffect, useMemo } from 'react';
import { SectionConfig, Question, SelectedQuestion } from '../types';
import QuestionDisplay from './QuestionDisplay';
import '../styles/TestReview.css';

interface TestReviewProps {
  sections: SectionConfig[];
  onEditQuestion: (updatedQuestion: Question) => void;
  onBack: () => void;
  onExport: () => void;
  onRemoveQuestion: (questionUuid: string) => void;
}

type QuestionStatus = 'accepted' | 'review' | 'pending';

const TestReview: React.FC<TestReviewProps> = ({
  sections,
  onEditQuestion,
  onBack,
  onExport,
  onRemoveQuestion
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStatuses, setQuestionStatuses] = useState<{ [key: string]: QuestionStatus }>({});
  // Palette is always visible, no toggling state needed for sidebar

  // Edit state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question>>({});

  // Flatten questions
  const allQuestions = useMemo(() => {
    const flat: Array<{ sq: SelectedQuestion; sectionIndex: number; absoluteIndex: number }> = [];
    let count = 0;
    sections.forEach((section, sIdx) => {
      section.selectedQuestions.forEach((sq) => {
        count++;
        flat.push({
          sq,
          sectionIndex: sIdx,
          absoluteIndex: count
        });
      });
    });
    return flat;
  }, [sections]);

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
  const handleAccept = () => {
    if (!currentQuestion) return;
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.uuid]: 'accepted'
    }));
    // Auto-advance
    handleNext();
  };

  const handleMarkReview = () => {
    if (!currentQuestion) return;
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.uuid]: 'review'
    }));
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
    return allQuestions.every(item => questionStatuses[item.sq.question.uuid] === 'accepted');
  }, [allQuestions, questionStatuses]);

  // Edit Handlers
  const handleEditClick = () => {
    if (!currentQuestion) return;
    setEditingQuestion(currentQuestion);
    setEditForm({
      question: currentQuestion.question,
      option_a: currentQuestion.option_a,
      option_b: currentQuestion.option_b,
      option_c: currentQuestion.option_c,
      option_d: currentQuestion.option_d,
      answer: currentQuestion.answer
    });
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion || !window.electronAPI) return;

    try {
      const success = await window.electronAPI.questions.updateQuestion(editingQuestion.uuid, editForm);

      if (success) {
        const updatedQuestion = {
          ...editingQuestion,
          ...editForm,
          updated_at: new Date().toISOString()
        };
        onEditQuestion(updatedQuestion);
        setEditingQuestion(null);
      } else {
        alert('Failed to update question in database');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      alert('An error occurred while updating the question');
    }
  };

  const handleInputChange = (field: keyof Question, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="test-review-container">
      {/* Header */}
      <div className="review-header">
        <div className="header-left">
          {/* Hamburger removed as palette is always visible */}
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
                        const status = questionStatuses[item.sq.question.uuid] || 'pending';
                        const isActive = currentQuestionIndex === allQuestions.findIndex(q => q.sq.question.uuid === item.sq.question.uuid);
                        return (
                          <button
                            key={item.sq.question.uuid}
                            className={`palette-item ${status} ${isActive ? 'current' : ''}`}
                            onClick={() => handleJumpToQuestion(allQuestions.findIndex(q => q.sq.question.uuid === item.sq.question.uuid))}
                          >
                            {item.sq.question.tag_1 || item.absoluteIndex}
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
                    <span className="material-symbols-outlined">edit</span> Edit
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
              className={`btn-review ${questionStatuses[currentQuestion?.uuid || ''] === 'review' ? 'active' : ''}`}
              onClick={handleMarkReview}
            >
               <span className="material-symbols-outlined">flag</span> Mark for Review
            </button>
            <button
              className={`btn-accept ${questionStatuses[currentQuestion?.uuid || ''] === 'accepted' ? 'active' : ''}`}
              onClick={handleAccept}
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

      {/* Edit Modal */}
      {editingQuestion && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <div className="modal-header">
              <h3>Edit Question</h3>
              <button className="icon-btn" onClick={() => setEditingQuestion(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label>Question Text</label>
                <textarea
                  value={editForm.question || ''}
                  onChange={(e) => handleInputChange('question', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Option A</label>
                <textarea
                  value={editForm.option_a || ''}
                  onChange={(e) => handleInputChange('option_a', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Option B</label>
                <textarea
                  value={editForm.option_b || ''}
                  onChange={(e) => handleInputChange('option_b', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Option C</label>
                <textarea
                  value={editForm.option_c || ''}
                  onChange={(e) => handleInputChange('option_c', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Option D</label>
                <textarea
                  value={editForm.option_d || ''}
                  onChange={(e) => handleInputChange('option_d', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Correct Answer</label>
                <select
                  value={editForm.answer || ''}
                  onChange={(e) => handleInputChange('answer', e.target.value)}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                   {['A','B','C','D'].includes(editingQuestion.answer) ? null : (
                     <option value={editingQuestion.answer}>{editingQuestion.answer}</option>
                   )}
                </select>
                {!['A','B','C','D'].includes(editingQuestion.answer) && (
                   <input
                    type="text"
                    value={editForm.answer || ''}
                    onChange={(e) => handleInputChange('answer', e.target.value)}
                    style={{marginTop: '0.5rem', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px'}}
                    placeholder="Enter numerical answer"
                   />
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditingQuestion(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestReview;
