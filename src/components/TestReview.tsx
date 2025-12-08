import React, { useState, useEffect, useRef } from 'react';
import { SectionConfig, Question } from '../types';
import '../styles/TestReview.css';

interface TestReviewProps {
  sections: SectionConfig[];
  onEditQuestion: (updatedQuestion: Question) => void;
  onBack: () => void;
  onExport: () => void;
}

const TestReview: React.FC<TestReviewProps> = ({
  sections,
  onEditQuestion,
  onBack,
  onExport
}) => {
  const [, setActiveSection] = useState<number>(0);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Refs for scrolling
  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Handle clicking outside of menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpenId && !(event.target as Element).closest('.question-actions')) {
        setMenuOpenId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenId]);

  const scrollToQuestion = (questionId: string) => {
    const element = questionRefs.current[questionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleEditClick = (question: Question) => {
    setEditingQuestion(question);
    setEditForm({
      question: question.question,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      answer: question.answer
    });
    setMenuOpenId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion || !window.electronAPI) return;

    try {
      const success = await window.electronAPI.questions.updateQuestion(editingQuestion.uuid, editForm);

      if (success) {
        // Construct the updated question object
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

  // Helper to get total question count up to a section
  const getQuestionOffset = (sectionIndex: number) => {
    let count = 0;
    for (let i = 0; i < sectionIndex; i++) {
      count += sections[i].selectedQuestions.length;
    }
    return count;
  };

  return (
    <div className="test-review-container">
      {/* Sidebar / Palette */}
      <div className="review-sidebar">
        <div className="review-sidebar-header">
          <h3>
            <span className="material-symbols-outlined">list</span>
            Question Palette
          </h3>
        </div>

        <div className="review-sidebar-content">
          {sections.map((section, idx) => (
            <div key={idx} className="section-palette">
              <h4>{section.name}</h4>
              <div className="question-grid">
                {section.selectedQuestions.map((sq, qIdx) => {
                  const absoluteIndex = getQuestionOffset(idx) + qIdx + 1;
                  return (
                    <button
                      key={sq.question.uuid}
                      className="palette-btn"
                      onClick={() => {
                        setActiveSection(idx);
                        // Small timeout to allow render if switching sections (though currently all rendered)
                        setTimeout(() => scrollToQuestion(sq.question.uuid), 50);
                      }}
                    >
                      {absoluteIndex}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="review-sidebar-footer">
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onBack}>
            Back
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={onExport}>
            Export
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="review-main">
        <div className="review-header">
          <h2>Review Test</h2>
          {/* We could add filters or view options here */}
        </div>

        <div className="review-content">
          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="section-questions">
              <h3 style={{
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid var(--primary)',
                display: 'inline-block',
                paddingBottom: '0.25rem'
              }}>
                {section.name} Section
              </h3>

              {section.selectedQuestions.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  No questions selected for this section.
                </p>
              ) : (
                section.selectedQuestions.map((sq, qIdx) => {
                  const absoluteIndex = getQuestionOffset(sectionIdx) + qIdx + 1;
                  const q = sq.question;

                  return (
                    <div
                      key={q.uuid}
                      className="question-card"
                      id={`q-${q.uuid}`}
                      ref={el => questionRefs.current[q.uuid] = el}
                    >
                      <div className="question-header">
                        <div className="question-info">
                          <span className="question-number">Q{absoluteIndex}</span>
                          <span className="question-id">{q.uuid.substring(0, 8)}...</span>
                          <span className="badge badge-chapter">{sq.chapterName}</span>
                          <span className={`badge badge-${sq.difficulty.toLowerCase()}`}>
                            {sq.difficulty === 'E' ? 'Easy' : sq.difficulty === 'M' ? 'Medium' : 'Hard'}
                          </span>
                        </div>

                        <div className="question-actions">
                          <button
                            className="icon-btn"
                            onClick={() => setMenuOpenId(menuOpenId === q.uuid ? null : q.uuid)}
                          >
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>

                          {menuOpenId === q.uuid && (
                            <div className="question-menu">
                              <button
                                className="menu-item"
                                onClick={() => handleEditClick(q)}
                              >
                                <span className="material-symbols-outlined">edit</span>
                                Edit Question
                              </button>
                              <button
                                className="menu-item"
                                disabled // Placeholder functionality
                                title="Feature coming soon"
                              >
                                <span className="material-symbols-outlined">image</span>
                                Add Images
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="question-body">
                        <div className="question-text">{q.question}</div>

                        {/* Only show options for MCQ (Division 1) */}
                        {sq.division === 1 && (
                          <div className="options-list">
                            <div className={`option-item ${q.answer === 'A' ? 'correct' : ''}`}>
                              <span className="option-marker">A.</span>
                              <span className="option-text">{q.option_a}</span>
                              {q.answer === 'A' && <span className="material-symbols-outlined" style={{color: 'var(--success)'}}>check_circle</span>}
                            </div>
                            <div className={`option-item ${q.answer === 'B' ? 'correct' : ''}`}>
                              <span className="option-marker">B.</span>
                              <span className="option-text">{q.option_b}</span>
                              {q.answer === 'B' && <span className="material-symbols-outlined" style={{color: 'var(--success)'}}>check_circle</span>}
                            </div>
                            <div className={`option-item ${q.answer === 'C' ? 'correct' : ''}`}>
                              <span className="option-marker">C.</span>
                              <span className="option-text">{q.option_c}</span>
                              {q.answer === 'C' && <span className="material-symbols-outlined" style={{color: 'var(--success)'}}>check_circle</span>}
                            </div>
                            <div className={`option-item ${q.answer === 'D' ? 'correct' : ''}`}>
                              <span className="option-marker">D.</span>
                              <span className="option-text">{q.option_d}</span>
                              {q.answer === 'D' && <span className="material-symbols-outlined" style={{color: 'var(--success)'}}>check_circle</span>}
                            </div>
                          </div>
                        )}

                        {/* Show answer for Division 2 (Numerical) */}
                        {sq.division === 2 && (
                          <div className="answer-display" style={{ marginTop: '1rem', fontWeight: 500 }}>
                            Correct Answer: <span style={{ color: 'var(--success)' }}>{q.answer}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ))}
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
                {/* Check if it is a numerical or MCQ question based on current value or context.
                    Since we edit raw fields, we should probably allow free text for answer if it's numerical,
                    but restricted if it's MCQ. However, the requirement says "edit... configure the correct answer".
                    Usually answer is 'A', 'B', 'C', 'D' for MCQs.
                */}
                <select
                  value={editForm.answer || ''}
                  onChange={(e) => handleInputChange('answer', e.target.value)}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  {/* Allow other values for numerical questions if needed, but <select> limits us.
                      If the original answer was not A/B/C/D, we should probably use a text input or add that option.
                   */}
                   {['A','B','C','D'].includes(editingQuestion.answer) ? null : (
                     <option value={editingQuestion.answer}>{editingQuestion.answer}</option>
                   )}
                </select>
                {/* Fallback input for numerical/integer answers if it's not ABCD */}
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
