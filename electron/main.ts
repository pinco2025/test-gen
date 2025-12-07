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

// Test export
ipcMain.handle('test:export', async (_, test: Test) => {
  const result = await dialog.showSaveDialog({
    defaultPath: `test-${test.metadata.code}.json`,
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, JSON.stringify(test, null, 2), 'utf-8');
      return { success: true, path: result.filePath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Export cancelled' };
});

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
