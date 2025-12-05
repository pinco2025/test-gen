import { useState, useEffect } from 'react';
import {
  Test,
  TestMetadata,
  SectionConfig,
  SectionName,
  AlphaConstraint,
  BetaConstraint,
  SelectedQuestion,
  Chapter,
  ConstraintConfig
} from './types';
import TestCreationForm from './components/TestCreationForm';
import SectionConfiguration from './components/SectionConfiguration';
import QuestionSelection from './components/QuestionSelection';
import './styles/App.css';

type WorkflowStep =
  | 'database-connect'
  | 'test-creation'
  | 'section-config-physics'
  | 'section-config-chemistry'
  | 'section-config-math'
  | 'question-select-physics'
  | 'question-select-chemistry'
  | 'question-select-math'
  | 'test-review'
  | 'complete';

function App() {
  const [step, setStep] = useState<WorkflowStep>('database-connect');
  const [dbConnected, setDbConnected] = useState(false);

  // Test data
  const [testMetadata, setTestMetadata] = useState<TestMetadata | null>(null);
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // Global constraint algorithm configuration
  const [constraintConfig, setConstraintConfig] = useState<ConstraintConfig>({
    minIdx: 0, // Default: no minimum questions per chapter
    Sm: 0.1, // Default slope for medium difficulty
    Sh: 0.1  // Default slope for hard difficulty
  });

  useEffect(() => {
    checkDatabaseConnection();
  }, []);

  const checkDatabaseConnection = async () => {
    if (window.electronAPI) {
      const connected = await window.electronAPI.db.isConnected();
      setDbConnected(connected);
      if (connected) {
        setStep('test-creation');
      }
    }
  };

  const handleDatabaseSelect = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.db.selectFile();
      if (result.success) {
        setDbConnected(true);
        setStep('test-creation');
      } else {
        alert('Failed to connect to database: ' + result.error);
      }
    }
  };

  const handleTestCreation = (metadata: TestMetadata, chapters: Chapter[][]) => {
    setTestMetadata(metadata);

    // Initialize sections
    const sectionNames: SectionName[] = ['Physics', 'Chemistry', 'Mathematics'];
    const initialSections: SectionConfig[] = sectionNames.map((name, idx) => ({
      name,
      chapters: chapters[idx],
      alphaConstraint: { chapters: [] },
      betaConstraint: {},
      selectedQuestions: []
    }));

    setSections(initialSections);
    setCurrentSectionIndex(0);
    setStep('section-config-physics');
  };

  const handleSectionConfiguration = (
    alpha: AlphaConstraint,
    beta: BetaConstraint
  ) => {
    const updatedSections = [...sections];
    updatedSections[currentSectionIndex] = {
      ...updatedSections[currentSectionIndex],
      alphaConstraint: alpha,
      betaConstraint: beta
    };
    setSections(updatedSections);

    // Move to question selection for this section
    const stepMap: { [key: number]: WorkflowStep } = {
      0: 'question-select-physics',
      1: 'question-select-chemistry',
      2: 'question-select-math'
    };
    setStep(stepMap[currentSectionIndex]);
  };

  const handleSkipConfiguration = () => {
    // Create default alpha constraint
    const section = sections[currentSectionIndex];
    const defaultAlpha: AlphaConstraint = {
      chapters: section.chapters.map(ch => ({
        chapterCode: ch.code,
        chapterName: ch.name,
        a: 0,
        b: 0,
        e: 0,
        m: 0,
        h: 0
      }))
    };

    handleSectionConfiguration(defaultAlpha, {});
  };

  const handleQuestionSelection = (selectedQuestions: SelectedQuestion[]) => {
    const updatedSections = [...sections];
    updatedSections[currentSectionIndex] = {
      ...updatedSections[currentSectionIndex],
      selectedQuestions
    };
    setSections(updatedSections);

    // Move to next section or review
    if (currentSectionIndex < 2) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      const stepMap: { [key: number]: WorkflowStep } = {
        1: 'section-config-chemistry',
        2: 'section-config-math'
      };
      setStep(stepMap[currentSectionIndex + 1]);
    } else {
      setStep('test-review');
    }
  };

  const handleBackFromSelection = () => {
    const stepMap: { [key: number]: WorkflowStep } = {
      0: 'section-config-physics',
      1: 'section-config-chemistry',
      2: 'section-config-math'
    };
    setStep(stepMap[currentSectionIndex]);
  };

  const handleExportTest = async () => {
    if (!testMetadata) return;

    const test: Test = {
      metadata: testMetadata,
      sections
    };

    if (window.electronAPI) {
      const result = await window.electronAPI.test.export(test);
      if (result.success) {
        alert(`Test exported successfully to: ${result.path}`);
        setStep('complete');
      } else {
        alert('Failed to export test: ' + result.error);
      }
    }
  };

  // Render different steps
  const renderStep = () => {
    switch (step) {
      case 'database-connect':
        return (
          <div className="connect-screen">
            <h1>Test Generation Engine</h1>
            <p>Please connect to a question database to begin.</p>
            <button className="btn-primary" onClick={handleDatabaseSelect}>
              Select Database File
            </button>
          </div>
        );

      case 'test-creation':
        return (
          <TestCreationForm
            onSubmit={handleTestCreation}
          />
        );

      case 'section-config-physics':
      case 'section-config-chemistry':
      case 'section-config-math':
        return (
          <SectionConfiguration
            sectionName={sections[currentSectionIndex].name}
            chapters={sections[currentSectionIndex].chapters}
            constraintConfig={constraintConfig}
            onConfigChange={setConstraintConfig}
            onConfigure={handleSectionConfiguration}
            onSkip={handleSkipConfiguration}
          />
        );

      case 'question-select-physics':
      case 'question-select-chemistry':
      case 'question-select-math':
        const currentSection = sections[currentSectionIndex];
        return (
          <QuestionSelection
            sectionName={currentSection.name}
            chapters={currentSection.chapters}
            alphaConstraint={currentSection.alphaConstraint}
            betaConstraint={currentSection.betaConstraint}
            onComplete={handleQuestionSelection}
            onBack={handleBackFromSelection}
          />
        );

      case 'test-review':
        return (
          <div className="test-review">
            <h2>Test Review</h2>
            <div className="test-summary">
              <h3>Test Details</h3>
              <p><strong>Code:</strong> {testMetadata?.code}</p>
              <p><strong>Description:</strong> {testMetadata?.description}</p>
              <p><strong>Type:</strong> {testMetadata?.testType}</p>
            </div>

            {sections.map((section, idx) => (
              <div key={idx} className="section-summary">
                <h3>{section.name}</h3>
                <p>Questions selected: {section.selectedQuestions.length}/25</p>
                <ul>
                  <li>Division 1: {section.selectedQuestions.filter(sq => sq.division === 1).length}/20</li>
                  <li>Division 2: {section.selectedQuestions.filter(sq => sq.division === 2).length}/5</li>
                </ul>
              </div>
            ))}

            <div className="review-actions">
              <button
                className="btn-secondary"
                onClick={() => setStep('test-creation')}
              >
                Start Over
              </button>
              <button
                className="btn-primary"
                onClick={handleExportTest}
              >
                Export Test as JSON
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="complete-screen">
            <h2>Test Generated Successfully!</h2>
            <p>Your test has been exported as a JSON file.</p>
            <button
              className="btn-primary"
              onClick={() => {
                setStep('test-creation');
                setSections([]);
                setTestMetadata(null);
                setCurrentSectionIndex(0);
              }}
            >
              Create Another Test
            </button>
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>JEE Test Generator</h1>
        {dbConnected && <div className="db-status">Database: Connected</div>}
      </div>
      <div className="app-content">
        {renderStep()}
      </div>
    </div>
  );
}

export default App;
