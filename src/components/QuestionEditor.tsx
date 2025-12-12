import React, { useState, useEffect, useMemo } from 'react';
import { Question, Solution, Difficulty, SectionName } from '../types';
import QuestionDisplay from './QuestionDisplay';
import LatexRenderer from './LatexRenderer';
import '../styles/QuestionEditor.css';
import chaptersData from '../data/chapters.json'; // For chapter dropdown

interface QuestionEditorProps {
  question: Question;
  solution?: Solution;
  sectionName: SectionName; // Needed for chapter dropdown
  onSave: (updatedQuestion: Question, updatedSolution?: Solution) => void;
  onCancel: () => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, solution, sectionName, onSave, onCancel }) => {
  const [editedQuestion, setEditedQuestion] = useState<Question>(question);
  const [editedSolution, setEditedSolution] = useState<Solution | undefined>(solution);

  // Derive valid chapters for the current section
  const validChaptersForSection = useMemo(() => {
    const sectionKey = sectionName as keyof typeof chaptersData;
    const sectionChapters = chaptersData[sectionKey] || [];
    return sectionChapters.map(ch => ({ code: ch.code, name: ch.name }));
  }, [sectionName]);


  useEffect(() => {
    setEditedQuestion(question);
    // If solution is not provided, fetch it
    const fetchSolution = async () => {
        if (!solution && window.electronAPI) {
            try {
                const fetchedSolution = await window.electronAPI.questions.getSolution(question.uuid);
                if (fetchedSolution) {
                    setEditedSolution(fetchedSolution);
                } else {
                    setEditedSolution({ uuid: question.uuid, solution_text: '', solution_image_url: '' });
                }
            } catch (error) {
                console.error("Failed to fetch solution:", error);
                setEditedSolution({ uuid: question.uuid, solution_text: '', solution_image_url: '' });
            }
        } else {
             setEditedSolution(solution);
        }
    }
    fetchSolution();
  }, [question, solution]);

  const handleQuestionChange = (field: keyof Question, value: any) => {
    setEditedQuestion(prev => ({ ...prev, [field]: value }));
  };

  const handleSolutionChange = (field: keyof Solution, value: any) => {
    setEditedSolution(prev => ({ ...(prev || { uuid: editedQuestion.uuid, solution_text: '', solution_image_url: '' }), [field]: value }));
  };

  const handleSave = () => {
    onSave(editedQuestion, editedSolution);
  };

  // Create a combined question object for the preview to ensure it updates instantly
  const previewQuestion = {
      ...editedQuestion,
      solution: editedSolution
  };

  return (
    <div className="question-editor-layout animate-fade-in">
      {/* Left Pane: Preview */}
      <aside className="editor-preview-pane">
        <h3 className="pane-title">
          <span className="material-symbols-outlined">visibility</span>
          Student Preview
        </h3>
        <div className="preview-card-container">
          <QuestionDisplay question={previewQuestion} showAnswer={true} />
        </div>
      </aside>

      {/* Right Pane: Editor */}
      <section className="editor-form-pane">
        <div className="editor-header">
          <h2 className="pane-title">Editing Interface</h2>
        </div>
        <div className="editor-form-body">
          {/* Section: Question Text */}
          <div className="form-section">
            <label className="form-section-title">Question Statement</label>
            <textarea
              className="form-control"
              rows={5}
              value={editedQuestion.question || ''}
              onChange={(e) => handleQuestionChange('question', e.target.value)}
              placeholder="Type your question here... Use LaTeX for math like $x^2$."
            />
             <input
              type="text"
              className="form-control"
              value={editedQuestion.question_image_url || ''}
              onChange={(e) => handleQuestionChange('question_image_url', e.target.value)}
              placeholder="Question Image URL (optional)"
            />
          </div>

          {/* Section: Options */}
          <div className="form-section">
            <label className="form-section-title">Options</label>
            <div className="options-grid">
              {(['a', 'b', 'c', 'd'] as const).map(opt => (
                <div key={opt} className="option-input-group">
                  <input
                    type="radio"
                    name="correct_answer"
                    checked={editedQuestion.answer === opt.toUpperCase()}
                    onChange={() => handleQuestionChange('answer', opt.toUpperCase())}
                  />
                  <div className="option-input">
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Option ${opt.toUpperCase()} text`}
                      value={editedQuestion[`option_${opt}`] || ''}
                      onChange={(e) => handleQuestionChange(`option_${opt}`, e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Option ${opt.toUpperCase()} Image URL (optional)`}
                       value={editedQuestion[`option_${opt}_image_url`] || ''}
                       onChange={(e) => handleQuestionChange(`option_${opt}_image_url`, e.target.value)}
                    />
                  </div>
                </div>
              ))}
               {/* For numerical answers */}
              <div className="option-input-group">
                <input
                    type="radio"
                    name="correct_answer"
                    checked={!['A', 'B', 'C', 'D'].includes(editedQuestion.answer.toUpperCase())}
                    onChange={() => handleQuestionChange('answer', '')} // Clear to allow numerical input
                />
                 <div className="option-input">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Numerical Answer"
                        value={!['A', 'B', 'C', 'D'].includes(editedQuestion.answer.toUpperCase()) ? editedQuestion.answer : ''}
                        onChange={(e) => handleQuestionChange('answer', e.target.value)}
                    />
                 </div>
              </div>
            </div>
          </div>

          {/* Section: Solution */}
          <div className="form-section">
            <label className="form-section-title">Detailed Solution</label>
             <textarea
              className="form-control"
              rows={4}
              value={editedSolution?.solution_text || ''}
              onChange={(e) => handleSolutionChange('solution_text', e.target.value)}
              placeholder="Explain the logic behind the correct answer..."
            />
            <input
              type="text"
              className="form-control"
              placeholder="Solution Image URL (optional)"
              value={editedSolution?.solution_image_url || ''}
              onChange={(e) => handleSolutionChange('solution_image_url', e.target.value)}
            />
          </div>

          {/* Section: Properties */}
          <div className="form-section">
            <h4 className="form-section-title">Properties</h4>
            <div className="properties-grid">
                <div className="form-group">
                    <label>Topic (Tag 1)</label>
                    <input
                        type="text"
                        className="form-control"
                        value={editedQuestion.tag_1 || ''}
                        onChange={(e) => handleQuestionChange('tag_1', e.target.value)}
                        placeholder="e.g. Mechanics, Thermodynamics"
                    />
                </div>
                 <div className="form-group">
                    <label>Chapter (Tag 2)</label>
                    <select
                        className="form-control"
                        value={editedQuestion.tag_2 || ''}
                        onChange={(e) => handleQuestionChange('tag_2', e.target.value)}
                    >
                        <option value="">Select a chapter...</option>
                        {validChaptersForSection.map(ch => (
                            <option key={ch.code} value={ch.code}>
                                {ch.code} - {ch.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Difficulty (Tag 3)</label>
                    <select
                        className="form-control"
                        value={editedQuestion.tag_3 || 'M'}
                        onChange={(e) => handleQuestionChange('tag_3', e.target.value as Difficulty)}
                    >
                        <option value="E">Easy</option>
                        <option value="M">Medium</option>
                        <option value="H">Hard</option>
                    </select>
                </div>
                 <div className="form-group">
                    <label>Tags (Tag 4)</label>
                    <input
                        type="text"
                        className="form-control"
                        value={editedQuestion.tag_4 || ''}
                        onChange={(e) => handleQuestionChange('tag_4', e.target.value)}
                         placeholder="e.g. Conceptual, Formula-based"
                    />
                </div>
                 <div className="form-group">
                    <label>Question Type</label>
                    <input
                        type="text"
                        className="form-control"
                        value={editedQuestion.type || ''}
                        onChange={(e) => handleQuestionChange('type', e.target.value)}
                        placeholder="e.g. Single Correct MCQ"
                    />
                </div>
                <div className="form-group">
                    <label>Exam Year / Reference</label>
                    <input
                        type="text"
                        className="form-control"
                        value={editedQuestion.year || ''}
                        onChange={(e) => handleQuestionChange('year', e.target.value)}
                        placeholder="e.g. JEE Main 2023"
                    />
                </div>
            </div>
          </div>
        </div>
        <div className="editor-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>
            <span className="material-symbols-outlined">save</span>
            Save Changes
          </button>
        </div>
      </section>
    </div>
  );
};

export default QuestionEditor;
