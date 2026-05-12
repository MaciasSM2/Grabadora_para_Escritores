import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ToneState {
  toneName: string
  referenceText: string
  setTone: (name: string, reference: string) => void
}

export const useToneStore = create<ToneState>()(
  persist(
    (set) => ({
      toneName: 'Narrativa de Ciencia Ficción y Fantasía Épica',
      referenceText: 'Era el mejor de los tiempos, era el peor de los tiempos, la edad de la sabiduría, y también de la locura...',
      setTone: (toneName, referenceText) => set({ toneName, referenceText }),
    }),
    {
      name: 'gema-tone-storage',
    }
  )
)
