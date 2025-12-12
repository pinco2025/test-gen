import React, { useState } from 'react';
import { Question, Solution } from '../types';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-dark.css';
import QuestionDisplay from './QuestionDisplay';
import LatexRenderer from './LatexRenderer';

interface AddQuestionModalProps {
  onClose: () => void;
  onSave: (question: Question, solution?: Partial<Solution>) => Promise<void>;
}

const AddQuestionModal: React.FC<AddQuestionModalProps> = ({ onClose, onSave }) => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<{ question: Question; solution?: Partial<Solution> } | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonInput(text);
      validateJson(text);
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  const validateJson = (text: string) => {
      try {
          if (!text.trim()) {
              setError(null);
              return;
          }
          JSON.parse(text);
          setError(null);
      } catch (e: any) {
          setError(e.message);
      }
  };

  const handleEditorChange = (code: string) => {
      setJsonInput(code);
      validateJson(code);
  };

  const parseInput = (): { question: Question; solution?: Partial<Solution> } | null => {
      try {
        const data = JSON.parse(jsonInput);

        if (!data.question || !data.answer) {
            setError('Missing required fields: question, answer');
            return null;
        }

        const newQuestion: Question = {
            uuid: crypto.randomUUID(), // This might change on save, but good for preview
            question: data.question,
            question_image_url: data.question_image_url || null,
            option_a: data.options?.A?.text || data.options?.A || null,
            option_a_image_url: data.options?.A?.image || null,
            option_b: data.options?.B?.text || data.options?.B || null,
            option_b_image_url: data.options?.B?.image || null,
            option_c: data.options?.C?.text || data.options?.C || null,
            option_c_image_url: data.options?.C?.image || null,
            option_d: data.options?.D?.text || data.options?.D || null,
            option_d_image_url: data.options?.D?.image || null,
            answer: data.answer,
            type: data.type || (data.options ? 'MCQ' : 'Integer'),
            year: data.year || new Date().getFullYear().toString(),
            tag_1: data.tags?.chapter || data.tags?.tag_1 || null,
            tag_2: data.tags?.topic || data.tags?.tag_2 || null,
            tag_3: data.tags?.difficulty || data.tags?.tag_3 || null,
            tag_4: data.tags?.other || data.tags?.tag_4 || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            frequency: 0
        };

        let solution: Partial<Solution> | undefined;
        if (data.solution) {
            solution = {
                solution_text: data.solution.text || data.solution.solution_text || '',
                solution_image_url: data.solution.image || data.solution.solution_image_url || ''
            };
        }

        return { question: newQuestion, solution };
      } catch (e: any) {
          setError('Invalid JSON: ' + e.message);
          return null;
      }
  };

  const handlePreview = () => {
      const parsed = parseInput();
      if (parsed) {
          setPreviewData(parsed);
          setIsPreviewMode(true);
      }
  };

  const handleSave = async () => {
    const parsed = parseInput();
    if (parsed) {
        await onSave(parsed.question, parsed.solution);
        onClose();
    }
  };

  const sampleJsonMCQ = `{
  "question": "What is the speed of light?",
  "question_image_url": null,
  "options": {
    "A": "3x10^8 m/s",
    "B": "3x10^6 m/s",
    "C": "300 km/h",
    "D": "Infinite"
  },
  "answer": "A",
  "type": "MCQ",
  "tags": {
    "chapter": "PHY01",
    "difficulty": "E"
  },
  "solution": {
    "text": "Light travels at approx 3x10^8 m/s in vacuum.",
    "image": "http://example.com/solution.png"
  }
}`;

  return (
    <div className="modal-overlay animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="edit-modal animate-fade-in" style={{ maxWidth: '900px', width: '90%', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="edit-modal-header">
          <h3>
             <span className="material-symbols-outlined" style={{ marginRight: '0.5rem' }}>data_object</span>
             Add New Question (JSON)
          </h3>
          <button className="edit-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="edit-modal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
            {isPreviewMode && previewData ? (
                <div className="preview-container" style={{ padding: '1.5rem', overflowY: 'auto', height: '100%', backgroundColor: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                         <h4 style={{ margin: 0 }}>Preview</h4>
                         <button className="btn-secondary" onClick={() => setIsPreviewMode(false)}>
                             <span className="material-symbols-outlined">edit</span>
                             Back to Edit
                         </button>
                    </div>

                    <QuestionDisplay
                        question={previewData.question}
                        showAnswer={true}
                    />

                    {previewData.solution && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card)' }}>
                            <h5 style={{ marginTop: 0 }}>Solution</h5>
                            {previewData.solution.solution_text && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <LatexRenderer content={previewData.solution.solution_text} />
                                </div>
                            )}
                            {previewData.solution.solution_image_url && (
                                <img
                                    src={previewData.solution.solution_image_url}
                                    alt="Solution"
                                    style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px' }}
                                />
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ padding: '1rem', flex: 1, display: 'flex', gap: '1rem', height: '100%', overflow: 'hidden' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <label style={{ fontWeight: 'bold' }}>JSON Input</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn-secondary"
                                    onClick={handlePaste}
                                    style={{ padding: '2px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>content_paste</span>
                                    Paste
                                </button>
                            </div>
                        </div>

                        <div style={{
                            flex: 1,
                            border: error ? '1px solid #ff4d4f' : '1px solid var(--border-color)',
                            borderRadius: 'var(--radius)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundColor: '#1e1e1e'
                        }}>
                            <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
                                <Editor
                                    value={jsonInput}
                                    onValueChange={handleEditorChange}
                                    highlight={code => highlight(code, languages.json, 'json')}
                                    padding={10}
                                    style={{
                                        fontFamily: '"Fira code", "Fira Mono", monospace',
                                        fontSize: 14,
                                        backgroundColor: '#1e1e1e',
                                        color: '#d4d4d4',
                                        minHeight: '100%'
                                    }}
                                    textareaClassName="code-editor-textarea"
                                />
                            </div>
                        </div>

                        {error && <div style={{ color: '#ff4d4f', marginTop: '0.5rem', fontSize: '0.9rem' }}>{error}</div>}
                    </div>

                    <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-light)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', overflowY: 'auto', flex: 1 }}>
                            <h4 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Sample JSON</h4>
                            <pre style={{ margin: 0, fontSize: '0.75rem', overflowX: 'auto', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: '4px' }}>
                                {sampleJsonMCQ}
                            </pre>

                            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                <p><strong>Structure:</strong></p>
                                <ul style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
                                    <li><code>options</code>: Object with keys A-D (MCQ). Omit for Integer type.</li>
                                    <li><code>solution</code>: Optional object with <code>text</code> and <code>image</code>.</li>
                                    <li><code>tags</code>: Map to chapter, difficulty, etc.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="edit-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          {!isPreviewMode && (
              <button
                className="btn-secondary"
                onClick={handlePreview}
                disabled={!!error || !jsonInput.trim()}
              >
                <span className="material-symbols-outlined">visibility</span>
                Generate Preview
              </button>
          )}
          <button className="btn-primary" onClick={handleSave} disabled={!!error || !jsonInput.trim()}>
            <span className="material-symbols-outlined">save</span>
            Add Question
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddQuestionModal;
