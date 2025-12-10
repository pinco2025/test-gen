import { contextBridge, ipcRenderer } from 'electron';
import { Question, QuestionFilter, Test, ProjectState, ProjectInfo, AppConfig } from '../src/types';

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
    getByUUIDs: (uuids: string[]) => ipcRenderer.invoke('questions:getByUUIDs', uuids),
    search: (criteria: any) => ipcRenderer.invoke('questions:search', criteria),
    getCount: (filter?: QuestionFilter) => ipcRenderer.invoke('questions:getCount', filter),
    getByChapterCodes: (type: string, chapterCodes: string[]) => ipcRenderer.invoke('questions:getByChapterCodes', type, chapterCodes),
    incrementFrequency: (uuid: string) => ipcRenderer.invoke('questions:incrementFrequency', uuid),
    decrementFrequency: (uuid: string) => ipcRenderer.invoke('questions:decrementFrequency', uuid),
    updateQuestion: (uuid: string, updates: Partial<Question>) => ipcRenderer.invoke('questions:updateQuestion', uuid, updates),
    createQuestion: (question: Question) => ipcRenderer.invoke('questions:createQuestion', question),
    getSolution: (uuid: string) => ipcRenderer.invoke('questions:getSolution', uuid),
    saveSolution: (uuid: string, solutionText: string, solutionImageUrl: string) => ipcRenderer.invoke('questions:saveSolution', uuid, solutionText, solutionImageUrl)
  },

  // Test operations
  test: {
    export: (test: Test) => ipcRenderer.invoke('test:export', test)
  },

  // Project operations
  project: {
    save: (projectState: ProjectState) => ipcRenderer.invoke('project:save', projectState),
    load: (projectId: string) => ipcRenderer.invoke('project:load', projectId),
    delete: (projectId: string) => ipcRenderer.invoke('project:delete', projectId),
    list: () => ipcRenderer.invoke('project:list'),
    exists: (projectId: string) => ipcRenderer.invoke('project:exists', projectId)
  },

  // Config operations
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (updates: Partial<AppConfig>) => ipcRenderer.invoke('config:update', updates),
    deleteAllProjects: () => ipcRenderer.invoke('config:deleteAllProjects')
  }
});
