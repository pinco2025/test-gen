import React from 'react';
import { Question } from '../types';
import LatexRenderer from './LatexRenderer';

interface QuestionDisplayProps {
  question: Question;
  showAnswer?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
  showCheckbox?: boolean;
}

/**
 * Component to display a question with LaTeX rendering
 */
export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  showAnswer = false,
  onSelect,
  isSelected = false,
  showCheckbox = false
}) => {
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

      <div className="question-header">
        <span className="question-id">{question.uuid}</span>
        <span className="question-type">{question.type}</span>
        {question.year && <span className="question-year">{question.year}</span>}
      </div>

      <div className="question-content">
        <div className="question-text">
          <strong>Question: </strong>
          <LatexRenderer content={question.question} />
        </div>

        {question.question_schematic && (
          <div className="question-schematic">
            <LatexRenderer content={question.question_schematic} block />
          </div>
        )}
      </div>

      <div className="question-options">
        {['a', 'b', 'c', 'd'].map((option) => {
          const optionKey = `option_${option}` as keyof Question;
          const schematicKey = `option_${option}_schematic` as keyof Question;
          const optionText = question[optionKey] as string | null;
          const schematic = question[schematicKey] as string | null;

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
                {schematic && (
                  <div className="option-schematic">
                    <LatexRenderer content={schematic} block />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
