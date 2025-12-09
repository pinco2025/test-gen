
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

  const totalRequired = 25;
  const canReview = physicsQuestions >= totalRequired &&
                    chemistryQuestions >= totalRequired &&
                    mathQuestions >= totalRequired;

  const getButtonClass = (isActive: boolean) =>
    `nav-segment ${isActive ? 'active' : ''}`;

  return (
    <div className="test-navigation-container">
      <div className="test-navigation">
        <button
          className={getButtonClass(currentStep === 'question-select-physics')}
          onClick={() => onNavigate('question-select-physics', 0)}
        >
          <span className="nav-label">Physics</span>
          <span className="nav-badge">{physicsQuestions}</span>
        </button>
        <button
          className={getButtonClass(currentStep === 'question-select-chemistry')}
          onClick={() => onNavigate('question-select-chemistry', 1)}
        >
          <span className="nav-label">Chemistry</span>
          <span className="nav-badge">{chemistryQuestions}</span>
        </button>
        <button
          className={getButtonClass(currentStep === 'question-select-math')}
          onClick={() => onNavigate('question-select-math', 2)}
        >
          <span className="nav-label">Maths</span>
          <span className="nav-badge">{mathQuestions}</span>
        </button>
        <div className="nav-separator"></div>
        <button
          className={`nav-segment review ${currentStep === 'test-review' ? 'active' : ''}`}
          onClick={() => canReview && onNavigate('test-review')}
          disabled={!canReview}
          title={!canReview ? `Need 25 questions per section (P: ${physicsQuestions}, C: ${chemistryQuestions}, M: ${mathQuestions})` : ''}
        >
          <span className="material-symbols-outlined icon">assignment_turned_in</span>
          <span className="nav-label">Review</span>
        </button>
      </div>
    </div>
  );
};

export default TestNavigation;
