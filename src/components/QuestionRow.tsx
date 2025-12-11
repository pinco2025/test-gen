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
  onCloneAndEdit: (e: React.MouseEvent, question: Question) => void;
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
  onCloneAndEdit,
  highlightCorrectAnswer,
  zoomLevel = 1
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClick = useCallback(() => {
    onToggle(question);
  }, [onToggle, question]);

  return (
    <div
      id={`question-row-${question.uuid}`}
      className="question-row-container"
      style={{
        marginBottom: '0.5rem',
        marginRight: '0.5rem',
        width: '100%',
        // @ts-ignore - zoom is a non-standard property but works in Electron/Chrome
        zoom: zoomLevel
      }}
    >
      <div
        className={`selectable-question ${selected ? 'selected' : ''}`}
        onClick={handleClick}
        style={{
          cursor: 'pointer',
          border: selected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          transition: 'border-color 0.15s, background-color 0.15s',
          backgroundColor: selected ? 'var(--primary-light)' : 'var(--bg-card)'
        }}
      >
        <div className="question-card-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.5rem'
        }}>
          <div style={{ flex: 1 }}>
            {isDivision2Question && (
              <div style={{
                background: 'var(--amber)',
                color: 'white',
                padding: '0.25rem 0.625rem',
                borderRadius: 'var(--radius)',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit_note</span>
                NUMERICAL ANSWER ({question.answer}) - Division 2 (B) Only
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              className="question-edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              title="Actions"
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
                padding: '0.375rem 0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                transition: 'var(--transition)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>more_vert</span>
              Actions
            </button>

            {showMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: 'var(--bg-card)',
                boxShadow: 'var(--shadow-md)',
                borderRadius: 'var(--radius)',
                zIndex: 10,
                minWidth: '180px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEdit(e, question);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>edit</span>
                  Edit Properties
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onCloneAndEdit(e, question);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: 'var(--text-primary)'
                  }}
                   onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-light)'}
                   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>content_copy</span>
                  Clone & Edit
                </button>
              </div>
            )}
          </div>
        </div>
        <QuestionDisplay
          question={question}
          showAnswer={highlightCorrectAnswer && !isDivision2Question}
          showCheckbox={false}
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
