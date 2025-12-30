import React, { useState } from 'react';
import TestReview from './TestReview';
import { SectionConfig, Question } from '../types';

interface SuperAdminDashboardProps {
  onClose: () => void;
}

// Mock Data Generators
const generateMockQuestion = (id: string, type: string = 'MCQ'): Question => ({
    uuid: id,
    question: `Mock Question ${id} - This is a sample question content used for testing the UI layout.`,
    question_image_url: null,
    option_a: 'Option A Content',
    option_a_image_url: null,
    option_b: 'Option B Content',
    option_b_image_url: null,
    option_c: 'Option C Content',
    option_c_image_url: null,
    option_d: 'Option D Content',
    option_d_image_url: null,
    answer: 'A',
    type: type,
    year: '2023',
    tag_1: 'Topic A',
    tag_2: 'Chapter X',
    tag_3: 'M',
    tag_4: 'Subtopic Y',
    topic_tags: '["Topic A"]',
    importance_level: 'core',
    verification_level_1: 'pending',
    verification_level_2: 'pending',
    jee_mains_relevance: 5,
    is_multi_concept: false,
    related_concepts: '[]',
    scary: false,
    calc: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    frequency: 0,
    legacy_question: null,
    legacy_a: null,
    legacy_b: null,
    legacy_c: null,
    legacy_d: null,
    legacy_solution: null,
    links: '[]'
});

const generateMockSections = (isFull: boolean): SectionConfig[] => {
    const sections: SectionConfig[] = [
        { name: 'Physics', chapters: [], alphaConstraint: { chapters: [] }, betaConstraint: {}, selectedQuestions: [] },
        { name: 'Chemistry', chapters: [], alphaConstraint: { chapters: [] }, betaConstraint: {}, selectedQuestions: [] },
        { name: 'Mathematics', chapters: [], alphaConstraint: { chapters: [] }, betaConstraint: {}, selectedQuestions: [] }
    ];

    sections.forEach((sec, idx) => {
        const count = isFull ? 30 : 25; // 30 for full, 25 for part
        for (let i = 0; i < count; i++) {
            const q = generateMockQuestion(`mock-${sec.name}-${i}`, i > 20 ? 'INTEGER' : 'MCQ');
            sec.selectedQuestions.push({
                question: q,
                chapterCode: `CH${idx}${Math.floor(i/5)}`,
                chapterName: `Chapter ${idx}-${Math.floor(i/5)}`,
                difficulty: 'M',
                division: i < 20 ? 1 : 2,
                status: 'pending'
            });
        }
    });

    return sections;
};

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onClose }) => {
  const [mockView, setMockView] = useState<'none' | 'test-review-part' | 'test-review-full'>('none');

  if (mockView !== 'none') {
      const isFull = mockView === 'test-review-full';
      const sections = generateMockSections(isFull);

      return (
          <div className="fixed inset-0 z-[60] bg-gray-50 dark:bg-[#121121] flex flex-col">
              <div className="bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 px-4 py-1 text-center text-xs font-bold uppercase tracking-wider border-b border-orange-200 dark:border-orange-900/30">
                  ⚠️ Debug Mode: Mock Data Active
              </div>
              <TestReview
                  sections={sections}
                  onStartEditing={(q) => console.log('Mock Edit', q)}
                  onBack={() => setMockView('none')}
                  onExport={() => alert('Export Mock')}
                  onRemoveQuestion={(id) => console.log('Mock Remove', id)}
                  onUpdateQuestionStatus={(id, status) => console.log('Mock Status Update', id, status)}
                  onVerifyQuestion={(id, status) => console.log('Mock Verify', id, status)}
                  onSwitchQuestion={(id) => console.log('Mock Switch', id)}
                  onReplaceQuestion={(oldId, newQ) => console.log('Mock Replace', oldId, newQ)}
              />
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[#121121] text-gray-900 dark:text-white overflow-hidden animate-fade-in">
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1e1e2d] border-b border-gray-200 dark:border-[#2d2d3b]">
        <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">admin_panel_settings</span>
            Super Admin Dashboard
        </h1>
        <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252535] transition-colors"
        >
            <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            <div className="bg-white dark:bg-[#1e1e2d] p-6 rounded-xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">bug_report</span>
                    Debug Tools
                </h2>
                <div className="space-y-2">
                    <button onClick={() => console.log('Dumping Local Storage:', localStorage)} className="w-full text-left px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-[#252535] text-sm">
                        Dump LocalStorage to Console
                    </button>
                    <button onClick={() => window.location.reload()} className="w-full text-left px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-[#252535] text-sm text-red-500">
                        Force Reload Window
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e1e2d] p-6 rounded-xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500">component_exchange</span>
                    Component Tester
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                    Isolate and test specific UI components.
                </p>
                <div className="space-y-2">
                     <button
                        onClick={() => setMockView('test-review-part')}
                        className="w-full text-left px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-[#252535] text-sm flex items-center justify-between group"
                    >
                        <span>Test Review (Part Test)</span>
                        <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                    </button>
                     <button
                        onClick={() => setMockView('test-review-full')}
                        className="w-full text-left px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-[#252535] text-sm flex items-center justify-between group"
                    >
                        <span>Test Review (Full Test)</span>
                        <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e1e2d] p-6 rounded-xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500">database</span>
                    Data Management
                </h2>
                <div className="space-y-2">
                    <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-[#252535] text-sm">
                        Inspect Active Project State
                    </button>
                    <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-[#252535] text-sm">
                        Validate Database Schema
                    </button>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
