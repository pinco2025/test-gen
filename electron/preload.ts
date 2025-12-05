import { contextBridge, ipcRenderer } from 'electron';
import { Question, QuestionFilter, Test } from '../src/types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  db: {
    connect: (dbPath?: string) => ipcRenderer.invoke('db:connect', dbPath),
    selectFile: () => ipcRenderer.invoke('db:selectFile'),
    isConnected: () => ipcRenderer.invoke('db:isConnected'),
    getTypes: () => ipcRenderer.invoke('db:getTypes'),
    getYears: () => ipcRenderer.invoke('db:getYears'),
    getTags: () => ipcRenderer.invoke('db:getTags'),
    getChaptersByType: () => ipcRenderer.invoke('db:getChaptersByType')
  },

  // Question operations
  questions: {
    getAll: (filter?: QuestionFilter) => ipcRenderer.invoke('questions:getAll', filter),
    getByUUID: (uuid: string) => ipcRenderer.invoke('questions:getByUUID', uuid),
    search: (criteria: any) => ipcRenderer.invoke('questions:search', criteria),
    getCount: (filter?: QuestionFilter) => ipcRenderer.invoke('questions:getCount', filter),
    getByChapterCodes: (type: string, chapterCodes: string[]) => ipcRenderer.invoke('questions:getByChapterCodes', type, chapterCodes)
  },

  // Test operations
  test: {
    export: (test: Test) => ipcRenderer.invoke('test:export', test)
  }
});

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: {
      db: {
        connect: (dbPath?: string) => Promise<{ success: boolean; error?: string }>;
        selectFile: () => Promise<{ success: boolean; path?: string; error?: string }>;
        isConnected: () => Promise<boolean>;
        getTypes: () => Promise<string[]>;
        getYears: () => Promise<string[]>;
        getTags: () => Promise<string[]>;
        getChaptersByType: () => Promise<{ [type: string]: string[] }>;
      };
      questions: {
        getAll: (filter?: QuestionFilter) => Promise<Question[]>;
        getByUUID: (uuid: string) => Promise<Question | null>;
        search: (criteria: any) => Promise<Question[]>;
        getCount: (filter?: QuestionFilter) => Promise<number>;
        getByChapterCodes: (type: string, chapterCodes: string[]) => Promise<Question[]>;
      };
      test: {
        export: (test: Test) => Promise<{ success: boolean; path?: string; error?: string }>;
      };
    };
  }
}
