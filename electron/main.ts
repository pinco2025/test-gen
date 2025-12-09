import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { dbService } from './database';
import { projectService } from './projectService';
import { Question, QuestionFilter, Test, ProjectState, ProjectInfo, AppConfig } from '../src/types';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

// Detect if running in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const DEV_SERVER_URL = 'http://localhost:5173';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      icon: path.join(__dirname, "assets/icons/logo.png"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();

    // Wait for dev server and reload if needed
    mainWindow.webContents.on('did-fail-load', () => {
      setTimeout(() => {
        mainWindow?.reload();
      }, 1000);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    dbService.disconnect();
    app.quit();
  }
});

// IPC Handlers

// Database connection
ipcMain.handle('db:connect', async (_, dbPath?: string) => {
  try {
    dbService.connect(dbPath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:selectFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Database Files', extensions: ['db', 'sqlite', 'sqlite3'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dbPath = result.filePaths[0];
    try {
      dbService.connect(dbPath);
      return { success: true, path: dbPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'No file selected' };
});

ipcMain.handle('db:isConnected', () => {
  return dbService.isConnected();
});

// Question queries
ipcMain.handle('questions:getAll', async (_, filter?: QuestionFilter): Promise<Question[]> => {
  return dbService.getQuestions(filter);
});

ipcMain.handle('questions:getByUUID', async (_, uuid: string): Promise<Question | null> => {
  return dbService.getQuestionByUUID(uuid);
});

ipcMain.handle('questions:search', async (_, criteria: any): Promise<Question[]> => {
  return dbService.searchQuestions(criteria);
});

ipcMain.handle('questions:getCount', async (_, filter?: QuestionFilter): Promise<number> => {
  return dbService.getQuestionCount(filter);
});

ipcMain.handle('questions:getByChapterCodes', async (_, type: string, chapterCodes: string[]): Promise<Question[]> => {
  return dbService.getQuestionsByChapterCodes(type, chapterCodes);
});

// Frequency operations
ipcMain.handle('questions:incrementFrequency', async (_, uuid: string): Promise<boolean> => {
  return dbService.incrementFrequency(uuid);
});

ipcMain.handle('questions:decrementFrequency', async (_, uuid: string): Promise<boolean> => {
  return dbService.decrementFrequency(uuid);
});

ipcMain.handle('questions:updateQuestion', async (_, uuid: string, updates: Partial<Question>): Promise<boolean> => {
  return dbService.updateQuestion(uuid, updates);
});

ipcMain.handle('questions:createQuestion', async (_, question: Question): Promise<boolean> => {
  return dbService.createQuestion(question);
});

// Metadata queries
ipcMain.handle('db:getTypes', async (): Promise<string[]> => {
  return dbService.getTypes();
});

ipcMain.handle('db:getYears', async (): Promise<string[]> => {
  return dbService.getYears();
});

ipcMain.handle('db:getTags', async (): Promise<string[]> => {
  return dbService.getTags();
});

ipcMain.handle('db:getChaptersByType', async (): Promise<{ [type: string]: string[] }> => {
  return dbService.getChaptersByType();
});

// Test export - Transform to match sample-test-001.json format
ipcMain.handle('test:export', async (_, test: Test) => {
  const result = await dialog.showSaveDialog({
    defaultPath: `test-${test.metadata.code}.json`,
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    try {
      // Transform the test data to match sample-test-001.json format
      const exportData = transformTestToExportFormat(test);
      fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8');
      return { success: true, path: result.filePath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Export cancelled' };
});

// Helper function to transform Test object to sample-test-001.json format
function transformTestToExportFormat(test: Test) {
  const marksPerQuestion = 4;

  // Build section definitions
  // For each subject (Physics, Chemistry, Mathematics) we have Section A (Division 1) and Section B (Division 2)
  const sectionDefinitions = [
    { name: 'Physics A', marksPerQuestion },
    { name: 'Physics B', marksPerQuestion },
    { name: 'Chemistry A', marksPerQuestion },
    { name: 'Chemistry B', marksPerQuestion },
    { name: 'Mathematics A', marksPerQuestion },
    { name: 'Mathematics B', marksPerQuestion }
  ];

  // Build questions array
  const questions: any[] = [];
  let questionIndex = 1;

  for (const section of test.sections) {
    const sectionNameA = `${section.name} A`; // Division 1
    const sectionNameB = `${section.name} B`; // Division 2

    // Sort questions by division: Division 1 first, then Division 2
    const division1Questions = section.selectedQuestions.filter(sq => sq.division === 1);
    const division2Questions = section.selectedQuestions.filter(sq => sq.division === 2);

    // Process Division 1 questions (MCQ type)
    for (const sq of division1Questions) {
      const q = sq.question;
      questions.push({
        id: `q${questionIndex}`,
        uuid: q.uuid,
        text: q.question,
        image: q.question_image_url ? 1 : 0,
        imageUrl: q.question_image_url || null,
        options: [
          { id: 'a', text: q.option_a || '', imageUrl: q.option_a_image_url || null },
          { id: 'b', text: q.option_b || '', imageUrl: q.option_b_image_url || null },
          { id: 'c', text: q.option_c || '', imageUrl: q.option_c_image_url || null },
          { id: 'd', text: q.option_d || '', imageUrl: q.option_d_image_url || null }
        ],
        correctAnswer: q.answer.toLowerCase(),
        marks: marksPerQuestion,
        section: sectionNameA,
        tags: {
          tag1: q.tag_1 || '',
          tag2: q.tag_2 || '',
          tag3: q.tag_3 || '',
          tag4: q.tag_4 || '',
          type: q.type || '',
          year: q.year || ''
        },
        chapterCode: sq.chapterCode,
        chapterName: sq.chapterName,
        difficulty: sq.difficulty,
        division: sq.division
      });
      questionIndex++;
    }

    // Process Division 2 questions (numerical/integer type)
    for (const sq of division2Questions) {
      const q = sq.question;
      questions.push({
        id: `q${questionIndex}`,
        uuid: q.uuid,
        text: q.question,
        image: q.question_image_url ? 1 : 0,
        imageUrl: q.question_image_url || null,
        options: [], // Division 2 questions are numerical, no options
        correctAnswer: q.answer,
        marks: marksPerQuestion,
        section: sectionNameB,
        tags: {
          tag1: q.tag_1 || '',
          tag2: q.tag_2 || '',
          tag3: q.tag_3 || '',
          tag4: q.tag_4 || '',
          type: q.type || '',
          year: q.year || ''
        },
        chapterCode: sq.chapterCode,
        chapterName: sq.chapterName,
        difficulty: sq.difficulty,
        division: sq.division
      });
      questionIndex++;
    }
  }

  // Calculate total marks
  const totalMarks = questions.length * marksPerQuestion;

  // Calculate duration based on test type (Full = 3 hours, Part = 1.5 hours)
  const duration = test.metadata.testType === 'Full' ? 10800 : 5400;

  return {
    testId: test.metadata.code,
    title: test.metadata.description,
    testType: test.metadata.testType,
    createdAt: test.metadata.createdAt,
    duration,
    totalMarks,
    totalQuestions: questions.length,
    sections: sectionDefinitions,
    questions
  };
}

// Project management
ipcMain.handle('project:save', async (_, projectState: ProjectState) => {
  try {
    projectService.saveProject(projectState);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:load', async (_, projectId: string): Promise<ProjectState | null> => {
  return projectService.loadProject(projectId);
});

ipcMain.handle('project:delete', async (_, projectId: string) => {
  const success = projectService.deleteProject(projectId);
  return { success };
});

ipcMain.handle('project:list', async (): Promise<ProjectInfo[]> => {
  return projectService.listProjects();
});

ipcMain.handle('project:exists', async (_, projectId: string): Promise<boolean> => {
  return projectService.projectExists(projectId);
});

// App configuration
ipcMain.handle('config:get', async (): Promise<AppConfig> => {
  return projectService.getConfig();
});

ipcMain.handle('config:update', async (_, updates: Partial<AppConfig>) => {
  try {
    projectService.updateConfig(updates);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:deleteAllProjects', async () => {
  const count = projectService.deleteAllProjects();
  return { success: true, count };
});
