import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Job {
  id: string
  filename: string
  transcription: string
  createdAt: string
}

interface HistoryState {
  jobs: Job[]
  addJob: (job: Job) => void
  clearHistory: () => void
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      jobs: [],
      addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
      clearHistory: () => set({ jobs: [] }),
    }),
    {
      name: 'gema-history-storage',
    }
  )
)
