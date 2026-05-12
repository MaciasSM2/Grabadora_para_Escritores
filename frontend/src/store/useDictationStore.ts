import { create } from 'zustand'

interface DictationState {
  isRecording: boolean
  unprocessedPhrase: string
  interimText: string
  setRecording: (recording: boolean) => void
  addUnprocessedPhrase: (text: string) => void
  clearUnprocessedPhrase: () => void
  setInterimText: (text: string) => void
  clearDictation: () => void
}

export const useDictationStore = create<DictationState>((set) => ({
  isRecording: false,
  unprocessedPhrase: '',
  interimText: '',
  setRecording: (isRecording) => set({ isRecording }),
  addUnprocessedPhrase: (text) => set((state) => ({ unprocessedPhrase: state.unprocessedPhrase + text })),
  clearUnprocessedPhrase: () => set({ unprocessedPhrase: '' }),
  setInterimText: (interimText) => set({ interimText }),
  clearDictation: () => set({ unprocessedPhrase: '', interimText: '' }),
}))
