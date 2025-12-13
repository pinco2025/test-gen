import React, { useState } from 'react';
import { Question, Solution } from '../types';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-dark.css'; // Keep this for the editor's syntax highlighting theme
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
  "question": "...",
  "options": { "A": "...", "B": "..." },
  "answer": "A",
  "tags": { "chapter": "...", "difficulty": "..." },
  "solution": { "text": "...", "image": "..." }
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
                <QuestionDisplay question={previewData.question} showAnswer={true} />
                {previewData.solution && (
                  <div className="p-4 mt-6 border rounded-lg bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark">
                    <h5 className="mb-2 text-base font-bold">Solution</h5>
                    {previewData.solution.solution_text && (
                      <div className="mb-4 prose prose-sm dark:prose-invert">
                        <LatexRenderer content={previewData.solution.solution_text} />
                      </div>
                    )}
                    {previewData.solution.solution_image_url && (
                      <img src={previewData.solution.solution_image_url} alt="Solution" className="max-w-full max-h-[300px] rounded" />
                    )}
                  </div>
                )}
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
                  <h4 className="text-sm font-semibold text-text-secondary">Sample JSON</h4>
                  <pre className="p-2 mt-2 overflow-x-auto text-xs rounded bg-surface-light dark:bg-surface-dark">
                    <code>{sampleJsonMCQ}</code>
                  </pre>
                  <div className="mt-4 text-xs text-text-secondary">
                    <p className="font-semibold">Structure:</p>
                    <ul className="pl-4 mt-1 list-disc">
                      <li><code>options</code>: Object with keys A-D (for MCQ). Omit for Integer type.</li>
                      <li><code>solution</code>: Optional object with <code>text</code> and <code>image</code>.</li>
                      <li><code>tags</code>: Map to chapter, difficulty, etc.</li>
                    </ul>
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
