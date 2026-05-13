import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { API_BASE } from '@/lib/api'

interface ToneState {
  toneName: string
  referenceText: string
  setTone: (name: string, reference: string) => void
  fetchTones: () => Promise<void>
}

export const useToneStore = create<ToneState>()(
  persist(
    (set, get) => ({
      toneName: 'Narrativa de Ciencia Ficción y Fantasía Épica',
      referenceText: 'Era el mejor de los tiempos, era el peor de los tiempos, la edad de la sabiduría, y también de la locura...',
      setTone: async (toneName, referenceText) => {
        set({ toneName, referenceText });
        try {
          await fetch(`${API_BASE}/api/tones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tone_name: toneName, reference_text: referenceText })
          });
        } catch (e) {
          console.error("Failed to save tone to backend", e);
        }
      },
      fetchTones: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/tones`);
          if (res.ok) {
            const data = await res.json();
            const currentTone = get().toneName;
            if (data[currentTone]) {
              set({ referenceText: data[currentTone] });
            }
          }
        } catch (e) {
          console.error("Failed to fetch tones", e);
        }
      }
    }),
    {
      name: 'gema-tone-storage',
    }
  )
)
