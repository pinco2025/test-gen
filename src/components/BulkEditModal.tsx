import React, { useState } from 'react';
import { Question } from '../types';

interface BulkEditModalProps {
  selectedCount: number;
  onSave: (updates: Partial<Question>) => void;
  onCancel: () => void;
  availableTypes: string[];
  availableYears: string[];
  availableChapters: { code: string; name: string; subject: string }[];
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({
  selectedCount,
  onSave,
  onCancel,
  availableTypes,
  availableYears,
  availableChapters
}) => {
  // We use "undefined" to represent "No Change"
  const [updates, setUpdates] = useState<Partial<Question>>({});

  // Helper to handle simple field changes
  const handleChange = (field: keyof Question, value: any) => {
    if (value === '__NO_CHANGE__') {
      setUpdates(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else {
      setUpdates(prev => ({ ...prev, [field]: value }));
    }
  };

  // State for boolean fields (tristate: no-change, true, false)
  const handleBooleanChange = (field: keyof Question, value: string) => {
     if (value === '__NO_CHANGE__') {
         handleChange(field, '__NO_CHANGE__');
     } else {
         handleChange(field, value === 'true');
     }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1e1e2d] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-[#2d2d3b] animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2d2d3b]">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Edit Questions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Applying changes to <span className="font-bold text-primary">{selectedCount}</span> selected questions
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2d2d3b] text-gray-500 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 mt-0.5">info</span>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    Fields left as <strong>"No Change"</strong> will retain their original values for each question. Only modified fields will be updated.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Topic (Tag 1) */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Topic (Tag 1)</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 bg-white dark:bg-[#121121] border border-gray-300 dark:border-[#2d2d3b] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
                        value={updates.tag_1 || ''}
                        placeholder={updates.tag_1 === undefined ? "-- No Change --" : "Enter topic name"}
                        onChange={(e) => handleChange('tag_1', e.target.value === '' ? '__NO_CHANGE__' : e.target.value)}
                    />
                    {updates.tag_1 === undefined && <div className="text-xs text-gray-500 italic">Leave empty to keep original values</div>}
                </div>

                {/* Chapter Code (Tag 2) */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chapter Code (Tag 2)</label>
                    <select
                        className="w-full px-3 py-2 bg-white dark:bg-[#121121] border border-gray-300 dark:border-[#2d2d3b] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
                        value={updates.tag_2 || '__NO_CHANGE__'}
                        onChange={(e) => handleChange('tag_2', e.target.value)}
                    >
                        <option value="__NO_CHANGE__" className="text-gray-500 italic">-- No Change --</option>
                        {availableChapters.map(chapter => (
                            <option key={chapter.code} value={chapter.code}>
                                {chapter.code} - {chapter.name} ({chapter.subject})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Question Type */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Question Type</label>
                    <select
                        className="w-full px-3 py-2 bg-white dark:bg-[#121121] border border-gray-300 dark:border-[#2d2d3b] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
                        value={updates.type || '__NO_CHANGE__'}
                        onChange={(e) => handleChange('type', e.target.value)}
                    >
                        <option value="__NO_CHANGE__" className="text-gray-500 italic">-- No Change --</option>
                        {availableTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                {/* Exam Year */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Exam Year</label>
                    <select
                        className="w-full px-3 py-2 bg-white dark:bg-[#121121] border border-gray-300 dark:border-[#2d2d3b] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
                        value={updates.year || '__NO_CHANGE__'}
                        onChange={(e) => handleChange('year', e.target.value)}
                    >
                        <option value="__NO_CHANGE__" className="text-gray-500 italic">-- No Change --</option>
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Difficulty</label>
                    <select
                        className="w-full px-3 py-2 bg-white dark:bg-[#121121] border border-gray-300 dark:border-[#2d2d3b] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
                        value={updates.tag_3 || '__NO_CHANGE__'}
                        onChange={(e) => handleChange('tag_3', e.target.value)}
                    >
                        <option value="__NO_CHANGE__" className="text-gray-500 italic">-- No Change --</option>
                        <option value="E">Easy</option>
                        <option value="M">Medium</option>
                        <option value="H">Hard</option>
                    </select>
                </div>

                {/* Importance Level */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Importance Level</label>
                    <select
                        className="w-full px-3 py-2 bg-white dark:bg-[#121121] border border-gray-300 dark:border-[#2d2d3b] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
                        value={updates.importance_level || '__NO_CHANGE__'}
                        onChange={(e) => handleChange('importance_level', e.target.value)}
                    >
                        <option value="__NO_CHANGE__" className="text-gray-500 italic">-- No Change --</option>
                        <option value="core">Core</option>
                        <option value="basic">Basic</option>
                        <option value="advanced">Advanced</option>
                        <option value="niche">Niche</option>
                    </select>
                </div>

                {/* JEE Mains Relevance */}
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">JEE Mains Relevance</label>
                    <select
                        className="w-full px-3 py-2 bg-white dark:bg-[#121121] border border-gray-300 dark:border-[#2d2d3b] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
                        value={updates.jee_mains_relevance !== undefined && updates.jee_mains_relevance !== null ? updates.jee_mains_relevance : '__NO_CHANGE__'}
                        onChange={(e) => handleChange('jee_mains_relevance', e.target.value === '__NO_CHANGE__' ? '__NO_CHANGE__' : parseInt(e.target.value))}
                    >
                        <option value="__NO_CHANGE__" className="text-gray-500 italic">-- No Change --</option>
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                    </select>
                </div>

                {/* Verification Level 1 */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Verification Level 1</label>
                    <select
                        className="w-full px-3 py-2 bg-white dark:bg-[#121121] border border-gray-300 dark:border-[#2d2d3b] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
                        value={updates.verification_level_1 || '__NO_CHANGE__'}
                        onChange={(e) => handleChange('verification_level_1', e.target.value)}
                    >
                        <option value="__NO_CHANGE__" className="text-gray-500 italic">-- No Change --</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                 {/* Verification Level 2 */}
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Verification Level 2</label>
                    <select
                        className="w-full px-3 py-2 bg-white dark:bg-[#121121] border border-gray-300 dark:border-[#2d2d3b] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
                        value={updates.verification_level_2 || '__NO_CHANGE__'}
                        onChange={(e) => handleChange('verification_level_2', e.target.value)}
                    >
                        <option value="__NO_CHANGE__" className="text-gray-500 italic">-- No Change --</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                {/* Boolean Flags */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Difficult from view (Scary)</label>
                     <select
                        className="w-full px-3 py-2 bg-white dark:bg-[#121121] border border-gray-300 dark:border-[#2d2d3b] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
                        value={updates.scary === undefined ? '__NO_CHANGE__' : String(updates.scary)}
                        onChange={(e) => handleBooleanChange('scary', e.target.value)}
                    >
                        <option value="__NO_CHANGE__" className="text-gray-500 italic">-- No Change --</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Calculation Intensive</label>
                     <select
                        className="w-full px-3 py-2 bg-white dark:bg-[#121121] border border-gray-300 dark:border-[#2d2d3b] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
                        value={updates.calc === undefined ? '__NO_CHANGE__' : String(updates.calc)}
                        onChange={(e) => handleBooleanChange('calc', e.target.value)}
                    >
                        <option value="__NO_CHANGE__" className="text-gray-500 italic">-- No Change --</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-[#2d2d3b] flex justify-end gap-3 bg-gray-50 dark:bg-[#1e1e2d] rounded-b-xl">
             <button
                onClick={onCancel}
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-[#2d2d3b] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-[#2d2d3b] transition-colors"
            >
                Cancel
            </button>
            <button
                onClick={() => onSave(updates)}
                className="px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                disabled={Object.keys(updates).length === 0}
            >
                <span className="material-symbols-outlined text-[20px]">save_as</span>
                Update {selectedCount} Questions
            </button>
        </div>
      </div>
    </div>
  );
};

export default BulkEditModal;
