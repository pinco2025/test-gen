import React, { useState, useEffect, useMemo } from 'react';
import { SectionConfig, Question, SelectedQuestion } from '../types';
import { sortQuestionsForSection } from '../utils/sorting';
import QuestionDisplay from './QuestionDisplay';
import LatexRenderer from './LatexRenderer';
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

  // Image modal state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageForm, setImageForm] = useState<{
    question_image_url: string;
    option_a_image_url: string;
    option_b_image_url: string;
    option_c_image_url: string;
    option_d_image_url: string;
  }>({
    question_image_url: '',
    option_a_image_url: '',
    option_b_image_url: '',
    option_c_image_url: '',
    option_d_image_url: ''
  });
  // Local state to trigger preview rendering (though direct input change already rerenders)
  const [previewImages, setPreviewImages] = useState(imageForm);

  // Solution modal state
  const [isSolutionModalOpen, setIsSolutionModalOpen] = useState(false);
  const [solutionForm, setSolutionForm] = useState({
      solution_text: '',
      solution_image_url: ''
  });
  const [previewSolution, setPreviewSolution] = useState(solutionForm);

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

  // Flatten questions with sorted order
  const allQuestions = useMemo(() => {
    const flat: Array<{ sq: SelectedQuestion; sectionIndex: number; absoluteIndex: number }> = [];
    let count = 0;
    sections.forEach((section, sIdx) => {
      // Sort questions: First 20 Div 1, then Last 5 Div 2
      const sortedQuestions = sortQuestionsForSection(section.selectedQuestions);

      sortedQuestions.forEach((sq) => {
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
      setQuestionStatuses(prev => ({
          ...prev,
          [currentQuestion.uuid]: 'accepted'
      }));
      setIsAcceptModalOpen(false);
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

  // Image Management Handlers
  const handleImageClick = () => {
      if (!currentQuestion) return;
      setImageForm({
          question_image_url: currentQuestion.question_image_url || '',
          option_a_image_url: currentQuestion.option_a_image_url || '',
          option_b_image_url: currentQuestion.option_b_image_url || '',
          option_c_image_url: currentQuestion.option_c_image_url || '',
          option_d_image_url: currentQuestion.option_d_image_url || ''
      });
      setPreviewImages({
          question_image_url: currentQuestion.question_image_url || '',
          option_a_image_url: currentQuestion.option_a_image_url || '',
          option_b_image_url: currentQuestion.option_b_image_url || '',
          option_c_image_url: currentQuestion.option_c_image_url || '',
          option_d_image_url: currentQuestion.option_d_image_url || ''
      });
      setIsImageModalOpen(true);
  };

  const handleImageSave = async () => {
      if (!currentQuestion || !window.electronAPI) return;

      try {
        const updates = {
            question_image_url: imageForm.question_image_url || null,
            option_a_image_url: imageForm.option_a_image_url || null,
            option_b_image_url: imageForm.option_b_image_url || null,
            option_c_image_url: imageForm.option_c_image_url || null,
            option_d_image_url: imageForm.option_d_image_url || null
        };

        const success = await window.electronAPI.questions.updateQuestion(currentQuestion.uuid, updates);

        if (success) {
            const updatedQuestion = {
                ...currentQuestion,
                ...updates,
                updated_at: new Date().toISOString()
            };
            onEditQuestion(updatedQuestion);
            setIsImageModalOpen(false);
        } else {
            alert('Failed to update image URLs');
        }
      } catch (error) {
          console.error('Error updating images:', error);
          alert('An error occurred while updating images');
      }
  };

  const handlePreview = () => {
      // Just update the state to trigger re-render of preview in modal
      setPreviewImages({...imageForm});
  };

  // Solution Handlers
  const handleSolutionClick = async () => {
      if (!currentQuestion || !window.electronAPI) return;

      try {
          const solution = await window.electronAPI.questions.getSolution(currentQuestion.uuid);
          const initialForm = {
              solution_text: solution ? solution.solution_text : '',
              solution_image_url: solution ? solution.solution_image_url : ''
          };
          setSolutionForm(initialForm);
          setPreviewSolution(initialForm);
          setIsSolutionModalOpen(true);
      } catch (error) {
          console.error('Error fetching solution:', error);
          alert('Failed to fetch solution');
      }
  };

  const handleSolutionSave = async () => {
      if (!currentQuestion || !window.electronAPI) return;

      try {
          const success = await window.electronAPI.questions.saveSolution(
              currentQuestion.uuid,
              solutionForm.solution_text,
              solutionForm.solution_image_url
          );

          if (success) {
              setIsSolutionModalOpen(false);
          } else {
              alert('Failed to save solution');
          }
      } catch (error) {
          console.error('Error saving solution:', error);
          alert('An error occurred while saving solution');
      }
  };

  const handleSolutionPreview = () => {
      setPreviewSolution({...solutionForm});
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
                        const status = questionStatuses[item.sq.question.uuid] || 'pending';
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
                    <span className="material-symbols-outlined">edit</span> Edit
                  </button>
                  <button className="btn-text" onClick={handleImageClick}>
                    <span className="material-symbols-outlined">image</span> Image
                  </button>
                  <button className="btn-text" onClick={handleSolutionClick}>
                    <span className="material-symbols-outlined">lightbulb</span> Solution
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

      {/* Image Management Modal */}
      {isImageModalOpen && (
          <div className="modal-overlay">
              <div className="edit-modal" style={{maxWidth: '800px', width: '90%'}}>
                  <div className="modal-header">
                      <h3>Image Management</h3>
                      <button className="icon-btn" onClick={() => setIsImageModalOpen(false)}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  <div className="modal-content" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                      <div className="image-inputs">
                          <h4>Image URLs</h4>
                          <div className="form-group">
                              <label>Question Image URL</label>
                              <input
                                type="text"
                                value={imageForm.question_image_url}
                                onChange={(e) => setImageForm({...imageForm, question_image_url: e.target.value})}
                                placeholder="Enter image URL..."
                                style={{width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px'}}
                              />
                          </div>
                          <div className="form-group">
                              <label>Option A Image URL</label>
                              <input
                                type="text"
                                value={imageForm.option_a_image_url}
                                onChange={(e) => setImageForm({...imageForm, option_a_image_url: e.target.value})}
                                placeholder="Enter image URL..."
                                style={{width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px'}}
                              />
                          </div>
                          <div className="form-group">
                              <label>Option B Image URL</label>
                              <input
                                type="text"
                                value={imageForm.option_b_image_url}
                                onChange={(e) => setImageForm({...imageForm, option_b_image_url: e.target.value})}
                                placeholder="Enter image URL..."
                                style={{width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px'}}
                              />
                          </div>
                          <div className="form-group">
                              <label>Option C Image URL</label>
                              <input
                                type="text"
                                value={imageForm.option_c_image_url}
                                onChange={(e) => setImageForm({...imageForm, option_c_image_url: e.target.value})}
                                placeholder="Enter image URL..."
                                style={{width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px'}}
                              />
                          </div>
                          <div className="form-group">
                              <label>Option D Image URL</label>
                              <input
                                type="text"
                                value={imageForm.option_d_image_url}
                                onChange={(e) => setImageForm({...imageForm, option_d_image_url: e.target.value})}
                                placeholder="Enter image URL..."
                                style={{width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px'}}
                              />
                          </div>
                      </div>

                      <div className="preview-section" style={{borderTop: '1px solid var(--border-color)', paddingTop: '1rem'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                             <h4>Preview</h4>
                             <button className="btn-secondary" onClick={handlePreview}>Update Preview</button>
                          </div>

                          <div className="preview-container" style={{background: 'var(--bg-light)', padding: '1rem', borderRadius: '8px'}}>
                              <div style={{marginBottom: '0.5rem'}}>
                                <strong>Question Text:</strong><br/>
                                <div style={{marginTop: '0.5rem'}}>
                                    <LatexRenderer content={currentQuestion ? currentQuestion.question : ''} />
                                </div>
                              </div>

                              {previewImages.question_image_url && (
                                  <div className="preview-image" style={{margin: '1rem 0', textAlign: 'center'}}>
                                      <img
                                        src={previewImages.question_image_url}
                                        alt="Question Image"
                                        style={{maxWidth: '100%', maxHeight: '300px', border: '1px solid #ddd'}}
                                      />
                                  </div>
                              )}

                              <div className="options-preview" style={{display: 'grid', gap: '0.5rem'}}>
                                  <div style={{display: 'flex', gap: '0.5rem', alignItems: 'flex-start'}}>
                                      <strong>A)</strong>
                                      <div style={{flex: 1}}>
                                          ... (Option A text) ...
                                          {previewImages.option_a_image_url && (
                                              <div style={{marginTop: '0.5rem'}}>
                                                <img src={previewImages.option_a_image_url} alt="Option A" style={{maxWidth: '100px', maxHeight: '100px'}} />
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  <div style={{display: 'flex', gap: '0.5rem', alignItems: 'flex-start'}}>
                                      <strong>B)</strong>
                                      <div style={{flex: 1}}>
                                          ... (Option B text) ...
                                          {previewImages.option_b_image_url && (
                                              <div style={{marginTop: '0.5rem'}}>
                                                <img src={previewImages.option_b_image_url} alt="Option B" style={{maxWidth: '100px', maxHeight: '100px'}} />
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  <div style={{display: 'flex', gap: '0.5rem', alignItems: 'flex-start'}}>
                                      <strong>C)</strong>
                                      <div style={{flex: 1}}>
                                          ... (Option C text) ...
                                          {previewImages.option_c_image_url && (
                                              <div style={{marginTop: '0.5rem'}}>
                                                <img src={previewImages.option_c_image_url} alt="Option C" style={{maxWidth: '100px', maxHeight: '100px'}} />
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  <div style={{display: 'flex', gap: '0.5rem', alignItems: 'flex-start'}}>
                                      <strong>D)</strong>
                                      <div style={{flex: 1}}>
                                          ... (Option D text) ...
                                          {previewImages.option_d_image_url && (
                                              <div style={{marginTop: '0.5rem'}}>
                                                <img src={previewImages.option_d_image_url} alt="Option D" style={{maxWidth: '100px', maxHeight: '100px'}} />
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="modal-footer">
                      <button className="btn-secondary" onClick={() => setIsImageModalOpen(false)}>Cancel</button>
                      <button className="btn-primary" onClick={handleImageSave}>Save Images</button>
                  </div>
              </div>
          </div>
      )}

      {/* Acceptance Checklist Modal */}
      {isAcceptModalOpen && (
          <div className="modal-overlay">
              <div className="edit-modal" style={{ maxWidth: '500px', width: '90%' }}>
                  <div className="modal-header">
                      <h3>Review Verification</h3>
                      <button className="icon-btn" onClick={() => setIsAcceptModalOpen(false)}>
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  <div className="modal-content">
                      <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                          Please confirm you have verified the following items. If an item does not exist (e.g., no figure), mark it as checked.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                  <div className="modal-footer">
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

      {/* Solution Modal */}
      {isSolutionModalOpen && (
          <div className="modal-overlay">
              <div className="edit-modal" style={{maxWidth: '800px', width: '90%'}}>
                  <div className="modal-header">
                      <h3>Add Solution</h3>
                      <button className="icon-btn" onClick={() => setIsSolutionModalOpen(false)}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  <div className="modal-content" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                      <div className="form-group">
                          <label>Solution Text</label>
                          <textarea
                              value={solutionForm.solution_text}
                              onChange={(e) => setSolutionForm({...solutionForm, solution_text: e.target.value})}
                              placeholder="Enter solution explanation..."
                              rows={6}
                              style={{width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px'}}
                          />
                      </div>
                      <div className="form-group">
                          <label>Solution Image URL</label>
                          <input
                              type="text"
                              value={solutionForm.solution_image_url}
                              onChange={(e) => setSolutionForm({...solutionForm, solution_image_url: e.target.value})}
                              placeholder="Enter solution image URL..."
                              style={{width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px'}}
                          />
                      </div>

                      <div className="preview-section" style={{borderTop: '1px solid var(--border-color)', paddingTop: '1rem'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                             <h4>Preview</h4>
                             <button className="btn-secondary" onClick={handleSolutionPreview}>Update Preview</button>
                          </div>

                          <div className="preview-container" style={{background: 'var(--bg-light)', padding: '1rem', borderRadius: '8px'}}>
                              <div style={{marginBottom: '1rem'}}>
                                  <LatexRenderer content={previewSolution.solution_text} />
                              </div>

                              {previewSolution.solution_image_url && (
                                  <div className="preview-image" style={{marginTop: '1rem', textAlign: 'center'}}>
                                      <img
                                        src={previewSolution.solution_image_url}
                                        alt="Solution"
                                        style={{maxWidth: '100%', maxHeight: '400px', border: '1px solid #ddd'}}
                                      />
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                  <div className="modal-footer">
                      <button className="btn-secondary" onClick={() => setIsSolutionModalOpen(false)}>Cancel</button>
                      <button className="btn-primary" onClick={handleSolutionSave}>Save Solution</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TestReview;
