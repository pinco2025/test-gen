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
  | 'dashboard'
  | 'test-creation'
  | 'section-config-physics'
  | 'section-config-chemistry'
  | 'section-config-math'
  | 'question-select-physics'
  | 'question-select-chemistry'
  | 'question-select-math'
  | 'test-review'
  | 'complete';

// In-memory project data
interface ProjectData {
  testMetadata: TestMetadata | null;
  sections: SectionConfig[];
  currentSectionIndex: number;
  constraintConfig: ConstraintConfig;
  currentStep: WorkflowStep;
  createdAt: string; // Track creation time
}

function App() {
  // All saved projects (from disk)
  const [projects, setProjects] = useState<ProjectInfo[]>([]);

  // Currently OPEN project IDs (like browser tabs)
  const [openProjectIds, setOpenProjectIds] = useState<string[]>([]);

  // Currently active/focused project
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // All loaded projects data in memory
  const [projectsData, setProjectsData] = useState<Record<string, ProjectData>>({});

  // Database state
  const [dbConnected, setDbConnected] = useState(false);

  // Track when creating a new project
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Save status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Auto-save state
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Get current project data
  const currentProject = currentProjectId ? projectsData[currentProjectId] : null;

  // Current project display state (derived from projectsData)
  const step = currentProject?.currentStep ||
    (isCreatingNew ? 'test-creation' : (dbConnected ? 'dashboard' : 'database-connect'));
  const testMetadata = currentProject?.testMetadata || null;
  const sections = currentProject?.sections || [];
  const currentSectionIndex = currentProject?.currentSectionIndex || 0;
  const constraintConfig = currentProject?.constraintConfig || { minIdx: 1, Sm: 0.1, Sh: 0.1 };

  // Helper to update current project data
  const updateCurrentProject = useCallback((updates: Partial<ProjectData>) => {
    if (!currentProjectId) return;

    setSaveStatus('unsaved');
    setProjectsData(prev => ({
      ...prev,
      [currentProjectId]: {
        ...prev[currentProjectId],
        ...updates
      }
    }));
  }, [currentProjectId]);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    if (!window.electronAPI) return;

    // Get saved config
    const config = await window.electronAPI.config.get();

    // Auto-connect to saved database if it exists
    if (config.databasePath) {
      const result = await window.electronAPI.db.connect(config.databasePath);
      if (result.success) {
        setDbConnected(true);

        // Load project list and show dashboard
        const loadedProjects = await window.electronAPI.project.list();
        setProjects(loadedProjects);

        // Don't auto-load any project, show dashboard
        setCurrentProjectId(null);
      } else {
        // Database path invalid, check if any database is connected
        const connected = await window.electronAPI.db.isConnected();
        setDbConnected(connected);

        if (connected) {
          const loadedProjects = await window.electronAPI.project.list();
          setProjects(loadedProjects);
        }
      }
    } else {
      // No saved database, check if one is already connected
      const connected = await window.electronAPI.db.isConnected();
      setDbConnected(connected);

      if (connected) {
        const loadedProjects = await window.electronAPI.project.list();
        setProjects(loadedProjects);
      }
    }
  };

  // Auto-save with debouncing
  const autoSave = useCallback(() => {
    if (!currentProjectId || !window.electronAPI || isLoadingRef.current) return;

    const currentData = projectsData[currentProjectId];
    if (!currentData) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');

      const projectState: ProjectState = {
        id: currentProjectId,
        testMetadata: currentData.testMetadata,
        sections: currentData.sections,
        currentSectionIndex: currentData.currentSectionIndex,
        constraintConfig: currentData.constraintConfig,
        currentStep: currentData.currentStep,
        createdAt: currentData.createdAt, // Preserve original creation time
        lastModified: new Date().toISOString()
      };

      await window.electronAPI.project.save(projectState);

      // Refresh project list
      const updatedProjects = await window.electronAPI.project.list();
      setProjects(updatedProjects);

      setSaveStatus('saved');
    }, 800); // 800ms debounce for snappier feel
  }, [currentProjectId, projectsData]);

  // Trigger auto-save when project data changes
  useEffect(() => {
    if (currentProjectId && projectsData[currentProjectId]) {
      autoSave();
    }
  }, [currentProjectId, projectsData, autoSave]);

  // Load a project (from disk if not in memory, or just switch to it)
  const loadProject = async (projectId: string) => {
    if (!window.electronAPI) return;

    isLoadingRef.current = true;

    // Check if project is already loaded in memory
    if (!projectsData[projectId]) {
      // Load from disk
      const projectState = await window.electronAPI.project.load(projectId);

      if (projectState) {
        // Add to memory
        setProjectsData(prev => ({
          ...prev,
          [projectId]: {
            testMetadata: projectState.testMetadata,
            sections: projectState.sections,
            currentSectionIndex: projectState.currentSectionIndex,
            constraintConfig: projectState.constraintConfig,
            currentStep: projectState.currentStep as WorkflowStep,
            createdAt: projectState.createdAt
          }
        }));
      }
    }

    // Add to open tabs if not already open
    setOpenProjectIds(prev => {
      if (!prev.includes(projectId)) {
        return [...prev, projectId];
      }
      return prev;
    });

    // Switch to this project
    setCurrentProjectId(projectId);
    setIsCreatingNew(false);

    // Update config
    await window.electronAPI.config.update({ lastProjectId: projectId });

    isLoadingRef.current = false;
  };

  // Create new project
  const createNewProject = () => {
    setCurrentProjectId(null);
    setIsCreatingNew(true);
  };

  // Close project tab (remove from open tabs, keep data in memory and on disk)
  const handleCloseProject = async (projectId: string) => {
    // Remove from open tabs
    setOpenProjectIds(prev => prev.filter(id => id !== projectId));

    // Remove from memory
    setProjectsData(prev => {
      const newData = { ...prev };
      delete newData[projectId];
      return newData;
    });

    // If current project was closed, switch to another open tab or go to dashboard
    if (currentProjectId === projectId) {
      const remainingTabs = openProjectIds.filter(id => id !== projectId);
      if (remainingTabs.length > 0) {
        // Switch to the last remaining tab
        setCurrentProjectId(remainingTabs[remainingTabs.length - 1]);
      } else {
        setCurrentProjectId(null);
      }
    }
  };

  // Go to dashboard (view all projects)
  const goToDashboard = () => {
    setCurrentProjectId(null);
    setIsCreatingNew(false);
  };

  // Delete project permanently
  const handleDeleteProject = async (projectId: string) => {
    if (!window.electronAPI) return;

    const project = projects.find(p => p.id === projectId);
    if (project) {
      const confirmed = confirm(
        `Permanently delete project "${project.testCode}"?\n\nThis cannot be undone!`
      );
      if (!confirmed) return;
    }

    // Remove from open tabs
    setOpenProjectIds(prev => prev.filter(id => id !== projectId));

    // Remove from memory
    setProjectsData(prev => {
      const newData = { ...prev };
      delete newData[projectId];
      return newData;
    });

    // Delete from disk
    await window.electronAPI.project.delete(projectId);

    // Refresh project list
    const updatedProjects = await window.electronAPI.project.list();
    setProjects(updatedProjects);

    // If current project was deleted, switch to another or go to dashboard
    if (currentProjectId === projectId) {
      const remainingTabs = openProjectIds.filter(id => id !== projectId);
      if (remainingTabs.length > 0) {
        setCurrentProjectId(remainingTabs[remainingTabs.length - 1]);
      } else {
        setCurrentProjectId(null);
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
      setOpenProjectIds([]);
      setProjectsData({});
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
    // Create project ID based on test code
    let projectId = metadata.code.replace(/[^a-zA-Z0-9]/g, '-');

    // Check if project already exists
    if (window.electronAPI) {
      const exists = await window.electronAPI.project.exists(projectId);
      if (exists) {
        const confirmed = confirm(
          `A project with test code "${metadata.code}" already exists.\n\n` +
          `Do you want to load the existing project?`
        );
        if (confirmed) {
          await loadProject(projectId);
          return;
        } else {
          // User wants to create a new one, append timestamp
          const timestamp = Date.now();
          projectId = `${projectId}-${timestamp}`;
        }
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

    const now = new Date().toISOString();

    // Create new project in memory
    setProjectsData(prev => ({
      ...prev,
      [projectId]: {
        testMetadata: metadata,
        sections: initialSections,
        currentSectionIndex: 0,
        constraintConfig: { minIdx: 1, Sm: 0.1, Sh: 0.1 },
        currentStep: 'section-config-physics',
        createdAt: now
      }
    }));

    // Add to open tabs
    setOpenProjectIds(prev => [...prev, projectId]);

    // Switch to new project
    setCurrentProjectId(projectId);
    setIsCreatingNew(false);
  };

  const handleSectionConfiguration = (
    alpha: AlphaConstraint,
    beta: BetaConstraint
  ) => {
    if (!currentProjectId) return;

    const updatedSections = [...sections];
    updatedSections[currentSectionIndex] = {
      ...updatedSections[currentSectionIndex],
      alphaConstraint: alpha,
      betaConstraint: beta
    };

    // Move to question selection for this section
    const stepMap: { [key: number]: WorkflowStep } = {
      0: 'question-select-physics',
      1: 'question-select-chemistry',
      2: 'question-select-math'
    };

    updateCurrentProject({
      sections: updatedSections,
      currentStep: stepMap[currentSectionIndex]
    });
  };

  // Immediate sync of question selections (saves on every change, not just on "Continue")
  const handleSelectionChange = useCallback((selectedQuestions: SelectedQuestion[]) => {
    if (!currentProjectId) return;

    const updatedSections = [...sections];
    updatedSections[currentSectionIndex] = {
      ...updatedSections[currentSectionIndex],
      selectedQuestions
    };

    // Just update the sections, don't change step
    updateCurrentProject({
      sections: updatedSections
    });
  }, [currentProjectId, sections, currentSectionIndex, updateCurrentProject]);

  const handleQuestionSelection = (selectedQuestions: SelectedQuestion[]) => {
    if (!currentProjectId) return;

    const updatedSections = [...sections];
    updatedSections[currentSectionIndex] = {
      ...updatedSections[currentSectionIndex],
      selectedQuestions
    };

    // Move to next section or review
    if (currentSectionIndex < 2) {
      const newIndex = currentSectionIndex + 1;
      const stepMap: { [key: number]: WorkflowStep } = {
        1: 'section-config-chemistry',
        2: 'section-config-math'
      };

      updateCurrentProject({
        sections: updatedSections,
        currentSectionIndex: newIndex,
        currentStep: stepMap[newIndex]
      });
    } else {
      updateCurrentProject({
        sections: updatedSections,
        currentStep: 'test-review'
      });
    }
  };

  const handleBackFromSelection = () => {
    const stepMap: { [key: number]: WorkflowStep } = {
      0: 'section-config-physics',
      1: 'section-config-chemistry',
      2: 'section-config-math'
    };

    updateCurrentProject({
      currentStep: stepMap[currentSectionIndex]
    });
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
        updateCurrentProject({ currentStep: 'complete' });
      } else {
        alert('Failed to export test: ' + result.error);
      }
    }
  };

  const handleConstraintConfigChange = (config: ConstraintConfig) => {
    updateCurrentProject({ constraintConfig: config });
  };

  // Render different steps
  const renderStep = () => {
    switch (step) {
      case 'database-connect':
        return (
          <div className="connect-screen">
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'var(--primary)' }}>database</span>
            </div>
            <h1>Test Generation System</h1>
            <p>Please connect to a question database to begin.</p>
            <button className="btn-primary" onClick={handleDatabaseSelect}>
              <span className="material-symbols-outlined">folder_open</span>
              Select Database File
            </button>
          </div>
        );

      case 'dashboard':
        return (
          <div className="dashboard">
            <div className="dashboard-header">
              <h2>Your Projects</h2>
            </div>
            <div className="project-grid">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="project-tile"
                  onClick={() => loadProject(project.id)}
                >
                  <div className="project-tile-header">
                    <h3>{project.testCode}</h3>
                    <button
                      className="project-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      title="Delete project permanently"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                  <p className="project-description">{project.description || 'No description'}</p>
                  <div className="project-meta">
                    <span className="project-date">
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', marginRight: '0.25rem' }}>schedule</span>
                      {new Date(project.lastModified).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              <div
                className="project-tile project-tile-new"
                onClick={createNewProject}
              >
                <div className="new-project-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>add</span>
                </div>
                <h3>Create New Project</h3>
              </div>
            </div>
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
            sectionName={sections[currentSectionIndex]?.name || 'Physics'}
            chapters={sections[currentSectionIndex]?.chapters || []}
            constraintConfig={constraintConfig}
            onConfigChange={handleConstraintConfigChange}
            onConfigure={handleSectionConfiguration}
          />
        );

      case 'question-select-physics':
      case 'question-select-chemistry':
      case 'question-select-math':
        const currentSection = sections[currentSectionIndex];
        if (!currentSection) return <div>Loading...</div>;

        return (
          <QuestionSelection
            key={`${currentProjectId}-${currentSectionIndex}`}
            sectionName={currentSection.name}
            chapters={currentSection.chapters}
            alphaConstraint={currentSection.alphaConstraint}
            betaConstraint={currentSection.betaConstraint}
            onComplete={handleQuestionSelection}
            onBack={handleBackFromSelection}
            initialSelectedQuestions={currentSection.selectedQuestions}
            onChange={handleSelectionChange}
          />
        );

      case 'test-review':
        return (
          <div className="test-review">
            <h2>
              <span className="material-symbols-outlined" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>fact_check</span>
              Test Review
            </h2>
            <div className="test-summary">
              <h3>
                <span className="material-symbols-outlined" style={{ marginRight: '0.375rem', fontSize: '1.125rem' }}>info</span>
                Test Details
              </h3>
              <p><strong>Code:</strong> {testMetadata?.code}</p>
              <p><strong>Description:</strong> {testMetadata?.description}</p>
              <p><strong>Type:</strong> {testMetadata?.testType}</p>
            </div>

            {sections.map((section, idx) => (
              <div key={idx} className="section-summary">
                <h3>
                  <span className="material-symbols-outlined" style={{ marginRight: '0.375rem', fontSize: '1.125rem' }}>
                    {idx === 0 ? 'science' : idx === 1 ? 'biotech' : 'calculate'}
                  </span>
                  {section.name}
                </h3>
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
                onClick={createNewProject}
              >
                <span className="material-symbols-outlined">refresh</span>
                Start Over
              </button>
              <button
                className="btn-primary"
                onClick={handleExportTest}
              >
                <span className="material-symbols-outlined">download</span>
                Export Test as JSON
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="complete-screen">
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'var(--success)' }}>check_circle</span>
            </div>
            <h2>Test Generated Successfully!</h2>
            <p>Your test has been exported as a JSON file.</p>
            <button
              className="btn-primary"
              onClick={createNewProject}
            >
              <span className="material-symbols-outlined">add</span>
              Create Another Test
            </button>
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  // Get open projects info for tabs
  const openProjects = openProjectIds
    .map(id => projects.find(p => p.id === id) || {
      id,
      testCode: projectsData[id]?.testMetadata?.code || 'New Project',
      description: projectsData[id]?.testMetadata?.description || '',
      createdAt: projectsData[id]?.createdAt || new Date().toISOString(),
      lastModified: new Date().toISOString(),
      progress: 0
    })
    .filter(Boolean) as ProjectInfo[];

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-left">
          <svg className="header-logo" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z" fill="currentColor"></path>
          </svg>
          <h1 onClick={goToDashboard}>Test Generation System</h1>
        </div>
        <div className="header-right">
          {currentProjectId && (
            <div className={`save-status ${saveStatus}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                {saveStatus === 'saving' ? 'sync' : saveStatus === 'saved' ? 'check_circle' : 'pending'}
              </span>
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'unsaved' && 'Unsaved'}
            </div>
          )}
          {dbConnected && (
            <div className="db-status">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>database</span>
              Connected
            </div>
          )}
        </div>
      </div>
      {dbConnected && (
        <ProjectTabs
          projects={openProjects}
          currentProjectId={currentProjectId}
          onSelectProject={loadProject}
          onCloseProject={handleCloseProject}
          onNewProject={createNewProject}
          onDashboard={goToDashboard}
        />
      )}
      <div className="app-content" key={currentProjectId || 'new'}>
        {renderStep()}
      </div>
    </div>
  );
}

export default App;
