import { create } from 'zustand'

interface DictationState {
  isRecording: boolean
  unprocessedPhrase: string
  interimText: string
  documentText: string
  setRecording: (recording: boolean) => void
  addUnprocessedPhrase: (text: string) => void
  clearUnprocessedPhrase: () => void
  setInterimText: (text: string) => void
  setDocumentText: (text: string) => void
  clearDictation: () => void
  resetStore: () => void
}

export const useDictationStore = create<DictationState>((set) => ({
  isRecording: false,
  unprocessedPhrase: '',
  interimText: '',
  documentText: '',
  setRecording: (isRecording) => set({ isRecording }),
  addUnprocessedPhrase: (text) => set((state) => ({ unprocessedPhrase: state.unprocessedPhrase + text })),
  clearUnprocessedPhrase: () => set({ unprocessedPhrase: '' }),
  setInterimText: (interimText) => set({ interimText }),
  setDocumentText: (documentText) => set({ documentText }),
  clearDictation: () => set({ unprocessedPhrase: '', interimText: '', documentText: '' }),
  resetStore: () => set({ isRecording: false, unprocessedPhrase: '', interimText: '', documentText: '' }),
}))
