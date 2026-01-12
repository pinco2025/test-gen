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
  parentExam?: 'JEE' | 'NEET' | 'BITS';
}

const AddQuestionModal: React.FC<AddQuestionModalProps> = ({ onClose, onSave, initialData, isIPQMode = false, parentExam }) => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<{ question: Question; solution?: Partial<Solution> } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize with initialData if provided (IPQ Mode)
  useEffect(() => {
    if (initialData) {
      // IPQ Mode: Do NOT pre-fill the JSON with metadata.
      // The goal is to allow the user to paste a generated JSON that contains ONLY the new content.
      // We will merge the metadata automatically in parseInput.

      // Just set a minimal template with better structure
      const template = {
        question: "Paste question text here...",
        answer: "A",
        option_a: "Option A text...",
        option_b: "Option B text...",
        option_c: "Option C text...",
        option_d: "Option D text...",
        solution: {
          solution_text: "Explanation for the answer..."
        }
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
      // Relaxed validation: allow type to be missing (it will be auto-filled)
      // BUT if it IS present, it must be 'IPQ'
      if (isIPQMode && data.type && data.type !== 'IPQ') {
        setError('Type must be "IPQ" for this operation (or omit it).');
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

      // If IPQ Mode, 'type' is optional in input (we add it)
      if (!data.answer || (!isIPQMode && !data.type)) {
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

      // Parse solution if provided - support both nested and root-level formats
      let solution: Partial<Solution> | undefined;
      console.log('[AddQuestionModal] Parsing solution from JSON:');
      console.log('  data.solution:', data.solution);
      console.log('  data.solution_text:', data.solution_text);

      if (data.solution) {
        // Nested format: { solution: { solution_text: "..." } }
        solution = {
          uuid: newQuestion.uuid,
          solution_text: data.solution.solution_text || data.solution.text || '',
          solution_image_url: data.solution.solution_image_url || data.solution.image_url || ''
        };
        console.log('  Parsed nested solution - solution_text:', `"${solution.solution_text}"`);
        console.log('  Parsed nested solution - solution_image_url:', `"${solution.solution_image_url}"`);
      } else if (data.solution_text || data.solution_image_url) {
        // Root-level format: { solution_text: "..." }
        solution = {
          uuid: newQuestion.uuid,
          solution_text: data.solution_text || '',
          solution_image_url: data.solution_image_url || ''
        };
        console.log('  Parsed root-level solution:', solution);
      } else {
        console.log('  No solution found in input');
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
    if (isSaving) return;
    const dataToSave = previewData || parseInput();
    console.log('[AddQuestionModal] handleSave called:');
    console.log('  previewData:', previewData);
    console.log('  dataToSave:', dataToSave);
    console.log('  dataToSave.solution:', dataToSave?.solution);
    if (dataToSave) {
      setIsSaving(true);
      try {
        console.log('[AddQuestionModal] Calling onSave with:');
        console.log('  question.uuid:', dataToSave.question.uuid);
        console.log('  solution:', dataToSave.solution);
        await onSave(dataToSave.question, dataToSave.solution);
        onClose();
      } catch (err) {
        // onSave failed, do not close or suppress error
        console.error("Save failed in AddQuestionModal", err);
        setError("Failed to save question: " + (err instanceof Error ? err.message : String(err)));
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-5xl h-[85vh] bg-white dark:bg-[#1e1e2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2d2d3b] overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200">

        {/* Modern Header - Minimal */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-[#2d2d3b] bg-white dark:bg-[#1e1e2d] shrink-0">
          <div className="flex items-center gap-3">
            {isIPQMode ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-500/20">
                <span className="material-symbols-outlined text-base">add_notes</span>
                Create IPQ
              </div>
            ) : (
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Question</h3>
            )}
            {isIPQMode && parentExam && (
              <span className="px-2 py-1 text-xs font-semibold rounded-md bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300" title="Source exam for this IPQ">
                from {parentExam}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <span className="material-symbols-outlined text-xl">close</span>
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
                    showSolutionToggle={true}
                    defaultSolutionExpanded={true}
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

              {/* Minimal Sidebar */}
              <div className="col-span-4 flex flex-col bg-gray-50 dark:bg-[#121121]">
                <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">

                  {/* IPQ Mode Indicator - Minimal */}
                  {isIPQMode && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-200/50 dark:border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500 text-lg">link</span>
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Linked to original</span>
                      </div>
                      <div className="group relative">
                        <span className="material-symbols-outlined text-gray-400 text-lg cursor-help hover:text-gray-600 dark:hover:text-gray-300 transition-colors">info</span>
                        <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-gray-900 rounded-lg text-xs text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                          <p className="leading-relaxed">This IPQ inherits metadata (tags, year, chapter) from the source question. Type is set to 'IPQ'.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Schema Reference - Collapsible */}
                  <details className="group">
                    <summary className="flex items-center justify-between p-3 bg-white dark:bg-[#1e1e2d] rounded-lg border border-gray-200 dark:border-[#2d2d3b] cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors list-none">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">JSON Schema</span>
                      <span className="material-symbols-outlined text-gray-400 group-open:rotate-180 transition-transform">expand_more</span>
                    </summary>
                    <div className="mt-2 p-3 bg-[#1e1e1e] rounded-lg border border-gray-700">
                      <pre className="text-[11px] text-gray-400 font-mono leading-relaxed">
                        {`{
  "question": "...",
  "answer": "A",
  "option_a": "...",
  "option_b": "...",
  "option_c": "...",
  "option_d": "..."
}`}
                      </pre>
                    </div>
                  </details>

                  {/* Quick Tips - Minimal Pills */}
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-full text-gray-600 dark:text-gray-400" title="Required field">
                      answer ✓
                    </span>
                    <span className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-full text-gray-600 dark:text-gray-400" title="Required field">
                      question ✓
                    </span>
                    <span className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-full text-gray-500 dark:text-gray-500" title="Optional">
                      solution
                    </span>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Paste Hint */}
                  <div className="text-center text-xs text-gray-400">
                    Paste JSON or type in the editor
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer - Minimal */}
        <footer className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 dark:border-[#2d2d3b] bg-gray-50 dark:bg-[#121121] shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
            Cancel
          </button>

          {!isPreviewMode && (
            <button
              onClick={handlePreview}
              disabled={!!error || !jsonInput.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">visibility</span>
              Preview
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!!error || !jsonInput.trim() || isSaving}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 duration-100"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">sync</span>
                Saving
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">check</span>
                {isIPQMode ? 'Create IPQ' : 'Add'}
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AddQuestionModal;
