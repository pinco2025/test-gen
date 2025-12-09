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
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.625rem',
        marginBottom: '1rem',
        padding: '0.875rem',
        backgroundColor: 'var(--bg-light)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border-light)'
      }}>
        {question.tag_1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <strong style={{ color: 'var(--text-muted-light)', fontSize: '0.75rem' }}>Q#:</strong>
            <span style={{
              backgroundColor: 'var(--purple-bg)',
              color: 'var(--purple)',
              padding: '0.125rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: '600'
            }}>{question.tag_1}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <strong style={{ color: 'var(--text-muted-light)', fontSize: '0.75rem' }}>ID:</strong>
          <span style={{
            backgroundColor: 'var(--info-bg)',
            color: 'var(--info)',
            padding: '0.25rem 0.625rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            fontWeight: '600',
            fontFamily: 'monospace'
          }}>{question.uuid}</span>
        </div>

        {question.tag_2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <strong style={{ color: 'var(--text-muted-light)', fontSize: '0.75rem' }}>Chapter:</strong>
            <span style={{
              backgroundColor: 'var(--teal-bg)',
              color: 'var(--teal)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: '600'
            }}>{question.tag_2}</span>
          </div>
        )}

        {question.tag_3 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <strong style={{ color: 'var(--text-muted-light)', fontSize: '0.75rem' }}>Difficulty:</strong>
            <span style={{
              ...difficultyStyle,
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: '600'
            }}>{question.tag_3}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <strong style={{ color: 'var(--text-muted-light)', fontSize: '0.75rem' }}>Type:</strong>
          <span style={{
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '0.25rem 0.625rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            fontWeight: '600'
          }}>{question.type}</span>
        </div>

        {question.year && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <strong style={{ color: 'var(--text-muted-light)', fontSize: '0.75rem' }}>Year:</strong>
            <span style={{
              backgroundColor: 'var(--amber-bg)',
              color: 'var(--amber)',
              padding: '0.25rem 0.625rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: '600'
            }}>{question.year}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <strong style={{ color: 'var(--text-muted-light)', fontSize: '0.75rem' }}>Freq:</strong>
          <span style={{
            backgroundColor: (question.frequency || 0) > 0 ? 'var(--purple-bg)' : 'var(--bg-light)',
            color: (question.frequency || 0) > 0 ? 'var(--purple)' : 'var(--text-muted-light)',
            padding: '0.25rem 0.625rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            fontWeight: '600'
          }}>{question.frequency || 0}</span>
        </div>
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
              style={{maxWidth: '100%', maxHeight: '300px', border: '1px solid #ddd'}}
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
