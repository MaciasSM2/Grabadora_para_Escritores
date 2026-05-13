import { create } from 'zustand';

type TabType = 'tone' | 'history' | 'import';

type ViewType = 'dictation' | 'review';

interface UIState {
  currentView: ViewType;
  isSettingsOpen: boolean;
  settingsActiveTab: TabType;
  setCurrentView: (view: ViewType) => void;
  openSettings: (tab?: TabType) => void;
  closeSettings: () => void;
  setSettingsTab: (tab: TabType) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'dictation',
  isSettingsOpen: false,
  settingsActiveTab: 'tone',
  setCurrentView: (view) => set({ currentView: view }),
  openSettings: (tab = 'tone') => set({ isSettingsOpen: true, settingsActiveTab: tab }),
  closeSettings: () => set({ isSettingsOpen: false }),
  setSettingsTab: (tab) => set({ settingsActiveTab: tab }),
}));
