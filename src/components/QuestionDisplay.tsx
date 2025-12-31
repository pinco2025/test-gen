import { memo, useState } from 'react';
import { Question, Solution } from '../types';
import LatexRenderer from './LatexRenderer';

interface QuestionDisplayProps {
  question: Question & { solution?: Solution }; // Allow optional solution for preview
  showAnswer?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
  showCheckbox?: boolean;
  hideOptions?: boolean;
  questionNumber?: number;
  highlightCorrectAnswer?: boolean;
  defaultSolutionExpanded?: boolean;
  showSolutionToggle?: boolean;
  isSolutionExpanded?: boolean;
  onToggleSolution?: () => void;
}

const CopyButton = ({ text, tooltip, className = "" }: { text: string, tooltip: string, className?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : tooltip}
      className={`p-1 rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-white/10 text-text-secondary ${copied ? 'text-green-500' : ''} ${className}`}
    >
      <span className="material-symbols-outlined text-lg">
        {copied ? 'check' : 'content_copy'}
      </span>
    </button>
  );
};

export const QuestionDisplay = memo<QuestionDisplayProps>(({
  question,
  showAnswer = false,
  onSelect,
  isSelected = false,
  showCheckbox = false,
  hideOptions = false,
  questionNumber,
  highlightCorrectAnswer = false,
  defaultSolutionExpanded = false,
  showSolutionToggle = false,
  isSolutionExpanded,
  onToggleSolution
}) => {
  const [copiedUuid, setCopiedUuid] = useState(false);
  const [internalIsSolutionVisible, setInternalIsSolutionVisible] = useState(defaultSolutionExpanded);

  const isVisible = isSolutionExpanded !== undefined ? isSolutionExpanded : internalIsSolutionVisible;
  const toggleVisibility = () => {
    if (onToggleSolution) {
      onToggleSolution();
    } else {
      setInternalIsSolutionVisible(!internalIsSolutionVisible);
    }
  };

  const handleCopyUuid = () => {
    navigator.clipboard.writeText(question.uuid);
    setCopiedUuid(true);
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  const getDifficultyClass = (diff?: 'E' | 'M' | 'H') => {
    switch (diff) {
      case 'E': return 'bg-green-100 text-green-700 border-green-200';
      case 'M': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'H': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Verification Tint
  const getVerificationTint = () => {
    switch (question.verification_level_1) {
        case 'approved': return 'bg-green-50/50 dark:bg-green-900/10';
        case 'rejected': return 'bg-red-50/50 dark:bg-red-900/10';
        default: return '';
    }
  };

  return (
    <div className={`flex flex-col gap-6 relative p-4 rounded-xl transition-colors ${getVerificationTint()} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
       {showCheckbox && (
         <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="absolute top-4 left-4 size-5 accent-primary"
          />
       )}

      {/* Copy Question Button */}
      <div className="absolute top-4 right-4 z-10">
        <CopyButton text={question.question} tooltip="Copy Question Text" />
      </div>

      {/* Header with Metadata */}
      <div className="flex flex-wrap items-center gap-2 pr-8">
         {questionNumber !== undefined && (
          <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 dark:bg-white/5 text-text-secondary border border-border-light dark:border-border-dark">
            Q. {questionNumber}
          </span>
         )}
         {question.type && <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">{question.type}</span>}
         {question.tag_1 && <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 dark:bg-primary/20 text-primary">{question.tag_1}</span>}
         {question.tag_2 && <span className="text-xs font-medium px-2 py-1 rounded-full bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">{question.tag_2}</span>}
         {question.tag_3 && <span className={`text-xs font-medium px-2 py-1 rounded-full ${getDifficultyClass(question.tag_3 as 'E' | 'M' | 'H')}`}>{question.tag_3 === 'E' ? 'Easy' : question.tag_3 === 'M' ? 'Medium' : 'Hard'}</span>}
         {question.year && <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-50 text-yellow-600">{question.year}</span>}

         {/* Frequency Badge */}
         <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" title="Selection Frequency">
            <span className="material-symbols-outlined text-[14px]">analytics</span>
            {question.frequency ?? 0}
         </span>

         <span onClick={handleCopyUuid} title="Click to copy UUID" className="text-xs font-mono px-2 py-1 rounded bg-gray-100 dark:bg-white/10 text-text-secondary cursor-pointer hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
            {copiedUuid ? 'Copied!' : `#${question.uuid.substring(0, 8)}`}
         </span>
      </div>

      {/* Question Body */}
      <div className="space-y-4">
        <div className="text-text-main dark:text-gray-200 text-base leading-relaxed">
            <LatexRenderer content={question.question} />
        </div>
        {question.question_image_url && (
            <div className="w-full h-auto bg-gray-50 dark:bg-black/20 rounded-lg flex items-center justify-center border border-dashed border-border-light dark:border-border-dark p-2">
                <img src={question.question_image_url} alt="Question Diagram" className="max-w-full h-auto rounded" />
            </div>
        )}
      </div>

      {/* Options */}
       {!hideOptions && (
        <div className="grid grid-cols-1 gap-3">
            {(['a', 'b', 'c', 'd'] as const).map(opt => {
                const optionText = question[`option_${opt}`];
                const optionImage = question[`option_${opt}_image_url`];
                if (!optionText && !optionImage) return null;

                const isCorrect = (showAnswer || highlightCorrectAnswer) && question.answer.toUpperCase() === opt.toUpperCase();

                const baseClasses = "group flex items-center p-3 rounded-lg border transition-all cursor-pointer";
                const hoverClasses = "hover:border-primary/50 hover:bg-primary/5";
                const correctClasses = "border-2 border-green-500 bg-green-500/5";

                let finalClasses = `${baseClasses} ${hoverClasses}`;
                if (isCorrect) {
                  finalClasses = `${baseClasses} ${correctClasses}`;
                } else if (isSelected) {
                  // This part can be tricky, if you want to show selection state as well
                  // finalClasses = `${baseClasses} ${selectedClasses}`;
                }

                return (
                    <div key={opt} className={finalClasses}>
                        <div className={`size-6 rounded-full flex items-center justify-center mr-4 text-xs font-bold shrink-0 ${isCorrect ? 'bg-green-500 text-white' : 'border-2 border-border-light dark:border-border-dark group-hover:border-primary text-text-secondary group-hover:text-primary'}`}>
                           {opt.toUpperCase()}
                        </div>
                        <span className="text-text-main dark:text-gray-300">
                           {optionText && <LatexRenderer content={optionText} />}
                           {optionImage && <img src={optionImage} alt={`Option ${opt}`} className="max-w-full mt-2 rounded"/>}
                        </span>
                        {isCorrect && <span className="ml-auto material-symbols-outlined text-green-500 text-lg">check_circle</span>}
                    </div>
                );
            })}
        </div>
       )}

       {/* Integer Type Answer Display */}
       {(showAnswer || highlightCorrectAnswer) && !['A', 'B', 'C', 'D'].includes(question.answer.toUpperCase()) && (
          <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <span className="font-bold text-green-700 dark:text-green-300 mr-2">Answer:</span>
            <span className="font-mono text-lg text-text-main dark:text-gray-200">{question.answer}</span>
          </div>
       )}

      {/* Solution Toggle Section */}
      {showSolutionToggle && ((question.solution && (question.solution.solution_text || question.solution.solution_image_url)) || question.legacy_solution) && (
        <div className="border-t border-border-light dark:border-border-dark pt-2 mt-2">
            <button
                onClick={toggleVisibility}
                className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wide hover:underline focus:outline-none mb-2"
            >
                <span className="material-symbols-outlined text-lg">
                    {isVisible ? 'expand_less' : 'expand_more'}
                </span>
                {isVisible ? 'Hide Solution' : 'Show Solution'}
            </button>

            {isVisible && (
                <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-text-secondary uppercase">Explanation</span>
                        {question.solution?.solution_text && (
                          <CopyButton text={question.solution.solution_text} tooltip="Copy Solution" />
                        )}
                    </div>
                    <div className="text-sm text-text-secondary dark:text-gray-400 leading-relaxed space-y-3">
                       {question.solution?.solution_text && <LatexRenderer content={question.solution.solution_text} />}
                       {question.solution?.solution_image_url && <img src={question.solution.solution_image_url} alt="Solution" className="max-w-full mt-2 rounded border border-border-light dark:border-border-dark" />}
                       {question.legacy_solution && (
                           <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                               <div className="text-xs font-semibold text-text-secondary mb-2">Legacy Solution Image</div>
                               <img src={question.legacy_solution} alt="Legacy Solution" className="max-w-full rounded border border-border-light dark:border-border-dark" />
                           </div>
                       )}
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
});

QuestionDisplay.displayName = 'QuestionDisplay';

export default QuestionDisplay;
