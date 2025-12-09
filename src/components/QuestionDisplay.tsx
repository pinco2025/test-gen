import { memo } from 'react';
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
  highlightCorrectAnswer?: boolean;
}

/**
 * Component to display a question with LaTeX rendering
 * Wrapped in React.memo to prevent unnecessary re-renders
 */
export const QuestionDisplay = memo<QuestionDisplayProps>(({
  question,
  showAnswer = false,
  onSelect,
  isSelected = false,
  showCheckbox = false,
  hideOptions = false,
  questionNumber,
  highlightCorrectAnswer = false
}) => {
  // Silence unused variable warning since we keep it for potential future use or external interface compatibility
  void questionNumber;
  // Get difficulty styling
  const getDifficultyStyle = (diff?: 'E' | 'M' | 'H') => {
    switch (diff) {
      case 'E':
        return { background: 'var(--success-bg)', color: 'var(--success)' };
      case 'M':
        return { background: 'var(--warning-bg)', color: '#f57c00' };
      case 'H':
        return { background: 'var(--error-bg)', color: 'var(--error)' };
      default:
        return { background: 'var(--bg-light)', color: 'var(--text-muted-light)' };
    }
  };

  const difficultyStyle = getDifficultyStyle(question.tag_3 as 'E' | 'M' | 'H');

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
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        alignItems: 'center'
      }}>
        {/* Compact ID & Tags */}
         <span style={{
            backgroundColor: 'var(--bg-main)',
            color: 'var(--text-muted)',
            padding: '0.125rem 0.375rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.7rem',
            fontFamily: 'monospace',
            border: '1px solid var(--border-color)'
          }}>{question.uuid.substring(0, 8)}...</span>

        {question.tag_3 && (
            <span style={{
              ...difficultyStyle,
              padding: '0.125rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem',
              fontWeight: '600'
            }}>{question.tag_3 === 'E' ? 'Easy' : question.tag_3 === 'M' ? 'Medium' : 'Hard'}</span>
        )}

        {question.year && (
             <span style={{
              backgroundColor: 'var(--amber-bg)',
              color: 'var(--amber)',
              padding: '0.125rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem',
              fontWeight: '600'
            }}>{question.year}</span>
        )}

        {question.type && (
            <span style={{
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                padding: '0.125rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem',
                fontWeight: '600'
            }}>{question.type}</span>
        )}

         {question.tag_2 && (
            <span style={{
              backgroundColor: 'var(--teal-bg)',
              color: 'var(--teal)',
              padding: '0.125rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem',
              fontWeight: '600'
            }}>{question.tag_2}</span>
        )}

        {(question.frequency || 0) > 0 && (
          <span style={{
            backgroundColor: 'var(--purple-bg)',
            color: 'var(--purple)',
            padding: '0.125rem 0.5rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.7rem',
            fontWeight: '600'
          }}>Used {question.frequency}x</span>
        )}
      </div>

      <div className="question-content">
        <div className="question-text">
          <strong>Question: </strong>
          <LatexRenderer content={question.question} />
        </div>

        {/* Render Question Image if present */}
        {question.question_image_url && (
          <div className="question-image" style={{margin: '1rem 0', textAlign: 'center'}}>
            <img
              src={question.question_image_url}
              alt="Question Image"
              style={{maxWidth: '100%', maxHeight: '300px', border: '1px solid var(--border-color)'}}
            />
          </div>
        )}
      </div>

      {!hideOptions && (
        <div className="question-options">
          {['a', 'b', 'c', 'd'].map((option) => {
            const optionKey = `option_${option}` as keyof Question;
            const imageKey = `option_${option}_image_url` as keyof Question;
            const optionText = question[optionKey] as string | null;
            const optionImageUrl = question[imageKey] as string | null;

            if (!optionText && !optionImageUrl) return null;

            // Highlight if showAnswer is true OR highlightCorrectAnswer is true
            // AND match the answer
            const isCorrect = (showAnswer || highlightCorrectAnswer) &&
                              question.answer.toLowerCase() === option;

            return (
              <div
                key={option}
                className={`option ${isCorrect ? 'correct-answer' : ''}`}
                style={isCorrect && highlightCorrectAnswer ? {
                    backgroundColor: 'rgba(76, 175, 80, 0.1)', // Light green
                    borderColor: 'var(--success)'
                } : undefined}
              >
                <span className="option-label">{option.toUpperCase()})</span>
                <div className="option-content">
                  {optionText && <LatexRenderer content={optionText} />}
                  {optionImageUrl && (
                    <div style={{marginTop: '0.5rem'}}>
                      <img
                        src={optionImageUrl}
                        alt={`Option ${option.toUpperCase()}`}
                        style={{maxWidth: '100%', maxHeight: '150px'}}
                      />
                    </div>
                  )}
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
    </div>
  );
});

QuestionDisplay.displayName = 'QuestionDisplay';

export default QuestionDisplay;
