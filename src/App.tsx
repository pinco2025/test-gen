import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Test,
  TestMetadata,
  SectionConfig,
  SectionName,
  AlphaConstraint,
  BetaConstraint,
  SelectedQuestion,
  Chapter,
  ConstraintConfig,
  ProjectState,
  ProjectInfo
} from './types';
import TestCreationForm from './components/TestCreationForm';
import SectionConfiguration from './components/SectionConfiguration';
import QuestionSelection from './components/QuestionSelection';
import ProjectTabs from './components/ProjectTabs';
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
  // Multi-project state
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Current project state
  const [step, setStep] = useState<WorkflowStep>('database-connect');
  const [dbConnected, setDbConnected] = useState(false);
  const [testMetadata, setTestMetadata] = useState<TestMetadata | null>(null);
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [constraintConfig, setConstraintConfig] = useState<ConstraintConfig>({
    minIdx: 1,
    Sm: 0.1,
    Sh: 0.1
  });

  // Auto-save state
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    if (!window.electronAPI) return;

    // Check database connection
    const connected = await window.electronAPI.db.isConnected();
    setDbConnected(connected);

    if (connected) {
      // Load projects
      const loadedProjects = await window.electronAPI.project.list();
      setProjects(loadedProjects);

      // Load last project or create new
      const config = await window.electronAPI.config.get();
      if (config.lastProjectId && loadedProjects.some(p => p.id === config.lastProjectId)) {
        loadProject(config.lastProjectId);
      } else if (loadedProjects.length > 0) {
        loadProject(loadedProjects[0].id);
      } else {
        setStep('test-creation');
      }
    }
  };

  // Auto-save with debouncing
  const autoSave = useCallback(() => {
    if (!currentProjectId || !window.electronAPI || isLoadingRef.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      const projectState: ProjectState = {
        id: currentProjectId,
        testMetadata,
        sections,
        currentSectionIndex,
        constraintConfig,
        currentStep: step,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      await window.electronAPI.project.save(projectState);

      // Refresh project list
      const updatedProjects = await window.electronAPI.project.list();
      setProjects(updatedProjects);
    }, 1000); // 1 second debounce
  }, [currentProjectId, testMetadata, sections, currentSectionIndex, constraintConfig, step]);

  // Trigger auto-save when state changes
  useEffect(() => {
    if (currentProjectId && step !== 'database-connect') {
      autoSave();
    }
  }, [testMetadata, sections, currentSectionIndex, constraintConfig, step, currentProjectId, autoSave]);

  // Load a project
  const loadProject = async (projectId: string) => {
    if (!window.electronAPI) return;

    // Prevent auto-save during loading
    isLoadingRef.current = true;

    // Clear current state first to force re-render
    setCurrentProjectId(null);
    setTestMetadata(null);
    setSections([]);
    setCurrentSectionIndex(0);
    setConstraintConfig({ minIdx: 1, Sm: 0.1, Sh: 0.1 });
    setStep('database-connect');

    // Small delay to ensure state is cleared
    await new Promise(resolve => setTimeout(resolve, 50));

    const projectState = await window.electronAPI.project.load(projectId);

    if (projectState) {
      setCurrentProjectId(projectState.id);
      setTestMetadata(projectState.testMetadata);
      setSections(projectState.sections);
      setCurrentSectionIndex(projectState.currentSectionIndex);
      setConstraintConfig(projectState.constraintConfig);
      setStep(projectState.currentStep as WorkflowStep);

      // Update config
      await window.electronAPI.config.update({ lastProjectId: projectId });
    }

    isLoadingRef.current = false;
  };

  // Create new project
  const createNewProject = () => {
    setCurrentProjectId(null);
    setTestMetadata(null);
    setSections([]);
    setCurrentSectionIndex(0);
    setConstraintConfig({ minIdx: 1, Sm: 0.1, Sh: 0.1 });
    setStep('test-creation');
  };

  // Close project
  const handleCloseProject = async (projectId: string) => {
    if (!window.electronAPI) return;

    const project = projects.find(p => p.id === projectId);
    if (project) {
      const confirmed = confirm(
        `Close project "${project.testCode}"?\n\nAll progress is auto-saved.`
      );
      if (!confirmed) return;
    }

    // Delete project
    await window.electronAPI.project.delete(projectId);

    // Refresh project list
    const updatedProjects = await window.electronAPI.project.list();
    setProjects(updatedProjects);

    // If current project was closed, load another or create new
    if (currentProjectId === projectId) {
      if (updatedProjects.length > 0) {
        loadProject(updatedProjects[0].id);
      } else {
        createNewProject();
      }
    }
  };

  const handleDatabaseSelect = async () => {
    if (!window.electronAPI) return;

    // Warn about existing projects
    if (projects.length > 0) {
      const confirmed = confirm(
        `Warning: Changing the database will close all ${projects.length} project(s).\n\n` +
        `All progress is auto-saved, but projects are tied to the current database.\n\n` +
        `Continue?`
      );
      if (!confirmed) return;

      // Delete all projects
      await window.electronAPI.config.deleteAllProjects();
      setProjects([]);
    }

    const result = await window.electronAPI.db.selectFile();
    if (result.success) {
      setDbConnected(true);
      await window.electronAPI.config.update({ databasePath: result.path || null });
      createNewProject();
    } else {
      alert('Failed to connect to database: ' + result.error);
    }
  };

  const handleTestCreation = async (metadata: TestMetadata, chapters: Chapter[][]) => {
    setTestMetadata(metadata);

    // Create project ID based on test code
    const projectId = metadata.code.replace(/[^a-zA-Z0-9]/g, '-');

    // Check if project already exists
    if (window.electronAPI) {
      const exists = await window.electronAPI.project.exists(projectId);
      if (exists) {
        const confirmed = confirm(
          `A project with test code "${metadata.code}" already exists.\n\n` +
          `Do you want to load the existing project?`
        );
        if (confirmed) {
          loadProject(projectId);
          return;
        } else {
          // User wants to create a new one, append timestamp
          const timestamp = Date.now();
          setCurrentProjectId(`${projectId}-${timestamp}`);
        }
      } else {
        setCurrentProjectId(projectId);
      }
    }

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
        <div className="header-right">
          {dbConnected && <div className="db-status">Database: Connected</div>}
        </div>
      </div>
      {dbConnected && projects.length > 0 && (
        <ProjectTabs
          projects={projects}
          currentProjectId={currentProjectId}
          onSelectProject={loadProject}
          onCloseProject={handleCloseProject}
          onNewProject={createNewProject}
        />
      )}
      <div className="app-content" key={currentProjectId || 'new'}>
        {renderStep()}
      </div>
    </div>
  );
}

export default App;
