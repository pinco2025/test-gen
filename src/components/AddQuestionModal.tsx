import React, { useState } from 'react';
import { Question, Solution } from '../types';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-dark.css'; // Keep this for the editor's syntax highlighting theme
import QuestionDisplay from './QuestionDisplay';

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

  // Recursive function to double-escape backslashes in strings
  const escapeBackslashes = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/\\/g, '\\\\');
    } else if (Array.isArray(obj)) {
      return obj.map(escapeBackslashes);
    } else if (typeof obj === 'object' && obj !== null) {
      const newObj: any = {};
      for (const key in obj) {
        newObj[key] = escapeBackslashes(obj[key]);
      }
      return newObj;
    }
    return obj;
  };

  const parseInput = (): { question: Question; solution?: Partial<Solution> } | null => {
    try {
      let data = JSON.parse(jsonInput);

      // Escape backslashes in all string fields to ensure they are stored with double backslashes
      // This is necessary because the JSON parser consumes one level of escaping,
      // but we want to preserve the double backslashes for LaTeX rendering and storage.
      data = escapeBackslashes(data);

      // Validate required fields
      if (!data.question || !data.answer || !data.type) {
        setError('Missing required fields: question, answer, type');
        return null;
      }

      // Create question object using exact database schema
      const newQuestion: Question = {
        uuid: data.uuid || crypto.randomUUID(),
        question: data.question,
        question_image_url: data.question_image_url || null,
        option_a: data.option_a || null,
        option_a_image_url: data.option_a_image_url || null,
        option_b: data.option_b || null,
        option_b_image_url: data.option_b_image_url || null,
        option_c: data.option_c || null,
        option_c_image_url: data.option_c_image_url || null,
        option_d: data.option_d || null,
        option_d_image_url: data.option_d_image_url || null,
        answer: data.answer,
        type: data.type,
        year: data.year || null,
        tag_1: data.tag_1 || null,
        tag_2: data.tag_2 || null,
        tag_3: data.tag_3 || null,
        tag_4: data.tag_4 || null,
        topic_tags: data.topic_tags || null,
        importance_level: data.importance_level || null,
        verification_level_1: data.verification_level_1 || null,
        verification_level_2: data.verification_level_2 || null,
        jee_mains_relevance: data.jee_mains_relevance || null,
        is_multi_concept: data.is_multi_concept || null,
        related_concepts: data.related_concepts || null,
        legacy_question: data.legacy_question || null,
        legacy_a: data.legacy_a || null,
        legacy_b: data.legacy_b || null,
        legacy_c: data.legacy_c || null,
        legacy_d: data.legacy_d || null,
        legacy_solution: data.legacy_solution || null,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        frequency: data.frequency || 0
      };

      // Parse solution if provided
      let solution: Partial<Solution> | undefined;
      if (data.solution) {
        solution = {
          solution_text: data.solution.solution_text || '',
          solution_image_url: data.solution.solution_image_url || ''
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
    // If we already have preview data, use that to maintain the same UUID shown in preview
    const dataToSave = previewData || parseInput();
    if (dataToSave) {
      await onSave(dataToSave.question, dataToSave.solution);
      onClose();
    }
  };

  const sampleJsonMCQ = `{
  "question": "What is the derivative of x²?",
  "question_image_url": null,
  "option_a": "2x",
  "option_a_image_url": null,
  "option_b": "x",
  "option_b_image_url": null,
  "option_c": "2",
  "option_c_image_url": null,
  "option_d": "x²",
  "option_d_image_url": null,
  "answer": "a",
  "type": "MCQ",
  "year": "2024",
  "tag_1": "Mathematics",
  "tag_2": "MAT01",
  "tag_3": "E",
  "tag_4": null,
  "solution": {
    "solution_text": "Using power rule...",
    "solution_image_url": null
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-4xl border shadow-lg h-[85vh] bg-surface-light dark:bg-surface-dark rounded-xl border-border-light dark:border-border-dark">
        <header className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark shrink-0">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <span className="material-symbols-outlined">data_object</span>
            Add New Question (JSON)
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <main className="flex-1 overflow-hidden">
          {isPreviewMode && previewData ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark">
                <h4 className="font-bold">Preview</h4>
                <button onClick={() => setIsPreviewMode(false)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border rounded-md text-text-secondary border-border-light dark:border-border-dark hover:bg-black/5 dark:hover:bg-white/5">
                  <span className="material-symbols-outlined text-base">edit</span>
                  Back to Edit
                </button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <QuestionDisplay
                  question={{
                    ...previewData.question,
                    solution: previewData.solution as Solution
                  }}
                  showAnswer={true}
                />
              </div>
            </div>
          ) : (
            <div className="grid h-full grid-cols-12 gap-4 p-4">
              <div className="flex flex-col col-span-8 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold">JSON Input</label>
                  <button onClick={handlePaste} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold transition-colors border rounded-md text-text-secondary border-border-light dark:border-border-dark hover:bg-black/5 dark:hover:bg-white/5">
                    <span className="material-symbols-outlined text-sm">content_paste</span>
                    Paste
                  </button>
                </div>
                <div className={`flex-1 overflow-hidden border rounded-md ${error ? 'border-red-500' : 'border-border-light dark:border-border-dark'} bg-white dark:bg-[#1e1e1e]`}>
                  <div className="h-full overflow-auto">
                    <Editor
                      value={jsonInput}
                      onValueChange={handleEditorChange}
                      highlight={code => highlight(code, languages.json, 'json')}
                      padding={10}
                      style={{
                        fontFamily: '"Fira code", "Fira Mono", monospace',
                        fontSize: 14,
                        minHeight: '100%',
                        color: '#1f2937'
                      }}
                      className="dark:text-gray-100"
                      textareaClassName="!outline-none dark:!text-gray-100"
                    />
                  </div>
                </div>
                {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
              </div>

              <div className="flex flex-col col-span-4 gap-4 overflow-hidden">
                <div className="flex-1 p-4 overflow-y-auto border rounded-lg bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark">
                  <h4 className="text-sm font-semibold text-text-secondary">Sample JSON (Database Schema)</h4>
                  <pre className="p-2 mt-2 overflow-x-auto text-xs rounded bg-surface-light dark:bg-surface-dark">
                    <code>{sampleJsonMCQ}</code>
                  </pre>
                  <div className="mt-4 text-xs text-text-secondary">
                    <p className="font-semibold">Required Fields:</p>
                    <ul className="pl-4 mt-1 list-disc space-y-1">
                      <li><code>question</code>: Question text</li>
                      <li><code>answer</code>: Answer (a/b/c/d for MCQ, number for Integer)</li>
                      <li><code>type</code>: Question type (MCQ, Integer, etc.)</li>
                    </ul>
                    <p className="mt-3 font-semibold">Optional Fields:</p>
                    <ul className="pl-4 mt-1 list-disc space-y-1">
                      <li><code>option_a/b/c/d</code>: Option texts (for MCQ)</li>
                      <li><code>option_a/b/c/d_image_url</code>: Option images</li>
                      <li><code>question_image_url</code>: Question image</li>
                      <li><code>year</code>: Year</li>
                      <li><code>tag_1/2/3/4</code>: Tags</li>
                      <li><code>solution</code>: Object with <code>solution_text</code> and <code>solution_image_url</code></li>
                    </ul>
                    <p className="mt-3 text-xs italic">All other fields are auto-generated (uuid, timestamps, frequency)</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="flex items-center justify-end gap-3 p-4 border-t shrink-0 bg-background-light dark:bg-background-dark/50 border-border-light dark:border-border-dark">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-border-light dark:border-border-dark text-text-secondary hover:text-text-main dark:hover:text-white hover:bg-white dark:hover:bg-white/5 text-sm font-semibold transition-all">Cancel</button>
          {!isPreviewMode && (
            <button onClick={handlePreview} disabled={!!error || !jsonInput.trim()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border-light dark:border-border-dark text-text-secondary hover:text-text-main dark:hover:text-white hover:bg-white dark:hover:bg-white/5 text-sm font-semibold transition-all disabled:opacity-50">
              <span className="material-symbols-outlined text-base">visibility</span>
              Generate Preview
            </button>
          )}
          <button onClick={handleSave} disabled={!!error || !jsonInput.trim()} className="px-6 py-2.5 rounded-lg bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/90 text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50">
            <span className="material-symbols-outlined text-base">save</span>
            Add Question
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AddQuestionModal;
