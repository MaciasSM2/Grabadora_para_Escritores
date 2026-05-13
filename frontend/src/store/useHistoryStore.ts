import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { API_BASE } from '@/lib/api'

export interface Job {
  id: string
  filename: string
  transcription: string
  createdAt: string
}

export interface SavedDocument {
  id: number
  title: string
  excerpt: string
  tone_name: string
  created_at: string
}

interface HistoryState {
  jobs: Job[]
  savedDocs: SavedDocument[]
  addJob: (job: Job) => void
  fetchHistory: () => Promise<void>
  fetchSavedDocs: () => Promise<void>
  clearHistory: () => void
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      jobs: [],
      savedDocs: [],
      addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
      fetchHistory: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/history`);
          if (res.ok) {
            const data = await res.json();
            set({ jobs: data });
          }
        } catch (e) {
          console.error("Failed to fetch history", e);
        }
      },
      fetchSavedDocs: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/history/list`);
          if (res.ok) {
            const data = await res.json();
            set({ savedDocs: data });
          }
        } catch (e) {
          console.error("Failed to fetch saved documents", e);
        }
      },
      clearHistory: () => set({ jobs: [], savedDocs: [] }),
    }),
    {
      name: 'gema-history-storage',
    }
  )
)
