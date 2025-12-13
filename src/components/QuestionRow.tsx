import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Question } from '../types';
import QuestionDisplay from './QuestionDisplay';

interface QuestionRowProps {
  question: Question;
  index: number;
  selected: boolean;
  isDivision2Question: boolean;
  onToggle: (question: Question) => void;
  onEdit: (e: React.MouseEvent, question: Question) => void;
  onClone?: (e: React.MouseEvent, question: Question) => void;
  highlightCorrectAnswer?: boolean;
  zoomLevel?: number;
}

const QuestionRow: React.FC<QuestionRowProps> = React.memo(({
  question,
  index,
  selected,
  isDivision2Question,
  onToggle,
  onEdit,
  onClone,
  highlightCorrectAnswer,
  zoomLevel = 1
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = useCallback(() => onToggle(question), [onToggle, question]);

  return (
    <div id={`question-row-${question.uuid}`} className="pb-6 pr-2" style={{ zoom: zoomLevel }}>
      <div
        onClick={handleClick}
        className={`cursor-pointer rounded-lg p-4 transition-all ${
          selected
            ? 'border-2 border-primary bg-primary/5'
            : 'border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/50'
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            {isDivision2Question && (
              <div className="inline-flex items-center gap-1.5 bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded">
                <span className="material-symbols-outlined text-sm">edit_note</span>
                NUMERICAL ({question.answer}) - Division 2 Only
              </div>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              title="Actions"
              className="flex items-center gap-1 px-2 py-1 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded text-xs text-text-secondary hover:border-primary hover:text-primary"
            >
              <span className="material-symbols-outlined text-base">more_vert</span>
              Actions
            </button>

            {showMenu && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-surface-light dark:bg-surface-dark shadow-lg rounded-md z-10 border border-border-light dark:border-border-dark overflow-hidden">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(e, question); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  Edit Properties
                </button>
                {onClone && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onClone(e, question); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="material-symbols-outlined text-base">content_copy</span>
                    Clone & Edit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <QuestionDisplay
          question={question}
          showAnswer={highlightCorrectAnswer && !isDivision2Question}
          isSelected={selected}
          hideOptions={isDivision2Question}
          questionNumber={index + 1}
          highlightCorrectAnswer={highlightCorrectAnswer && !isDivision2Question}
        />
      </div>
    </div>
  );
});

QuestionRow.displayName = 'QuestionRow';

export default QuestionRow;
