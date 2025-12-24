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
  Question,
  Solution,
  TestType
} from './types';
import { sortQuestionsForSection } from './utils/sorting';
import TestCreationForm from './components/TestCreationForm';
import FullTestCreation, { FullTestJson } from './components/FullTestCreation';
import FullTestOverview from './components/FullTestOverview';
import SectionConfiguration from './components/SectionConfiguration';
import QuestionSelection from './components/QuestionSelection';
import ProjectTabs from './components/ProjectTabs';
import TestReview from './components/TestReview';
import QuestionEditor from './components/QuestionEditor';
import TestNavigation from './components/TestNavigation';
import AddQuestionModal from './components/AddQuestionModal';
import ExportTestModal, { ExportConfig } from './components/ExportTestModal';
import Notification, { useNotification } from './components/Notification';
import TitleBar from './components/TitleBar';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import DatabaseCleaning from './components/DatabaseCleaning';

// In-memory project data
interface ProjectData {
  testMetadata: TestMetadata | null;
  sections: SectionConfig[];
  currentSectionIndex: number;
  constraintConfig: ConstraintConfig;
  currentStep: WorkflowStep;
  activeChapterCode?: string;
  fullTestSectionView?: number | null; // For Full Test Overview persistence
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

  // Chapters file state
  const [chaptersConnected, setChaptersConnected] = useState(false);
  const [chaptersPath, setChaptersPath] = useState<string | null>(null);

  // App mode state
  const [appMode, setAppMode] = useState<'landing' | 'test-generation' | 'database-cleaning'>('landing');

  // Track when creating a new project
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTestType, setNewTestType] = useState<TestType>('Part');

  // Add Question Modal state
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [switchTargetQuestionUuid, setSwitchTargetQuestionUuid] = useState<string | null>(null);
  const [switchTargetQuestionData, setSwitchTargetQuestionData] = useState<Question | null>(null); // To store data for IPQ modal
  const [questionsRefreshTrigger, setQuestionsRefreshTrigger] = useState(0);

  // Export Test Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // State for the question editor
  const [editingQuestion, setEditingQuestion] = useState<{ question: Question, solution?: Solution } | null>(null);
  const [previousStep, setPreviousStep] = useState<WorkflowStep | null>(null);
  const [lastEditedQuestionUuid, setLastEditedQuestionUuid] = useState<string | null>(null);

  // Save status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Auto-save state
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Get current project data
  const currentProject = currentProjectId ? projectsData[currentProjectId] : null;

  // Current project display state (derived from projectsData)
  const step = currentProject?.currentStep ||
    (isCreatingNew ? (newTestType === 'Full' ? 'full-test-creation' : 'test-creation') : ((dbConnected && chaptersConnected) ? 'dashboard' : 'database-connect'));
  const testMetadata = currentProject?.testMetadata || null;
  const sections = currentProject?.sections || [];
  const currentSectionIndex = currentProject?.currentSectionIndex || 0;
  const constraintConfig = currentProject?.constraintConfig || { minIdx: 1, Sm: 0.1, Sh: 0.1 };

  // Helper to update current project data
  const updateCurrentProject = useCallback((updates: Partial<ProjectData> & { lastActiveQuestionUuid?: string | null }) => {
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

    // Check chapters file
    if (config.chaptersPath) {
        setChaptersConnected(true);
        setChaptersPath(config.chaptersPath);
    }

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

  const handleModeSelect = (mode: 'test-generation' | 'database-cleaning') => {
    setAppMode(mode);
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
        lastModified: new Date().toISOString(),
        lastActiveQuestionUuid: (currentData as any).lastActiveQuestionUuid, // Save active question state
        activeChapterCode: currentData.activeChapterCode, // Ensure active chapter is saved
        fullTestSectionView: currentData.fullTestSectionView // Ensure section view state is saved
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

  // Validate state after loading: if we're in edit mode but have no question, reset to safe state
  useEffect(() => {
    if (!currentProject || isLoadingRef.current) return;

    // If we're in edit-question state but have no editingQuestion (e.g., after app restart)
    if (currentProject.currentStep === 'edit-question' && !editingQuestion) {
      console.warn('Invalid state detected: edit-question step without editingQuestion. Resetting to first section (Physics).');

      // Reset to first section (Physics) for smooth UX
      updateCurrentProject({ currentStep: 'question-select-physics', currentSectionIndex: 0 });
    }
  }, [currentProject, editingQuestion, sections, updateCurrentProject]);

  const handleAddQuestion = async (question: Question, solution?: Partial<Solution>) => {
    if (!window.electronAPI) return;

    try {
      const success = await window.electronAPI.questions.createQuestion(question);
      if (success) {
        if (solution && (solution.solution_text || solution.solution_image_url)) {
            const solutionSuccess = await window.electronAPI.questions.saveSolution(
                question.uuid,
                solution.solution_text || '',
                solution.solution_image_url || ''
            );

            if (!solutionSuccess) {
                 addNotification('warning', 'Question added, but failed to save solution.');
                 setIsAddQuestionModalOpen(false);
                 setQuestionsRefreshTrigger(prev => prev + 1);
                 return;
            }
        }

        addNotification('success', 'Question added successfully!');
        setIsAddQuestionModalOpen(false);
        setQuestionsRefreshTrigger(prev => prev + 1);
      } else {
        addNotification('error', 'Failed to add question.');
      }
    } catch (error) {
      console.error(error);
      addNotification('error', 'An error occurred while adding the question.');
    }
  };

  const handleSwitchQuestion = async (newQuestion: Question, newSolution?: Partial<Solution>) => {
    if (!currentProjectId || !switchTargetQuestionUuid || !window.electronAPI) return;

    try {
        // 1. Save new question
        const success = await window.electronAPI.questions.createQuestion(newQuestion);
        if (!success) {
            addNotification('error', 'Failed to save new question to database.');
            return;
        }

        // 2. Save solution if exists
        if (newSolution && (newSolution.solution_text || newSolution.solution_image_url)) {
            await window.electronAPI.questions.saveSolution(
                newQuestion.uuid,
                newSolution.solution_text || '',
                newSolution.solution_image_url || ''
            );
        }

        // 3. Update links
        const originalQuestion = await window.electronAPI.questions.getByUUID(switchTargetQuestionUuid);
        if (originalQuestion) {
            // Update original question links
            const originalLinks = originalQuestion.links ? JSON.parse(originalQuestion.links) : [];
            if (!originalLinks.includes(newQuestion.uuid)) {
                originalLinks.push(newQuestion.uuid);
                await window.electronAPI.questions.updateQuestion(originalQuestion.uuid, {
                    links: JSON.stringify(originalLinks)
                });
            }

            // Update new question links
            const newLinks = [originalQuestion.uuid];
            await window.electronAPI.questions.updateQuestion(newQuestion.uuid, {
                links: JSON.stringify(newLinks)
            });
        }

        // 4. Replace in project state
        const updatedSections = sections.map(section => ({
            ...section,
            selectedQuestions: section.selectedQuestions.map(sq => {
                if (sq.question.uuid === switchTargetQuestionUuid) {
                    return {
                        ...sq,
                        question: newQuestion,
                        status: 'pending' as const // Reset status for the new question? Or keep same? Usually pending for review.
                    };
                }
                return sq;
            })
        }));

        updateCurrentProject({ sections: updatedSections });
        addNotification('success', 'Question switched successfully!');
        setSwitchTargetQuestionUuid(null);
        setQuestionsRefreshTrigger(prev => prev + 1);

    } catch (error) {
        console.error('Error switching question:', error);
        addNotification('error', 'An error occurred while switching the question.');
    }
  };

  // Helper to initiate switch with data fetching
  const initiateSwitchQuestion = async (uuid: string) => {
      setSwitchTargetQuestionUuid(uuid);
      if (window.electronAPI) {
          try {
              const q = await window.electronAPI.questions.getByUUID(uuid);
              if (q) setSwitchTargetQuestionData(q);
          } catch (e) {
              console.error("Failed to fetch target question for switch:", e);
          }
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
            createdAt: projectState.createdAt,
            lastActiveQuestionUuid: projectState.lastActiveQuestionUuid,
            activeChapterCode: projectState.activeChapterCode, // Properly restore activeChapterCode
            fullTestSectionView: projectState.fullTestSectionView // Properly restore fullTestSectionView
          } as any
        }));

        // Restore active question context if needed
        if (projectState.lastActiveQuestionUuid) {
             setLastEditedQuestionUuid(projectState.lastActiveQuestionUuid);

             // If we were editing, we need to load the question into editingQuestion
             if (projectState.currentStep === 'edit-question') {
                 try {
                     const q = await window.electronAPI.questions.getByUUID(projectState.lastActiveQuestionUuid);
                     const s = await window.electronAPI.questions.getSolution(projectState.lastActiveQuestionUuid);
                     if (q) {
                         setEditingQuestion({
                             question: q,
                             solution: s ? s : undefined
                         });
                         // previousStep needs to be set properly if not saved. defaulting to selection
                         if (!previousStep) {
                             // Attempt to infer from section index
                             const map: Record<number, WorkflowStep> = {0: 'question-select-physics', 1: 'question-select-chemistry', 2: 'question-select-math'};
                             setPreviousStep(map[projectState.currentSectionIndex] || 'question-select-physics');
                         }
                     }
                 } catch (e) {
                     console.error("Failed to restore editing question", e);
                 }
             }
        }
      }
    } else {
        // Restore from memory if switching tabs
        const existingData = projectsData[projectId] as any;
        if (existingData?.lastActiveQuestionUuid) {
             setLastEditedQuestionUuid(existingData.lastActiveQuestionUuid);
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
  const createNewProject = (testType: TestType = 'Part') => {
    setCurrentProjectId(null);
    setNewTestType(testType);
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
    if (appMode === 'database-cleaning') {
      // If we're in database cleaning mode, "Go to Dashboard" logic acts as "Go Home"
      setAppMode('landing');
    } else {
      setCurrentProjectId(null);
      setIsCreatingNew(false);
    }
  };

  // Delete project permanently
  const handleDeleteProject = async (projectId: string) => {
    if (!window.electronAPI) return;

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

    if (projects.length > 0) {
      // Just clear from memory, don't delete the files!
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
    } else {
        addNotification('error', 'Failed to connect to database: ' + result.error);
    }
  };

  const toggleDbDropdown = () => {
    setShowDbDropdown(!showDbDropdown);
  };

  const handleChaptersSelect = async () => {
      if (!window.electronAPI) return;

      const result = await window.electronAPI.chapters.selectFile();
      if (result.success && result.path) {
          setChaptersConnected(true);
          setChaptersPath(result.path);
          addNotification('success', 'Chapters file loaded successfully');
      } else if (result.error) {
          addNotification('error', 'Failed to load chapters file: ' + result.error);
      }
  };

  const getFileName = (path: string | null): string => {
      if (!path) return 'Unknown';
      const parts = path.split(/[/\\]/);
      return parts[parts.length - 1];
  };

  const handleTestCreation = async (metadata: TestMetadata, chapters: Chapter[][]) => {
    let projectId = metadata.code.replace(/[^a-zA-Z0-9]/g, '-');

    if (window.electronAPI) {
      const exists = await window.electronAPI.project.exists(projectId);
      if (exists) {
          await loadProject(projectId);
          addNotification('info', `Loaded existing project "${metadata.code}"`);
          return;
      }
    }

    const sectionNames: SectionName[] = ['Physics', 'Chemistry', 'Mathematics'];
    const initialSections: SectionConfig[] = sectionNames.map((name, idx) => ({
      name,
      chapters: chapters[idx],
      alphaConstraint: { chapters: [] },
      betaConstraint: {},
      selectedQuestions: []
    }));

    const now = new Date().toISOString();

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

    setOpenProjectIds(prev => [...prev, projectId]);
    setCurrentProjectId(projectId);
    setIsCreatingNew(false);
  };

  const handleFullTestCreation = async (data: FullTestJson) => {
    const now = new Date().toISOString();
    const createdProjectIds: string[] = [];

    let allChapters: Record<SectionName, Chapter[]> = { Physics: [], Chemistry: [], Mathematics: [] };
    if (window.electronAPI) {
        try {
            const rawChapters = await window.electronAPI.chapters.load();
            if (rawChapters) {
                 allChapters = {
                     Physics: rawChapters.Physics || [],
                     Chemistry: rawChapters.Chemistry || [],
                     Mathematics: rawChapters.Mathematics || []
                 };
            }
        } catch (e) {
            console.error("Failed to load chapters for full test creation", e);
        }
    }

    for (const testDef of data.tests) {
        const projectId = testDef.testCode.replace(/[^a-zA-Z0-9]/g, '-');

        const metadata: TestMetadata = {
            code: testDef.testCode,
            description: testDef.description,
            testType: 'Full',
            createdAt: now
        };

        const sections: SectionConfig[] = testDef.sections.map(sectionDef => {
            return {
                name: sectionDef.name,
                chapters: allChapters[sectionDef.name] || [],
                alphaConstraint: { chapters: [] },
                betaConstraint: {
                    weightage: sectionDef.weightage,
                    maxQuestions: sectionDef.maxQuestions,
                    type: sectionDef.type
                },
                selectedQuestions: []
            };
        });

        setProjectsData(prev => ({
            ...prev,
            [projectId]: {
                testMetadata: metadata,
                sections: sections,
                currentSectionIndex: 0,
                constraintConfig: { minIdx: 1, Sm: 0.1, Sh: 0.1 },
                currentStep: 'full-test-overview', // Start at overview
                createdAt: now
            }
        }));

        if (window.electronAPI) {
             const projectState: ProjectState = {
                id: projectId,
                testMetadata: metadata,
                sections: sections,
                currentSectionIndex: 0,
                constraintConfig: { minIdx: 1, Sm: 0.1, Sh: 0.1 },
                currentStep: 'full-test-overview',
                createdAt: now,
                lastModified: now
            };
            await window.electronAPI.project.save(projectState);
        }

        createdProjectIds.push(projectId);
    }

    if (window.electronAPI) {
        const updatedProjects = await window.electronAPI.project.list();
        setProjects(updatedProjects);
    }

    addNotification('success', `${createdProjectIds.length} tests created successfully.`);
    setIsCreatingNew(false);

    if (createdProjectIds.length > 0) {
        await loadProject(createdProjectIds[0]);
    }
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

    if (testMetadata?.testType === 'Full') {
        // Return to overview
        updateCurrentProject({
            sections: updatedSections,
            currentStep: 'full-test-overview',
            activeChapterCode: undefined // Clear active chapter
        });
    } else {
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
    }
  };

  const handleBackFromSelection = () => {
    if (testMetadata?.testType === 'Full') {
         updateCurrentProject({
            currentStep: 'full-test-overview',
            activeChapterCode: undefined
        });
    } else {
        const stepMap: { [key: number]: WorkflowStep } = {
            0: 'section-config-physics',
            1: 'section-config-chemistry',
            2: 'section-config-math'
        };

        updateCurrentProject({
            currentStep: stepMap[currentSectionIndex]
        });
    }
  };

  // Logic to find and navigate to the next chapter in Full Test mode
  const handleNextChapter = (selectedQuestions: SelectedQuestion[]) => {
      if (!currentProjectId || !currentProject) return;
      if (currentProject.testMetadata?.testType !== 'Full') return;

      // SAVE CURRENT PROGRESS FIRST
      // This is crucial: save the selection from the current chapter before switching
      // Note: We need to merge the new selection with existing selection for OTHER chapters
      // The `selectedQuestions` arg contains ALL selected questions for the section (as managed by QuestionSelection)
      // So we can just use handleQuestionSelection to update the section state
      handleQuestionSelection(selectedQuestions);

      const currentSection = sections[currentProject.currentSectionIndex];
      const activeChapterCode = currentProject.activeChapterCode;

      if (!currentSection || !activeChapterCode) return;

      const weightage = currentSection.betaConstraint?.weightage || {};

      // Ideally follow the order defined in section.chapters
      const orderedCodes = currentSection.chapters
        .filter(c => weightage[c.code] !== undefined)
        .map(c => c.code);

      const currentIndex = orderedCodes.indexOf(activeChapterCode);

      // Find next chronological chapter
      let nextChapterCode: string | undefined = undefined;

      // Simply get the next chapter in the list (if exists)
      if (currentIndex !== -1 && currentIndex < orderedCodes.length - 1) {
          nextChapterCode = orderedCodes[currentIndex + 1];
      }

      if (nextChapterCode) {
          updateCurrentProject({
              activeChapterCode: nextChapterCode
          });
      } else {
          // End of current chapter list for this section.
          // User requested "remove the JUMP to next section thing".
          // So we return to the Full Test Overview.
          updateCurrentProject({
             currentStep: 'full-test-overview',
             activeChapterCode: undefined
          });
      }
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

  // Open export modal instead of directly exporting
  const handleExportTest = () => {
    if (!testMetadata) return;
    setIsExportModalOpen(true);
  };

  // Handle the actual export with config from modal
  const handleExportWithConfig = async (exportConfig: ExportConfig) => {
    if (!testMetadata || !window.electronAPI) return;

    const sortedSections = sections.map(section => ({
      ...section,
      selectedQuestions: sortQuestionsForSection(section.selectedQuestions)
    }));

    const test: Test = {
      metadata: testMetadata,
      sections: sortedSections
    };

    const result = await window.electronAPI.test.exportWithConfig(test, exportConfig);

    if (result.success) {
      updateCurrentProject({ currentStep: 'complete' });

      // Show detailed success message
      let message = 'Test exported successfully!';
      if (result.githubTestUrl) {
        message += ' Uploaded to GitHub.';
      }
      if (result.supabaseInserted) {
        message += ' Saved to database.';
      }
      addNotification('success', message);
      setIsExportModalOpen(false);
    } else {
      throw new Error(result.error || 'Export failed');
    }
  };

  const handleConstraintConfigChange = (config: ConstraintConfig) => {
    updateCurrentProject({ constraintConfig: config });
  };

  const handleQuestionUpdate = useCallback(async (updatedQuestion: any) => {
    if (!currentProjectId || !window.electronAPI) return;

    try {
      // Update question in database
      const success = await window.electronAPI.questions.updateQuestion(
        updatedQuestion.uuid,
        {
          question: updatedQuestion.question,
          question_image_url: updatedQuestion.question_image_url,
          option_a: updatedQuestion.option_a,
          option_a_image_url: updatedQuestion.option_a_image_url,
          option_b: updatedQuestion.option_b,
          option_b_image_url: updatedQuestion.option_b_image_url,
          option_c: updatedQuestion.option_c,
          option_c_image_url: updatedQuestion.option_c_image_url,
          option_d: updatedQuestion.option_d,
          option_d_image_url: updatedQuestion.option_d_image_url,
          answer: updatedQuestion.answer,
          type: updatedQuestion.type,
          year: updatedQuestion.year,
          tag_1: updatedQuestion.tag_1,
          tag_2: updatedQuestion.tag_2,
          tag_3: updatedQuestion.tag_3,
          tag_4: updatedQuestion.tag_4,
          updated_at: new Date().toISOString()
        }
      );

      if (success) {
        // Refetch the question from database to ensure sync
        const freshQuestion = await window.electronAPI.questions.getByUUID(updatedQuestion.uuid);

        if (freshQuestion) {
          // Update in-memory project state with fresh data from database
          const updatedSections = sections.map(section => ({
            ...section,
            selectedQuestions: section.selectedQuestions.map(sq => {
              if (sq.question.uuid === updatedQuestion.uuid) {
                return { ...sq, question: freshQuestion };
              }
              return sq;
            })
          }));

          updateCurrentProject({ sections: updatedSections });
          addNotification('success', 'Question updated successfully!');
        } else {
          // Fallback to using updatedQuestion if refetch fails
          const updatedSections = sections.map(section => ({
            ...section,
            selectedQuestions: section.selectedQuestions.map(sq => {
              if (sq.question.uuid === updatedQuestion.uuid) {
                return { ...sq, question: updatedQuestion };
              }
              return sq;
            })
          }));

          updateCurrentProject({ sections: updatedSections });
          addNotification('success', 'Question updated successfully!');
        }
      } else {
        addNotification('error', 'Failed to update question in database.');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      addNotification('error', 'An error occurred while updating the question.');
    }
  }, [currentProjectId, sections, updateCurrentProject, addNotification]);

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

    const updatedSections = sections.map(section => ({
      ...section,
      selectedQuestions: section.selectedQuestions.map(sq => {
        if (sq.question.uuid === questionUuid) {
          return { ...sq, status: status };
        }
        return sq;
      })
    }));

    updateCurrentProject({ sections: updatedSections });
  }, [currentProjectId, sections, updateCurrentProject]);

  const handleVerifyQuestion = useCallback(async (questionUuid: string, status: 'approved' | 'rejected' | 'pending') => {
      if (!window.electronAPI) return;
      try {
          const success = await window.electronAPI.questions.updateQuestion(questionUuid, { verification_level_1: status });
          if (!success) {
              console.error("Failed to update verification status in DB");
          } else {
              // Also update status in memory if needed
              handleQuestionStatusUpdate(questionUuid, status === 'approved' ? 'accepted' : 'pending');
          }
      } catch (e) {
          console.error("Error verifying question:", e);
      }
  }, [handleQuestionStatusUpdate]);

  const handleStartEditing = (question: Question) => {
    if (!currentProject) return;

    // Determine which section this question belongs to
    // This is important for "Full Test Review" where questions from all sections are visible
    let targetSectionIndex = currentProject.currentSectionIndex;

    // Search for the question in all sections
    sections.forEach((section, index) => {
        if (section.selectedQuestions.some(sq => sq.question.uuid === question.uuid)) {
            targetSectionIndex = index;
        }
    });

    setEditingQuestion({ question });

    // Only set previousStep if we are NOT already in editing mode
    if (currentProject.currentStep !== 'edit-question') {
        setPreviousStep(currentProject.currentStep);
    }

    setLastEditedQuestionUuid(question.uuid); // Sync local state

    updateCurrentProject({
        currentStep: 'edit-question',
        lastActiveQuestionUuid: question.uuid,
        currentSectionIndex: targetSectionIndex // Switch context to the correct section
    });
  };

  // Next/Previous functionality for Editor
  const handleEditorNext = () => {
    if (!currentProjectId || !editingQuestion) return;

    // If we came from Test Review, we should be able to navigate across sections
    if (previousStep === 'test-review') {
        // Flatten all selected questions across all sections
        const allQuestions = sections.flatMap(s => sortQuestionsForSection(s.selectedQuestions));
        const currentIndex = allQuestions.findIndex(sq => sq.question.uuid === editingQuestion.question.uuid);

        if (currentIndex !== -1 && currentIndex < allQuestions.length - 1) {
            const nextQ = allQuestions[currentIndex + 1].question;
            handleStartEditing(nextQ);
        }
    } else {
        // Normal behavior: navigate within current section
        const currentSection = sections[currentSectionIndex];
        if (!currentSection) return;

        // Use sorted list to match display order
        const sortedQuestions = sortQuestionsForSection(currentSection.selectedQuestions);
        const currentIndex = sortedQuestions.findIndex(sq => sq.question.uuid === editingQuestion.question.uuid);

        if (currentIndex !== -1 && currentIndex < sortedQuestions.length - 1) {
            const nextQ = sortedQuestions[currentIndex + 1].question;
            handleStartEditing(nextQ);
        }
    }
  };

  const handleEditorPrevious = () => {
     if (!currentProjectId || !editingQuestion) return;

     if (previousStep === 'test-review') {
         // Flatten all selected questions across all sections
         const allQuestions = sections.flatMap(s => sortQuestionsForSection(s.selectedQuestions));
         const currentIndex = allQuestions.findIndex(sq => sq.question.uuid === editingQuestion.question.uuid);

         if (currentIndex > 0) {
             const prevQ = allQuestions[currentIndex - 1].question;
             handleStartEditing(prevQ);
         }
     } else {
        const currentSection = sections[currentSectionIndex];
        if (!currentSection) return;

        const sortedQuestions = sortQuestionsForSection(currentSection.selectedQuestions);
        const currentIndex = sortedQuestions.findIndex(sq => sq.question.uuid === editingQuestion.question.uuid);
        if (currentIndex > 0) {
            const prevQ = sortedQuestions[currentIndex - 1].question;
            handleStartEditing(prevQ);
        }
     }
  };

  const handleCloneQuestion = (question: Question) => {
    const clonedQuestion = {
      ...question,
      uuid: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      frequency: 0,
    };
    handleStartEditing(clonedQuestion);
  };

  const handleIntermediateSave = async (updatedQuestion: Question, updatedSolution?: Solution) => {
    if (!updatedQuestion) return;

    // Update question in database and in-memory state
    await handleQuestionUpdate(updatedQuestion);

    // Save solution if provided
    if (updatedSolution && window.electronAPI) {
      try {
        await window.electronAPI.questions.saveSolution(
          updatedSolution.uuid,
          updatedSolution.solution_text || '',
          updatedSolution.solution_image_url || ''
        );
      } catch (error) {
        console.error('Error saving solution:', error);
        addNotification('warning', 'Question saved, but failed to save solution.');
      }
    }
  };

  const handleFinishEditing = async (updatedQuestion: Question | null, updatedSolution?: Solution) => {
    if (!updatedQuestion) {
      if (previousStep) {
        updateCurrentProject({ currentStep: previousStep });
      }
      setEditingQuestion(null);
      setLastEditedQuestionUuid(null);
      return;
    }

    // Use shared save logic
    await handleIntermediateSave(updatedQuestion, updatedSolution);

    // Set the last edited question UUID so we can scroll to it
    setLastEditedQuestionUuid(updatedQuestion.uuid);

    // Return to previous step
    if (previousStep) {
      updateCurrentProject({ currentStep: previousStep, lastActiveQuestionUuid: updatedQuestion.uuid });
    }
    setEditingQuestion(null);
  };

  const renderStep = () => {
    // If in Landing Mode
    if (appMode === 'landing') {
      return <LandingPage onSelectMode={handleModeSelect} />;
    }

    // If in Database Cleaning Mode
    if (appMode === 'database-cleaning') {
        if (!dbConnected) {
             return (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="bg-primary/10 dark:bg-primary/20 rounded-full p-8 mb-6 animate-fade-in">
                  <span className="material-symbols-outlined text-7xl text-primary">database</span>
                </div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Database Cleaning</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg max-w-md">
                  Please connect to a question database to begin.
                </p>
                <button
                  onClick={handleDatabaseSelect}
                  className="bg-primary text-white px-8 py-4 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
                >
                  <span className="material-symbols-outlined text-xl">folder_open</span>
                  Select Database File
                </button>
              </div>
            );
        }

        // Handle editing within database cleaning
        if (editingQuestion) {
             return (
                <QuestionEditor
                    question={editingQuestion.question}
                    solution={editingQuestion.solution}
                    onSave={handleFinishEditing}
                    onCancel={() => handleFinishEditing(null)}
                />
            );
        }

        return (
          <DatabaseCleaning
            onStartEditing={(question) => {
              setEditingQuestion({ question });
              // We are piggybacking on existing state logic but we are in a different mode
              // Actually, editingQuestion state is global, so it should work if we render conditionally
            }}
            onClone={(question) => {
                const clonedQuestion = {
                  ...question,
                  uuid: crypto.randomUUID(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  frequency: 0,
                };
                setEditingQuestion({ question: clonedQuestion });
            }}
            scrollToQuestionUuid={lastEditedQuestionUuid}
            onScrollComplete={() => setLastEditedQuestionUuid(null)}
            refreshTrigger={questionsRefreshTrigger}
            chaptersPath={chaptersPath}
          />
        );
    }

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
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-primary/10 dark:bg-primary/20 rounded-full p-8 mb-6 animate-fade-in">
              <span className="material-symbols-outlined text-7xl text-primary">database</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Test Generation System</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg max-w-md">
              Please connect to a question database and select a chapters file to begin.
            </p>

            <div className="flex flex-col gap-4 w-full max-w-md">
                {/* Database Selection */}
                <div className={`p-4 rounded-xl border transition-all ${dbConnected ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-white dark:bg-[#1e1e2d] border-gray-200 dark:border-[#2d2d3b]'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined ${dbConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>database</span>
                            <div className="text-left">
                                <h3 className={`font-semibold ${dbConnected ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-white'}`}>Database</h3>
                                {dbConnected && <p className="text-xs text-green-700 dark:text-green-300 truncate max-w-[200px]">{getFileName(dbPath)}</p>}
                            </div>
                        </div>
                        {dbConnected && <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>}
                    </div>
                    <button
                        onClick={handleDatabaseSelect}
                        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                            dbConnected
                                ? 'bg-white border border-green-200 text-green-700 hover:bg-green-50 dark:bg-transparent dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20'
                                : 'bg-primary text-white hover:bg-primary/90 shadow-md'
                        }`}
                    >
                        {dbConnected ? 'Change Database' : 'Select Database File'}
                    </button>
                </div>

                {/* Chapters Selection */}
                <div className={`p-4 rounded-xl border transition-all ${chaptersConnected ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-white dark:bg-[#1e1e2d] border-gray-200 dark:border-[#2d2d3b]'}`}>
                     <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined ${chaptersConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>menu_book</span>
                            <div className="text-left">
                                <h3 className={`font-semibold ${chaptersConnected ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-white'}`}>Chapters File</h3>
                                {chaptersConnected && <p className="text-xs text-green-700 dark:text-green-300 truncate max-w-[200px]">{getFileName(chaptersPath)}</p>}
                            </div>
                        </div>
                         {chaptersConnected && <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>}
                    </div>
                    <button
                        onClick={handleChaptersSelect}
                        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                            chaptersConnected
                                ? 'bg-white border border-green-200 text-green-700 hover:bg-green-50 dark:bg-transparent dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20'
                                : 'bg-primary text-white hover:bg-primary/90 shadow-md'
                        }`}
                    >
                        {chaptersConnected ? 'Change Chapters File' : 'Select Chapters File'}
                    </button>
                </div>

            </div>
          </div>
        );

      case 'dashboard':
        return (
          <Dashboard
            projects={projects}
            onLoadProject={loadProject}
            onCreateNew={createNewProject}
            onDeleteProject={handleDeleteProject}
          />
        );

      case 'full-test-creation':
        return (
            <FullTestCreation
                onCancel={() => setIsCreatingNew(false)}
                onProceed={handleFullTestCreation}
            />
        );

      case 'test-creation':
        return <TestCreationForm onSubmit={handleTestCreation} defaultTestType={newTestType} />;

      case 'full-test-overview':
        if (!testMetadata) return <div>Loading...</div>;
        return (
            <FullTestOverview
                testMetadata={testMetadata}
                sections={sections}
                onSelectChapter={(sectionIndex, chapterCode) => {
                    updateCurrentProject({
                        currentSectionIndex: sectionIndex,
                        activeChapterCode: chapterCode,
                        fullTestSectionView: sectionIndex, // Persist view preference
                        currentStep: 'full-test-question-select'
                    });
                }}
                activeSectionIndex={currentProject?.fullTestSectionView}
                onSectionIndexChange={(idx) => updateCurrentProject({ fullTestSectionView: idx })}
                onReview={() => updateCurrentProject({ currentStep: 'test-review' })}
                onBack={() => setIsCreatingNew(false)} // Or dashboard
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
      case 'full-test-question-select':
        const currentSection = sections[currentSectionIndex];
        if (!currentSection) return <div>Loading...</div>;

        // Full Test Logic
        const isFullTest = testMetadata?.testType === 'Full';
        const activeChapterCode = currentProject?.activeChapterCode;

        let limitCount = undefined;
        let lockedDivision: 1 | 2 | undefined = undefined;

        if (isFullTest && activeChapterCode) {
            limitCount = currentSection.betaConstraint?.weightage?.[activeChapterCode];
            // Infer division from section type (Div 1 or Div 2)
            if (currentSection.betaConstraint?.type === "Div 1") lockedDivision = 1;
            if (currentSection.betaConstraint?.type === "Div 2") lockedDivision = 2;
        }

        return (
          <QuestionSelection
            key={`${currentProjectId}-${currentSectionIndex}-${activeChapterCode || ''}`}
            sectionName={currentSection.name}
            chapters={currentSection.chapters}
            alphaConstraint={currentSection.alphaConstraint}
            betaConstraint={currentSection.betaConstraint}
            onComplete={handleQuestionSelection}
            onBack={handleBackFromSelection}
            onStartEditing={handleStartEditing}
            onClone={handleCloneQuestion}
            initialSelectedQuestions={currentSection.selectedQuestions}
            onChange={handleSelectionChange}
            scrollToQuestionUuid={lastEditedQuestionUuid}
            onScrollComplete={() => setLastEditedQuestionUuid(null)}
            refreshTrigger={questionsRefreshTrigger}
            // New props for Full Test
            lockedChapterCode={activeChapterCode}
            limitCount={limitCount}
            lockedDivision={lockedDivision}
            onNextChapter={handleNextChapter}
          />
        );

      case 'test-review':
        return (
          <TestReview
            sections={sections}
            onStartEditing={handleStartEditing}
            onBack={handleBackFromSelection}
            onExport={handleExportTest}
            onRemoveQuestion={handleRemoveQuestion}
            onUpdateQuestionStatus={handleQuestionStatusUpdate}
            initialQuestionUuid={lastEditedQuestionUuid}
            onNavigationComplete={() => setLastEditedQuestionUuid(null)}
            onSwitchQuestion={initiateSwitchQuestion} // Use the new initiator
            onVerifyQuestion={handleVerifyQuestion} // Pass handler
          />
        );

      case 'edit-question':
        if (!editingQuestion) {
          // Auto-recovery: redirect to first section instead of showing error
          // This handles edge cases where the useEffect hasn't run yet
          if (currentProject) {
            updateCurrentProject({ currentStep: 'question-select-physics', currentSectionIndex: 0 });
          }
          return <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Redirecting...</div>
          </div>;
        }
        // Calculate Question Number
        let absoluteIndex = 0;
        if (sections[currentSectionIndex]) {
             const currentIndex = sections[currentSectionIndex].selectedQuestions.findIndex(sq => sq.question.uuid === editingQuestion.question.uuid);
             if (currentIndex !== -1) absoluteIndex = currentIndex + 1;
        }

        return (
            <QuestionEditor
                question={editingQuestion.question}
                solution={editingQuestion.solution}
                onSave={handleFinishEditing}
                onIntermediateSave={handleIntermediateSave}
                onCancel={() => handleFinishEditing(null)}
                subject={sections[currentSectionIndex]?.name}
                onNext={handleEditorNext}
                onPrevious={handleEditorPrevious}
                questionNumber={absoluteIndex > 0 ? absoluteIndex : undefined}
            />
        );

      case 'complete':
        const totalQuestions = sections.reduce((sum, section) => sum + section.selectedQuestions.length, 0);
        const totalMarks = totalQuestions * 4;
        return (
          <div className="flex-1 overflow-y-auto w-full">
            <div className="flex flex-col items-center justify-center min-h-full text-center max-w-2xl mx-auto py-12 px-4">
              {/* Success Icon */}
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-8 mb-6">
              <span className="material-symbols-outlined text-7xl text-green-600 dark:text-green-400">check_circle</span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl font-bold mb-3 text-gray-900 dark:text-white">
              Test Generated Successfully!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-10 text-lg">
              Your new practice test is ready. You can download it, copy it, or create another one.
            </p>

            {/* Test Summary Card */}
            <div className="w-full bg-white dark:bg-[#1e1e2d] rounded-2xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm p-8 mb-8 text-left">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-200 dark:border-[#2d2d3b]">
                Test Summary
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Test ID</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{testMetadata?.code || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Title</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{testMetadata?.description || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Questions</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{totalQuestions}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Marks</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{totalMarks}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full mb-8">
              <button
                onClick={() => addNotification('info', 'Test has already been exported to a JSON file')}
                className="flex-1 bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <span className="material-symbols-outlined text-xl">download</span>
                Download JSON
              </button>
              <button
                onClick={() => addNotification('info', 'Copy functionality coming soon')}
                className="flex-1 bg-white dark:bg-[#1e1e2d] border-2 border-gray-200 dark:border-[#2d2d3b] text-gray-900 dark:text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-[#252535] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-xl">content_copy</span>
                Copy to Clipboard
              </button>
            </div>

            {/* Secondary Actions */}
            <div className="flex items-center gap-6 text-sm">
              <button
                onClick={() => updateCurrentProject({ currentStep: 'test-review' })}
                className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-1 font-medium"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Back to Review
              </button>
              <button
                onClick={() => createNewProject()}
                className="text-primary hover:text-primary/90 transition-colors flex items-center gap-1 font-semibold"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Create Another Test
              </button>
            </div>
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
            testType={testMetadata?.testType} // Pass testType
          />
        )}
        {stepContent}
      </>
    );
  };

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

  const saveStatusClasses = {
    saved: 'bg-green-100 text-green-700',
    saving: 'bg-yellow-100 text-yellow-700 animate-pulse',
    unsaved: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#121121] text-gray-900 dark:text-white overflow-hidden">
      <TitleBar />
      <Notification notifications={notifications} removeNotification={removeNotification} />

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-[#2d2d3b] bg-white dark:bg-[#1e1e2d] transition-colors duration-200">
        <div className="flex items-center gap-4">
          {appMode !== 'landing' && (
             <button onClick={() => setAppMode('landing')} className="mr-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#252535]" title="Back to Home">
                 <span className="material-symbols-outlined">home</span>
             </button>
          )}
          <img
            src="https://drive.google.com/thumbnail?id=1yLtX3YxubbDBsKYDj82qiaGbSkSX7aLv&sz=w1000"
            alt="Logo"
            className="h-6 w-6 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={goToDashboard}
          />
          <h1 className="text-lg font-bold cursor-pointer hover:text-primary transition-colors" onClick={goToDashboard}>
            {appMode === 'database-cleaning' ? 'Database Tagging & Cleaning' : 'Test Generation System'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddQuestionModalOpen(true)}
            title="Add New Question"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252535] transition-colors"
          >
            <span className="material-symbols-outlined">add_circle</span>
          </button>

          <button
            onClick={toggleDarkMode}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252535] transition-colors"
          >
            <span className="material-symbols-outlined">{darkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>

          {currentProjectId && (
            <div className={`text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-all ${saveStatusClasses[saveStatus]}`}>
              <span className="material-symbols-outlined text-sm">
                {saveStatus === 'saving' ? 'sync' : saveStatus === 'saved' ? 'check_circle' : 'pending'}
              </span>
              {saveStatus.charAt(0).toUpperCase() + saveStatus.slice(1)}
            </div>
          )}

          <div className="relative">
            <div
              onClick={toggleDbDropdown}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium cursor-pointer transition-all ${
                dbConnected
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              <span className="material-symbols-outlined text-sm">database</span>
              {dbConnected ? 'Connected' : 'Disconnected'}
              <span className="material-symbols-outlined text-sm">
                {showDbDropdown ? 'expand_less' : 'expand_more'}
              </span>
            </div>

            {showDbDropdown && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-xl shadow-xl z-50 animate-fade-in">
                <div className="p-4 font-semibold border-b border-gray-200 dark:border-[#2d2d3b] text-gray-900 dark:text-white">
                  Connections
                </div>

                {/* Database Info */}
                <div className="p-4 border-b border-gray-200 dark:border-[#2d2d3b]">
                   <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-semibold text-gray-500 uppercase">Database</span>
                       {dbConnected ? (
                           <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">Connected</span>
                       ) : (
                           <span className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">Disconnected</span>
                       )}
                   </div>
                   {dbConnected && dbPath ? (
                        <div className="text-sm truncate text-gray-700 dark:text-gray-300" title={dbPath}>{getFileName(dbPath)}</div>
                   ) : (
                       <div className="text-sm text-gray-400 italic">No database selected</div>
                   )}
                   <button
                       onClick={() => { setShowDbDropdown(false); handleDatabaseSelect(); }}
                       className="mt-2 text-xs text-primary hover:underline"
                   >
                       Change
                   </button>
                </div>

                {/* Chapters Info */}
                <div className="p-4 border-b border-gray-200 dark:border-[#2d2d3b]">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-semibold text-gray-500 uppercase">Chapters File</span>
                       {chaptersConnected ? (
                           <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">Loaded</span>
                       ) : (
                           <span className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">Not Loaded</span>
                       )}
                   </div>
                   {chaptersConnected && chaptersPath ? (
                        <div className="text-sm truncate text-gray-700 dark:text-gray-300" title={chaptersPath}>{getFileName(chaptersPath)}</div>
                   ) : (
                       <div className="text-sm text-gray-400 italic">No file selected</div>
                   )}
                   <button
                       onClick={() => { setShowDbDropdown(false); handleChaptersSelect(); }}
                       className="mt-2 text-xs text-primary hover:underline"
                   >
                       Change
                   </button>
                </div>

                <div className="p-2 bg-gray-50 dark:bg-[#252535] rounded-b-xl">
                    <p className="text-[10px] text-gray-500 text-center">Settings persist across sessions</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Project Tabs - Only in Test Generation Mode */}
      {dbConnected && appMode === 'test-generation' && (
        <ProjectTabs
          projects={openProjects}
          currentProjectId={currentProjectId}
          onSelectProject={loadProject}
          onCloseProject={handleCloseProject}
          onNewProject={createNewProject}
          onDashboard={goToDashboard}
        />
      )}

      {/* Main Content - Each page handles its own scrolling */}
      <main className="flex-1 overflow-hidden flex flex-col" key={currentProjectId || 'new'}>
        {renderStep()}
      </main>

      {/* Add Question Modal */}
      {isAddQuestionModalOpen && (
        <AddQuestionModal
          onClose={() => setIsAddQuestionModalOpen(false)}
          onSave={handleAddQuestion}
        />
      )}

      {/* Switch Question Modal */}
      {switchTargetQuestionUuid && (
        <AddQuestionModal
            onClose={() => {
                setSwitchTargetQuestionUuid(null);
                setSwitchTargetQuestionData(null);
            }}
            onSave={handleSwitchQuestion}
            initialData={switchTargetQuestionData} // Pass the data for pre-fill
            isIPQMode={true} // Flag to enforce IPQ behavior
        />
      )}

      {/* Export Test Modal */}
      {isExportModalOpen && testMetadata && (
        <ExportTestModal
          test={{ metadata: testMetadata, sections }}
          sections={sections}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExportWithConfig}
        />
      )}
    </div>
  );
}

export default App;
