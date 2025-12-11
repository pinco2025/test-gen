import React, { useState } from 'react';
import { Question } from '../types';
import LatexRenderer from './LatexRenderer';

interface AddQuestionModalProps {
  onClose: () => void;
  onSave: (question: Question) => Promise<void>;
}

const AddQuestionModal: React.FC<AddQuestionModalProps> = ({ onClose, onSave }) => {
  const [form, setForm] = useState<Partial<Question>>({
    question: '',
    question_image_url: '',
    option_a: '',
    option_a_image_url: '',
    option_b: '',
    option_b_image_url: '',
    option_c: '',
    option_c_image_url: '',
    option_d: '',
    option_d_image_url: '',
    answer: 'A',
    type: 'MCQ',
    year: new Date().getFullYear().toString(),
    tag_1: '',
    tag_2: '',
    tag_3: '',
    tag_4: '',
    frequency: 0
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const handleChange = (field: keyof Question, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Basic validation
    if (!form.question) {
      alert('Question text is required');
      return;
    }
    if (!form.answer) {
      alert('Answer is required');
      return;
    }

    const newQuestion: Question = {
      uuid: crypto.randomUUID(),
      question: form.question || '',
      question_image_url: form.question_image_url || null,
      option_a: form.option_a || null,
      option_a_image_url: form.option_a_image_url || null,
      option_b: form.option_b || null,
      option_b_image_url: form.option_b_image_url || null,
      option_c: form.option_c || null,
      option_c_image_url: form.option_c_image_url || null,
      option_d: form.option_d || null,
      option_d_image_url: form.option_d_image_url || null,
      answer: form.answer as any,
      type: form.type || 'MCQ',
      year: form.year || null,
      tag_1: form.tag_1 || null,
      tag_2: form.tag_2 || null,
      tag_3: form.tag_3 || null,
      tag_4: form.tag_4 || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      frequency: 0
    };

    await onSave(newQuestion);
  };

  return (
    <div className="modal-overlay">
      <div className="edit-modal" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>Add New Question</h3>
          <button className="icon-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                    className="btn-secondary"
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    type="button"
                >
                    {isPreviewMode ? 'Edit Mode' : 'Preview Mode'}
                </button>
            </div>

          {isPreviewMode ? (
             <div className="preview-container" style={{background: 'var(--bg-light)', padding: '1rem', borderRadius: '8px'}}>
                <div style={{marginBottom: '0.5rem'}}>
                  <strong>Question:</strong><br/>
                  <div style={{marginTop: '0.5rem'}}>
                      <LatexRenderer content={form.question || ''} />
                  </div>
                  {form.question_image_url && (
                    <img src={form.question_image_url} alt="Question" style={{maxWidth: '100%', maxHeight: '300px', marginTop: '10px'}} />
                  )}
                </div>

                <div className="options-preview" style={{display: 'grid', gap: '0.5rem', marginTop: '1rem'}}>
                    {['A', 'B', 'C', 'D'].map(opt => {
                        const key = `option_${opt.toLowerCase()}` as keyof Question;
                        const imgKey = `option_${opt.toLowerCase()}_image_url` as keyof Question;
                        const text = form[key] as string;
                        const img = form[imgKey] as string;

                        if (!text && !img) return null;

                        return (
                            <div key={opt} style={{display: 'flex', gap: '0.5rem', alignItems: 'flex-start'}}>
                                <strong>{opt})</strong>
                                <div style={{flex: 1}}>
                                    <LatexRenderer content={text || ''} />
                                    {img && (
                                        <div style={{marginTop: '0.5rem'}}>
                                          <img src={img} alt={`Option ${opt}`} style={{maxWidth: '100px', maxHeight: '100px'}} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{marginTop: '1rem'}}>
                    <strong>Correct Answer:</strong> {form.answer}
                </div>
             </div>
          ) : (
            <div className="form-grid" style={{ display: 'grid', gap: '1rem' }}>

              {/* Question */}
              <div className="form-group">
                <label>Question Text</label>
                <textarea
                  value={form.question || ''}
                  onChange={(e) => handleChange('question', e.target.value)}
                  rows={4}
                  placeholder="Enter question text (LaTeX supported)"
                />
              </div>
              <div className="form-group">
                <label>Question Image URL</label>
                <input
                  type="text"
                  value={form.question_image_url || ''}
                  onChange={(e) => handleChange('question_image_url', e.target.value)}
                  placeholder="http://..."
                />
              </div>

              {/* Options */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {['A', 'B', 'C', 'D'].map((opt) => (
                  <div key={opt} style={{ border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '4px' }}>
                    <div className="form-group">
                        <label>Option {opt} Text</label>
                        <textarea
                        value={(form[`option_${opt.toLowerCase()}` as keyof Question] as string) || ''}
                        onChange={(e) => handleChange(`option_${opt.toLowerCase()}` as keyof Question, e.target.value)}
                        rows={2}
                        />
                    </div>
                    <div className="form-group">
                        <label>Option {opt} Image URL</label>
                        <input
                        type="text"
                        value={(form[`option_${opt.toLowerCase()}_image_url` as keyof Question] as string) || ''}
                        onChange={(e) => handleChange(`option_${opt.toLowerCase()}_image_url` as keyof Question, e.target.value)}
                        />
                    </div>
                  </div>
                ))}
              </div>

              {/* Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                 <div className="form-group">
                    <label>Correct Answer</label>
                    <select
                        value={form.answer}
                        onChange={(e) => handleChange('answer', e.target.value)}
                    >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        {/* Allow custom input for integer type questions if needed? The schema enforces A/B/C/D but user might want integer */}
                    </select>
                    {/* If we want to support integer answers for Division 2, we might need a text input toggled by type */}
                    <input
                        type="text"
                        placeholder="Or type value..."
                        value={form.answer}
                        onChange={(e) => handleChange('answer', e.target.value)}
                        style={{ marginTop: '5px' }}
                    />
                 </div>
                 <div className="form-group">
                    <label>Type</label>
                    <input
                        type="text"
                        value={form.type || ''}
                        onChange={(e) => handleChange('type', e.target.value)}
                        list="type-suggestions"
                    />
                    <datalist id="type-suggestions">
                        <option value="MCQ" />
                        <option value="Integer" />
                    </datalist>
                 </div>
                 <div className="form-group">
                    <label>Year</label>
                    <input
                        type="text"
                        value={form.year || ''}
                        onChange={(e) => handleChange('year', e.target.value)}
                    />
                 </div>
              </div>

              {/* Tags */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Tag 1 (Chapter Code)</label>
                    <input
                        type="text"
                        value={form.tag_1 || ''}
                        onChange={(e) => handleChange('tag_1', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tag 2 (e.g. Topic)</label>
                    <input
                        type="text"
                        value={form.tag_2 || ''}
                        onChange={(e) => handleChange('tag_2', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tag 3 (Difficulty)</label>
                    <select
                        value={form.tag_3 || ''}
                        onChange={(e) => handleChange('tag_3', e.target.value)}
                    >
                        <option value="">Select...</option>
                        <option value="E">Easy</option>
                        <option value="M">Medium</option>
                        <option value="H">Hard</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tag 4 (Other)</label>
                    <input
                        type="text"
                        value={form.tag_4 || ''}
                        onChange={(e) => handleChange('tag_4', e.target.value)}
                    />
                  </div>
              </div>

            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Question</button>
        </div>
      </div>
    </div>
  );
};

export default AddQuestionModal;
