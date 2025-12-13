import React from 'react';
import { SectionConfig, WorkflowStep } from '../types';

interface TestNavigationProps {
  currentStep: WorkflowStep;
  sections: SectionConfig[];
  onNavigate: (step: WorkflowStep, sectionIndex?: number) => void;
}

const TestNavigation: React.FC<TestNavigationProps> = ({ currentStep, sections, onNavigate }) => {
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

  const isPhysicsConstraintSet = sections[0]?.alphaConstraint?.chapters?.length > 0;
  const isChemistryConstraintSet = sections[1]?.alphaConstraint?.chapters?.length > 0;
  const isMathConstraintSet = sections[2]?.alphaConstraint?.chapters?.length > 0;

  const totalRequired = 25;
  const canReview = physicsQuestions >= totalRequired &&
                    chemistryQuestions >= totalRequired &&
                    mathQuestions >= totalRequired;

  return (
    <div className="bg-white dark:bg-[#1e1e2d] border-b border-gray-200 dark:border-[#2d2d3b] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        {/* Physics Button */}
        <button
          onClick={() => {
            if (isPhysicsConstraintSet) {
              onNavigate('question-select-physics', 0);
            } else {
              onNavigate('section-config-physics', 0);
            }
          }}
          className={`
            px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-3
            ${currentStep === 'question-select-physics'
              ? 'bg-[#5248e5] text-white shadow-md'
              : 'bg-gray-100 dark:bg-[#252535] text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#2a2a3a] border border-gray-200 dark:border-[#2d2d3b]'
            }
          `}
        >
          <span>Physics</span>
          <span className={`
            px-2.5 py-1 rounded-full text-xs font-bold
            ${currentStep === 'question-select-physics'
              ? 'bg-white/20 text-white'
              : 'bg-[#5248e5]/10 text-[#5248e5]'
            }
          `}>
            {physicsQuestions}
          </span>
        </button>

        {/* Chemistry Button */}
        <button
          onClick={() => {
            if (isChemistryConstraintSet) {
              onNavigate('question-select-chemistry', 1);
            } else {
              onNavigate('section-config-chemistry', 1);
            }
          }}
          className={`
            px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-3
            ${currentStep === 'question-select-chemistry'
              ? 'bg-[#5248e5] text-white shadow-md'
              : 'bg-gray-100 dark:bg-[#252535] text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#2a2a3a] border border-gray-200 dark:border-[#2d2d3b]'
            }
          `}
        >
          <span>Chemistry</span>
          <span className={`
            px-2.5 py-1 rounded-full text-xs font-bold
            ${currentStep === 'question-select-chemistry'
              ? 'bg-white/20 text-white'
              : 'bg-[#5248e5]/10 text-[#5248e5]'
            }
          `}>
            {chemistryQuestions}
          </span>
        </button>

        {/* Mathematics Button */}
        <button
          onClick={() => {
            if (isMathConstraintSet) {
              onNavigate('question-select-math', 2);
            } else {
              onNavigate('section-config-math', 2);
            }
          }}
          className={`
            px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-3
            ${currentStep === 'question-select-math'
              ? 'bg-[#5248e5] text-white shadow-md'
              : 'bg-gray-100 dark:bg-[#252535] text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#2a2a3a] border border-gray-200 dark:border-[#2d2d3b]'
            }
          `}
        >
          <span>Mathematics</span>
          <span className={`
            px-2.5 py-1 rounded-full text-xs font-bold
            ${currentStep === 'question-select-math'
              ? 'bg-white/20 text-white'
              : 'bg-[#5248e5]/10 text-[#5248e5]'
            }
          `}>
            {mathQuestions}
          </span>
        </button>

        <div className="flex-1"></div>

        {/* Review & Export Button */}
        <button
          onClick={() => canReview && onNavigate('test-review')}
          disabled={!canReview}
          title={!canReview ? `Need 25 questions per section (P: ${physicsQuestions}, C: ${chemistryQuestions}, M: ${mathQuestions})` : ''}
          className={`
            px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2
            ${currentStep === 'test-review'
              ? 'bg-green-600 text-white shadow-md'
              : canReview
                ? 'bg-gray-100 dark:bg-[#252535] text-gray-900 dark:text-white hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-200 dark:border-[#2d2d3b] hover:border-green-600'
                : 'bg-gray-200 dark:bg-[#1a1a1a] text-gray-400 dark:text-gray-600 cursor-not-allowed border border-gray-300 dark:border-gray-700'
            }
          `}
        >
          <span className="material-symbols-outlined text-xl">assignment_turned_in</span>
          <span>Review & Export</span>
        </button>
      </div>
    </div>
  );
};

export default TestNavigation;
