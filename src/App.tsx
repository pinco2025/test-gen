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
  ProjectInfo,
  WorkflowStep,
  Question
} from './types';
import { sortQuestionsForSection } from './utils/sorting';
import TestCreationForm from './components/TestCreationForm';
import SectionConfiguration from './components/SectionConfiguration';
import QuestionSelection from './components/QuestionSelection';
import ProjectTabs from './components/ProjectTabs';
import TestReview from './components/TestReview';
import TestNavigation from './components/TestNavigation';
import AddQuestionModal from './components/AddQuestionModal';
import Notification, { useNotification } from './components/Notification';
import TitleBar from './components/TitleBar';
import './styles/App.css';

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
  const { notifications, addNotification, removeNotification } = useNotification();

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

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
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [showDbDropdown, setShowDbDropdown] = useState(false);

  // Track when creating a new project
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Add Question Modal state
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);

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
        setDbPath(config.databasePath);

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

  const handleAddQuestion = async (question: Question) => {
    if (!window.electronAPI) return;

    try {
      const success = await window.electronAPI.questions.createQuestion(question);
      if (success) {
        addNotification('success', 'Question added successfully!');
        setIsAddQuestionModalOpen(false);
      } else {
        addNotification('error', 'Failed to add question.');
      }
    } catch (error) {
      console.error(error);
      addNotification('error', 'An error occurred while adding the question.');
    }
  };

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

    // const project = projects.find(p => p.id === projectId);
    // if (project) {
    //   const confirmed = confirm(
    //     `Permanently delete project "${project.testCode}"?\n\nThis cannot be undone!`
    //   );
    //   if (!confirmed) return;
    // }

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
      // Proceed without native confirmation for now to satisfy UI requirements
      // Delete all projects
      await window.electronAPI.config.deleteAllProjects();
      setProjects([]);
      setOpenProjectIds([]);
      setProjectsData({});
    }

    const result = await window.electronAPI.db.selectFile();
    if (result.success) {
      setDbConnected(true);
      setDbPath(result.path || null);
      setShowDbDropdown(false);
      await window.electronAPI.config.update({ databasePath: result.path || null });
      createNewProject();
    } else {
        addNotification('error', 'Failed to connect to database: ' + result.error);
    }
  };

  // Handle database dropdown toggle
  const toggleDbDropdown = () => {
    setShowDbDropdown(!showDbDropdown);
  };

  // Get filename from path
  const getDbFileName = (path: string | null): string => {
    if (!path) return 'Unknown';
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  };

  const handleTestCreation = async (metadata: TestMetadata, chapters: Chapter[][]) => {
    // Create project ID based on test code
    let projectId = metadata.code.replace(/[^a-zA-Z0-9]/g, '-');

    // Check if project already exists
    if (window.electronAPI) {
      const exists = await window.electronAPI.project.exists(projectId);
      if (exists) {
          await loadProject(projectId);
          addNotification('info', `Loaded existing project "${metadata.code}"`);
          return;
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

    setProjectsData(prev => {
      const projectData = prev[currentProjectId];
      if (!projectData) return prev;

      const updatedSections = [...projectData.sections];
      updatedSections[projectData.currentSectionIndex] = {
        ...updatedSections[projectData.currentSectionIndex],
        selectedQuestions
      };

      return {
        ...prev,
        [currentProjectId]: {
          ...projectData,
          sections: updatedSections
        }
      };
    });
    setSaveStatus('unsaved');
  }, [currentProjectId]);

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

  const handleNavigation = (targetStep: WorkflowStep, sectionIndex?: number) => {
    if (!currentProjectId) return;

    const updates: Partial<ProjectData> = {
      currentStep: targetStep
    };

    if (sectionIndex !== undefined) {
      updates.currentSectionIndex = sectionIndex;
    }

    updateCurrentProject(updates);
  };

  const handleExportTest = async () => {
    if (!testMetadata) return;

    // Create a copy of sections with sorted questions
    const sortedSections = sections.map(section => ({
      ...section,
      selectedQuestions: sortQuestionsForSection(section.selectedQuestions)
    }));

    const test: Test = {
      metadata: testMetadata,
      sections: sortedSections
    };

    if (window.electronAPI) {
      const result = await window.electronAPI.test.export(test);
      if (result.success) {
        // Stay on the current screen (Test Review) instead of redirecting to 'complete'
        updateCurrentProject({ currentStep: 'complete' });
        addNotification('success', 'Test exported successfully!');
      } else {
        addNotification('error', 'Failed to export test: ' + result.error);
      }
    }
  };

  const handleConstraintConfigChange = (config: ConstraintConfig) => {
    updateCurrentProject({ constraintConfig: config });
  };

  const handleQuestionUpdate = useCallback((updatedQuestion: any) => {
    if (!currentProjectId) return;

    // We need to update the question in the sections state
    const updatedSections = sections.map(section => ({
      ...section,
      selectedQuestions: section.selectedQuestions.map(sq => {
        if (sq.question.uuid === updatedQuestion.uuid) {
          return {
            ...sq,
            question: updatedQuestion
          };
        }
        return sq;
      })
    }));

    updateCurrentProject({ sections: updatedSections });
  }, [currentProjectId, sections, updateCurrentProject]);

  const handleRemoveQuestion = useCallback((questionUuid: string) => {
    if (!currentProjectId) return;

    const updatedSections = sections.map(section => ({
      ...section,
      selectedQuestions: section.selectedQuestions.filter(sq => sq.question.uuid !== questionUuid)
    }));

    updateCurrentProject({ sections: updatedSections });
  }, [currentProjectId, sections, updateCurrentProject]);

  const handleQuestionStatusUpdate = useCallback((questionUuid: string, status: 'accepted' | 'review' | 'pending') => {
    if (!currentProjectId) return;

    // We need to update the status in the sections state
    const updatedSections = sections.map(section => ({
      ...section,
      selectedQuestions: section.selectedQuestions.map(sq => {
        if (sq.question.uuid === questionUuid) {
          return {
            ...sq,
            status: status
          };
        }
        return sq;
      })
    }));

    updateCurrentProject({ sections: updatedSections });
  }, [currentProjectId, sections, updateCurrentProject]);

  // Render different steps
  const renderStep = () => {
    // Show navigation for selection and review steps
    const showNavigation = [
      'question-select-physics',
      'question-select-chemistry',
      'question-select-math',
      'test-review'
    ].includes(step);

    const stepContent = (() => {
      switch (step) {
      case 'database-connect':
        return (
          <div className="connect-screen animate-fade-in">
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
          <div className="dashboard animate-fade-in">
            <div className="dashboard-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2>Your Projects</h2>
              <button className="btn-primary" onClick={createNewProject}>
                <span className="material-symbols-outlined">add</span>
                Create New Project
              </button>
            </div>
            <div className="project-list-container" style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{
                  backgroundColor: 'var(--bg-main)',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Date Modified</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No projects found. Create a new one to get started.
                      </td>
                    </tr>
                  ) : (
                    projects.map((project) => (
                      <tr
                        key={project.id}
                        onClick={() => loadProject(project.id)}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        className="project-list-row"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>folder</span>
                            <span style={{ fontWeight: 500 }}>{project.testCode}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                          {project.description || 'No description'}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                          {new Date(project.lastModified).toLocaleString()}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button
                            className="project-delete-btn"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            title="Delete project permanently"
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
          <TestReview
            sections={sections}
            onEditQuestion={handleQuestionUpdate}
            onBack={handleBackFromSelection}
            onExport={handleExportTest}
            onRemoveQuestion={handleRemoveQuestion}
            onUpdateQuestionStatus={handleQuestionStatusUpdate}
          />
        );

      case 'complete':
        return (
          <div className="complete-screen">
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'var(--success)' }}>check_circle</span>
            </div>
            <h2>Test Generated Successfully!</h2>
            <p>Your test has been exported as a JSON file.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn-secondary"
                onClick={() => updateCurrentProject({ currentStep: 'test-review' })}
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Back to Review
              </button>
              <button
                className="btn-primary"
                onClick={createNewProject}
              >
                <span className="material-symbols-outlined">add</span>
                Create Another Test
              </button>
            </div>
          </div>
        );

      default:
        return <div>Unknown step</div>;
      }
    })();

    return (
      <>
        {showNavigation && (
          <TestNavigation
            currentStep={step}
            sections={sections}
            onNavigate={handleNavigation}
          />
        )}
        {stepContent}
      </>
    );
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

  // Check if we are in a question selection step to adjust layout
  const isSelectionStep = [
    'question-select-physics',
    'question-select-chemistry',
    'question-select-math'
  ].includes(step);

  return (
    <div className="app">
      <TitleBar />
      <Notification notifications={notifications} removeNotification={removeNotification} />
      <div className="app-header">
        <div className="header-left">
          <img src="https://drive.google.com/thumbnail?id=1yLtX3YxubbDBsKYDj82qiaGbSkSX7aLv&sz=w1000" alt="Logo" className="header-logo" onClick={goToDashboard} />
          <h1 onClick={goToDashboard}>Test Generation System</h1>
        </div>
        <div className="header-right">
          <button
            className="theme-toggle-btn"
            onClick={() => setIsAddQuestionModalOpen(true)}
            title="Add New Question"
            style={{ marginRight: '0.5rem' }}
          >
            <span className="material-symbols-outlined">add_circle</span>
          </button>
          <button
            className="theme-toggle-btn"
            onClick={toggleDarkMode}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <span className="material-symbols-outlined">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
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
          <div className="db-status-container">
            <div
              className={`db-status ${dbConnected ? 'connected' : 'disconnected'}`}
              onClick={toggleDbDropdown}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>database</span>
              {dbConnected ? 'Connected' : 'Disconnected'}
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                {showDbDropdown ? 'expand_less' : 'expand_more'}
              </span>
            </div>
            {showDbDropdown && (
              <div className="db-dropdown">
                <div className="db-dropdown-header">
                  <span className="material-symbols-outlined">storage</span>
                  Database Connection
                </div>
                {dbConnected && dbPath && (
                  <div className="db-dropdown-info">
                    <div className="db-file-name">{getDbFileName(dbPath)}</div>
                    <div className="db-file-path" title={dbPath}>{dbPath}</div>
                  </div>
                )}
                <button className="db-dropdown-btn" onClick={handleDatabaseSelect}>
                  <span className="material-symbols-outlined">folder_open</span>
                  {dbConnected ? 'Change Database' : 'Select Database'}
                </button>
              </div>
            )}
          </div>
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
      <div className={`app-content ${isSelectionStep ? 'app-content-full' : ''}`} key={currentProjectId || 'new'}>
        {renderStep()}
      </div>
      {isAddQuestionModalOpen && (
        <AddQuestionModal
          onClose={() => setIsAddQuestionModalOpen(false)}
          onSave={handleAddQuestion}
        />
      )}
    </div>
  );
}

export default App;
