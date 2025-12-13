
import React from 'react';
import { SectionConfig, WorkflowStep } from '../types';

interface TestNavigationProps {
  currentStep: WorkflowStep;
  sections: SectionConfig[];
  onNavigate: (step: WorkflowStep, sectionIndex?: number) => void;
}

const TestNavigation: React.FC<TestNavigationProps> = ({ currentStep, sections, onNavigate }) => {
  // Navigation is only relevant during question selection and review
  const validSteps: WorkflowStep[] = [
    'question-select-physics',
    'question-select-chemistry',
    'question-select-math',
    'test-review'
  ];

  if (!validSteps.includes(currentStep)) return null;

  const physicsQuestions = sections[0]?.selectedQuestions.length || 0;
  const chemistryQuestions = sections[1]?.selectedQuestions.length || 0;
  const mathQuestions = sections[2]?.selectedQuestions.length || 0;

  // Constraints check: Check if alpha constraints are set (chapters array is not empty)
  const isPhysicsConstraintSet = sections[0]?.alphaConstraint?.chapters?.length > 0;
  const isChemistryConstraintSet = sections[1]?.alphaConstraint?.chapters?.length > 0;
  const isMathConstraintSet = sections[2]?.alphaConstraint?.chapters?.length > 0;

  const totalRequired = 25;
  const canReview = physicsQuestions >= totalRequired &&
                    chemistryQuestions >= totalRequired &&
                    mathQuestions >= totalRequired;

  const getButtonClass = (isActive: boolean) => {
    return `
      px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-3
      ${isActive
        ? 'bg-primary text-white shadow-md'
        : 'bg-surface-light dark:bg-surface-dark text-text-main dark:text-white hover:bg-background-light dark:hover:bg-background-dark border border-border-light dark:border-border-dark'
      }
    `.trim();
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <button
          className={getButtonClass(currentStep === 'question-select-physics')}
          onClick={() => {
            if (isPhysicsConstraintSet) {
              onNavigate('question-select-physics', 0);
            } else {
              onNavigate('section-config-physics', 0);
            }
          }}
        >
          <span className="font-semibold">Physics</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            currentStep === 'question-select-physics'
              ? 'bg-white/20 text-white'
              : 'bg-primary/10 text-primary'
          }`}>
            {physicsQuestions}
          </span>
        </button>
        <button
          className={getButtonClass(currentStep === 'question-select-chemistry')}
          onClick={() => {
            if (isChemistryConstraintSet) {
              onNavigate('question-select-chemistry', 1);
            } else {
              onNavigate('section-config-chemistry', 1);
            }
          }}
        >
          <span className="font-semibold">Chemistry</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            currentStep === 'question-select-chemistry'
              ? 'bg-white/20 text-white'
              : 'bg-primary/10 text-primary'
          }`}>
            {chemistryQuestions}
          </span>
        </button>
        <button
          className={getButtonClass(currentStep === 'question-select-math')}
          onClick={() => {
            if (isMathConstraintSet) {
              onNavigate('question-select-math', 2);
            } else {
              onNavigate('section-config-math', 2);
            }
          }}
        >
          <span className="font-semibold">Mathematics</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            currentStep === 'question-select-math'
              ? 'bg-white/20 text-white'
              : 'bg-primary/10 text-primary'
          }`}>
            {mathQuestions}
          </span>
        </button>
        <div className="flex-1"></div>
        <button
          className={`
            px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
            ${currentStep === 'test-review'
              ? 'bg-green-600 text-white shadow-md'
              : canReview
                ? 'bg-surface-light dark:bg-surface-dark text-text-main dark:text-white hover:bg-green-50 dark:hover:bg-green-900/20 border border-border-light dark:border-border-dark hover:border-green-600'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border border-gray-300 dark:border-gray-700'
            }
          `.trim()}
          onClick={() => canReview && onNavigate('test-review')}
          disabled={!canReview}
          title={!canReview ? `Need 25 questions per section (P: ${physicsQuestions}, C: ${chemistryQuestions}, M: ${mathQuestions})` : ''}
        >
          <span className="material-symbols-outlined text-xl">assignment_turned_in</span>
          <span className="font-semibold">Review & Export</span>
        </button>
      </div>
    </div>
  );
};

export default TestNavigation;
