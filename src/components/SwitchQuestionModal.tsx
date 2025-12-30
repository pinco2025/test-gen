import React from 'react';
import { Question } from '../types';

interface SwitchQuestionModalProps {
  onClose: () => void;
  onSwitchWithIPQ: () => void;
  onCloneAndEdit: () => void;
  onSelectFromChapter: () => void;
  question: Question;
}

const SwitchQuestionModal: React.FC<SwitchQuestionModalProps> = ({
  onClose,
  onSwitchWithIPQ,
  onCloneAndEdit,
  onSelectFromChapter,
  question
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e1e2d] rounded-xl shadow-2xl p-6 w-full max-w-lg border border-border-light dark:border-border-dark transform scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Switch Question</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select how you want to replace this question</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={onSwitchWithIPQ}
            className="w-full flex items-center p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group text-left"
          >
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
              <span className="material-symbols-outlined text-xl">compare_arrows</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Switch with IPQ</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Existing functionality to swap with an IPQ question.</p>
            </div>
          </button>

          <button
            onClick={onCloneAndEdit}
            className="w-full flex items-center p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all group text-left"
          >
            <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mr-4 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
              <span className="material-symbols-outlined text-xl">content_copy</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Clone and Edit</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Create a copy, link to original, and edit the new version.</p>
            </div>
          </button>

          <button
            onClick={onSelectFromChapter}
            className="w-full flex items-center p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all group text-left"
          >
            <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-4 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
              <span className="material-symbols-outlined text-xl">library_books</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Select from Chapter</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pick a replacement question from {question.tag_2 || 'the same chapter'}.</p>
            </div>
          </button>
        </div>

        <div className="mt-4 flex justify-end">
             <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
             >
                 Cancel
             </button>
        </div>
      </div>
    </div>
  );
};

export default SwitchQuestionModal;
