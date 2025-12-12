import React, { useState } from 'react';
import { Question } from '../types';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-dark.css';

interface AddQuestionModalProps {
  onClose: () => void;
  onSave: (question: Question) => Promise<void>;
}

const AddQuestionModal: React.FC<AddQuestionModalProps> = ({ onClose, onSave }) => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonInput(text);
      validateJson(text);
    } catch (err) {
      console.error('Failed to read clipboard', err);
      // Fallback if permission denied
      // We cannot programmatically focus and paste without user interaction in the same way with the Editor component
      // But we can prompt the user or try to focus the editor container if we had a ref
      // For now, just rely on standard paste if clipboard API fails
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

  const handleSave = async () => {
    try {
        const data = JSON.parse(jsonInput);

        // Basic validation of required fields
        if (!data.question || !data.answer) {
            setError('Missing required fields: question, answer');
            return;
        }

        const newQuestion: Question = {
            uuid: crypto.randomUUID(),
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

        await onSave(newQuestion);
        onClose(); // Close modal on success
    } catch (e: any) {
        setError('Invalid JSON: ' + e.message);
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
  }
}`;

  const sampleJsonInteger = `{
  "question": "Calculate 25 * 4",
  "answer": "100",
  "type": "Integer",
  "tags": {
    "chapter": "MATH01",
    "difficulty": "E"
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

        <div className="edit-modal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0' }}>
            <div style={{ padding: '1rem', flex: 1, display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ fontWeight: 'bold' }}>JSON Input</label>
                        <button
                            className="btn-secondary"
                            onClick={handlePaste}
                            style={{ padding: '2px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                             <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>content_paste</span>
                             Paste
                        </button>
                    </div>

                    <div style={{
                        flex: 1,
                        border: error ? '1px solid #ff4d4f' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#1e1e1e' // Match VS Code dark theme somewhat
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
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-light)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', overflowY: 'auto' }}>
                        <h4 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Sample MCQ</h4>
                        <pre style={{ margin: 0, fontSize: '0.75rem', overflowX: 'auto', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: '4px' }}>
                            {sampleJsonMCQ}
                        </pre>

                        <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Sample Integer</h4>
                        <pre style={{ margin: 0, fontSize: '0.75rem', overflowX: 'auto', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: '4px' }}>
                            {sampleJsonInteger}
                        </pre>

                        <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <p><strong>Note:</strong></p>
                            <ul style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
                                <li>Use <code>options</code> object for MCQ (A, B, C, D).</li>
                                <li>For images in options, use object <code>{`{ "text": "...", "image": "..." }`}</code>.</li>
                                <li>For Integer, omit options and provide answer value.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="edit-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
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
