import React from 'react';
import { Question } from '../types';
import LatexRenderer from './LatexRenderer';

interface QuestionDisplayProps {
  question: Question;
  showAnswer?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
  showCheckbox?: boolean;
  hideOptions?: boolean;
  questionNumber?: number;
  difficulty?: 'E' | 'M' | 'H';
}

/**
 * Component to display a question with LaTeX rendering
 */
export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  showAnswer = false,
  onSelect,
  isSelected = false,
  showCheckbox = false,
  hideOptions = false,
  questionNumber,
  difficulty
}) => {
  // Get difficulty color
  const getDifficultyColor = (diff?: 'E' | 'M' | 'H') => {
    switch (diff) {
      case 'E':
        return { bg: '#e8f5e9', color: '#2e7d32' }; // Green
      case 'M':
        return { bg: '#fff3e0', color: '#f57c00' }; // Orange
      case 'H':
        return { bg: '#ffebee', color: '#c62828' }; // Red
      default:
        return { bg: '#f5f5f5', color: '#666' }; // Gray
    }
  };

  const difficultyColors = getDifficultyColor(question.tag_3);
  const difficultyLabel = question.tag_3 === 'E' ? 'Easy' : difficulty === 'M' ? 'Medium' : difficulty === 'H' ? 'Hard' : 'Unknown';
  return (
    <div className={`question-card ${isSelected ? 'selected' : ''}`}>
      {showCheckbox && (
        <div className="question-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
          />
        </div>
      )}

      <div className="question-header" style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '6px',
        flexWrap: 'wrap'
      }}>
        {questionNumber !== undefined && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <strong style={{ color: '#666', fontSize: '13px' }}>Q#:</strong>
            <span style={{
              backgroundColor: '#f3e5f5',
              color: '#7b1fa2',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600'
            }}>{questionNumber}</span>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <strong style={{ color: '#666', fontSize: '13px' }}>ID:</strong>
          <span style={{
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'monospace'
          }}>{question.uuid}</span>
        </div>

        {question.tag_2 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <strong style={{ color: '#666', fontSize: '13px' }}>Chapter:</strong>
            <span style={{
              backgroundColor: '#e0f2f1',
              color: '#00695c',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600'
            }}>{question.tag_2}</span>
          </div>
        )}

        {difficulty && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <strong style={{ color: '#666', fontSize: '13px' }}>Difficulty:</strong>
            <span style={{
              backgroundColor: difficultyColors.bg,
              color: difficultyColors.color,
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600'
            }}>{question.tag_3}</span>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <strong style={{ color: '#666', fontSize: '13px' }}>Type:</strong>
          <span style={{
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600'
          }}>{question.type}</span>
        </div>

        {question.year && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <strong style={{ color: '#666', fontSize: '13px' }}>Year:</strong>
            <span style={{
              backgroundColor: '#fff3e0',
              color: '#f57c00',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600'
            }}>{question.year}</span>
          </div>
        )}
      </div>

      <div className="question-content">
        <div className="question-text">
          <strong>Question: </strong>
          <LatexRenderer content={question.question} />
        </div>
      </div>

      {!hideOptions && (
        <div className="question-options">
          {['a', 'b', 'c', 'd'].map((option) => {
            const optionKey = `option_${option}` as keyof Question;
            const optionText = question[optionKey] as string | null;

            if (!optionText) return null;

            const isCorrect = showAnswer && question.answer.toLowerCase() === option;

            return (
              <div
                key={option}
                className={`option ${isCorrect ? 'correct-answer' : ''}`}
              >
                <span className="option-label">{option.toUpperCase()})</span>
                <div className="option-content">
                  <LatexRenderer content={optionText} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAnswer && (
        <div className="question-answer">
          <strong>Answer: {question.answer}</strong>
        </div>
      )}

      <div className="question-tags">
        {[question.tag_1, question.tag_2, question.tag_3, question.tag_4]
          .filter(Boolean)
          .map((tag, idx) => (
            <span key={idx} className="tag">
              {tag}
            </span>
          ))}
      </div>
    </div>
  );
};

export default QuestionDisplay;
