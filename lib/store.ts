import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ProjectSettings {
  projectName: string
  clientName: string
  pmName: string
  projectStart: string
  projectEnd: string
  systemType: string
  apiKey: string
  claudeApiKey: string
  geminiModel: string
  notionToken: string
  language: 'ko' | 'en'
}

export interface SessionDocuments {
  minutes: string | null
  requirements: string | null
  testCases: string | null
}

interface AppState {
  settings: ProjectSettings
  documents: SessionDocuments
  updateSettings: (s: Partial<ProjectSettings>) => void
  setDocument: (key: keyof SessionDocuments, value: string | null) => void
  clearAllDocuments: () => void
}

const defaultSettings: ProjectSettings = {
  projectName: '',
  clientName: '',
  pmName: '',
  projectStart: '',
  projectEnd: '',
  systemType: 'ERP',
  apiKey: '',
  claudeApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  notionToken: '',
  language: 'ko',
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      documents: { minutes: null, requirements: null, testCases: null },
      updateSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),
      setDocument: (key, value) =>
        set((state) => ({ documents: { ...state.documents, [key]: value } })),
      clearAllDocuments: () =>
        set({ documents: { minutes: null, requirements: null, testCases: null } }),
    }),
    {
      name: 'hr-pl-assistant',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
