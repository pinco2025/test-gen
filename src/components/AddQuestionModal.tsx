import React, { useState, useEffect } from 'react';
import { Question, Solution } from '../types';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-dark.css';
import QuestionDisplay from './QuestionDisplay';

interface AddQuestionModalProps {
  onClose: () => void;
  onSave: (question: Question, solution?: Partial<Solution>) => Promise<void>;
  initialData?: Question | null;
  isIPQMode?: boolean;
}

const AddQuestionModal: React.FC<AddQuestionModalProps> = ({ onClose, onSave, initialData, isIPQMode = false }) => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<{ question: Question; solution?: Partial<Solution> } | null>(null);

  // Initialize with initialData if provided (IPQ Mode)
  useEffect(() => {
    if (initialData) {
        // IPQ Mode: Do NOT pre-fill the JSON with metadata.
        // The goal is to allow the user to paste a generated JSON that contains ONLY the new content.
        // We will merge the metadata automatically in parseInput.

        // Just set a minimal template or empty string
        const template = {
            question: "Paste question text here...",
            answer: "A",
            type: "IPQ"
        };
        setJsonInput(JSON.stringify(template, null, 2));
    }
  }, [initialData]);

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
      const data = JSON.parse(text);

      // Enforce IPQ constraints if in IPQ mode
      if (isIPQMode && data.type !== 'IPQ') {
          setError('Type must be "IPQ" for this operation.');
          return;
      }

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

      // Validate required fields
      if (data.question === undefined) data.question = '';
      if (!data.answer || !data.type) {
        setError('Missing required fields: answer, type');
        return null;
      }

      // If in IPQ mode, merge with initialData to inherit metadata
      let mergedData = { ...data };
      if (isIPQMode && initialData) {
          mergedData = {
              ...mergedData,
              // Inherit metadata from original question
              year: initialData.year,
              tag_1: initialData.tag_1,
              tag_2: initialData.tag_2,
              tag_3: initialData.tag_3,
              tag_4: initialData.tag_4,
              topic_tags: initialData.topic_tags,
              jee_mains_relevance: initialData.jee_mains_relevance,
              importance_level: initialData.importance_level,
              related_concepts: initialData.related_concepts,
              is_multi_concept: initialData.is_multi_concept,
              // Force type to IPQ if not already set (though validation checks it)
              type: 'IPQ'
          };
      }

      // Create question object using exact database schema
      const newQuestion: Question = {
        uuid: mergedData.uuid || crypto.randomUUID(),
        question: mergedData.question || '',
        question_image_url: mergedData.question_image_url || null,
        option_a: mergedData.option_a || null,
        option_a_image_url: mergedData.option_a_image_url || null,
        option_b: mergedData.option_b || null,
        option_b_image_url: mergedData.option_b_image_url || null,
        option_c: mergedData.option_c || null,
        option_c_image_url: mergedData.option_c_image_url || null,
        option_d: mergedData.option_d || null,
        option_d_image_url: mergedData.option_d_image_url || null,
        answer: mergedData.answer,
        type: mergedData.type,
        year: mergedData.year || null,
        tag_1: mergedData.tag_1 || null,
        tag_2: mergedData.tag_2 || null,
        tag_3: mergedData.tag_3 || null,
        tag_4: mergedData.tag_4 || null,
        topic_tags: mergedData.topic_tags || null,
        importance_level: mergedData.importance_level || null,
        verification_level_1: mergedData.verification_level_1 || null,
        verification_level_2: mergedData.verification_level_2 || null,
        jee_mains_relevance: mergedData.jee_mains_relevance || null,
        is_multi_concept: mergedData.is_multi_concept || null,
        scary: mergedData.scary || false,
        calc: mergedData.calc || false,
        related_concepts: mergedData.related_concepts || null,
        legacy_question: mergedData.legacy_question || null,
        legacy_a: mergedData.legacy_a || null,
        legacy_b: mergedData.legacy_b || null,
        legacy_c: mergedData.legacy_c || null,
        legacy_d: mergedData.legacy_d || null,
        legacy_solution: mergedData.legacy_solution || null,
        links: mergedData.links || null,
        created_at: mergedData.created_at || new Date().toISOString(),
        updated_at: mergedData.updated_at || new Date().toISOString(),
        frequency: mergedData.frequency || 0
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
    const dataToSave = previewData || parseInput();
    if (dataToSave) {
      await onSave(dataToSave.question, dataToSave.solution);
      onClose();
    }
  };

  const sampleJsonMCQ = `{
  "question": "Question text...",
  "answer": "a",
  "type": "MCQ"
}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-5xl h-[85vh] bg-white dark:bg-[#1e1e2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2d2d3b] overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200">

        {/* Modern Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#2d2d3b] bg-gray-50/80 dark:bg-[#252535]/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isIPQMode ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-primary/10 text-primary'}`}>
                <span className="material-symbols-outlined text-xl">
                    {isIPQMode ? 'swap_calls' : 'data_object'}
                </span>
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {isIPQMode ? 'Add IPQ Replacement' : 'Add New Question'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isIPQMode ? 'Create a variant question linked to the original' : 'Paste JSON or type manually'}
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-500">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {isPreviewMode && previewData ? (
            <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-[#121121] border-b border-gray-200 dark:border-[#2d2d3b]">
                <h4 className="font-bold text-gray-700 dark:text-gray-200">Live Preview</h4>
                <button onClick={() => setIsPreviewMode(false)} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors border rounded-lg text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-white/5">
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Back to Code
                </button>
              </div>
              <div className="flex-1 p-8 overflow-y-auto bg-gray-100 dark:bg-[#121121]">
                <div className="max-w-3xl mx-auto bg-white dark:bg-[#1e1e2d] rounded-xl shadow-sm border border-gray-200 dark:border-[#2d2d3b]">
                    <QuestionDisplay
                    question={{
                        ...previewData.question,
                        solution: previewData.solution as Solution
                    }}
                    showAnswer={true}
                    />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid h-full grid-cols-12">
              {/* Editor Pane */}
              <div className="col-span-8 flex flex-col border-r border-gray-200 dark:border-[#2d2d3b] bg-[#f8f9fa] dark:bg-[#1e1e1e]">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-[#2d2d3b]">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">JSON Source</label>
                  <button onClick={handlePaste} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 rounded transition-colors">
                    <span className="material-symbols-outlined text-sm">content_paste</span>
                    Paste from Clipboard
                  </button>
                </div>
                <div className={`flex-1 overflow-hidden relative ${error ? 'border-2 border-red-500/50' : ''}`}>
                  <div className="absolute inset-0 overflow-auto custom-scrollbar">
                    <Editor
                      value={jsonInput}
                      onValueChange={handleEditorChange}
                      highlight={code => highlight(code, languages.json, 'json')}
                      padding={20}
                      style={{
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                        fontSize: 14,
                        minHeight: '100%',
                        backgroundColor: 'transparent',
                      }}
                      className="dark:text-gray-200"
                      textareaClassName="focus:outline-none"
                    />
                  </div>
                </div>
                {error && (
                    <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {error}
                    </div>
                )}
              </div>

              {/* Sidebar Info */}
              <div className="col-span-4 flex flex-col bg-white dark:bg-[#1e1e2d]">
                <div className="p-6 overflow-y-auto">
                    {isIPQMode ? (
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 mb-4 border border-blue-100 dark:border-blue-900/30">
                            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">info</span>
                                IPQ Mode Active
                            </h4>
                            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                                This new question will be linked to the original.
                                Metadata (Tags, Year) has been pre-filled.
                                <strong>Type is locked to 'IPQ'.</strong>
                            </p>
                        </div>
                    ) : null}

                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Schema Reference</h4>
                  <div className="bg-gray-50 dark:bg-[#121121] rounded-lg p-3 border border-gray-200 dark:border-[#2d2d3b] mb-4">
                    <pre className="text-[10px] text-gray-600 dark:text-gray-400 overflow-x-auto font-mono">
                        {sampleJsonMCQ}
                    </pre>
                  </div>

                  <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">Required Fields</p>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 pl-4 list-disc marker:text-gray-400">
                            <li><code>question</code> (String)</li>
                            <li><code>answer</code> (String)</li>
                            <li><code>type</code> (String)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">Optional Assets</p>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 pl-4 list-disc marker:text-gray-400">
                            <li><code>*_image_url</code> fields</li>
                            <li><code>solution</code> object</li>
                        </ul>
                      </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-[#2d2d3b] bg-white dark:bg-[#1e1e2d] shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
            Cancel
          </button>

          {!isPreviewMode && (
            <button
                onClick={handlePreview}
                disabled={!!error || !jsonInput.trim()}
                className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-[#3f3f4e] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">visibility</span>
              Preview
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!!error || !jsonInput.trim()}
            className="px-6 py-2.5 rounded-lg bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:bg-primary/90 text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 duration-100"
          >
            <span className="material-symbols-outlined text-lg">save</span>
            {isIPQMode ? 'Save IPQ' : 'Add Question'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AddQuestionModal;
