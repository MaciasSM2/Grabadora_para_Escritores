'use client';

import DictationCanvas from '@/components/DictationCanvas';
import TopNavbar from '@/components/TopNavbar';
import CorrectionReviewer from '@/components/CorrectionReviewer';
import { useUIStore } from '@/store/useUIStore';
import { useDictationStore } from '@/store/useDictationStore';
import { useToneStore } from '@/store/useToneStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useEffect } from 'react';

export default function Home() {
  const { currentView } = useUIStore();
  const { documentText } = useDictationStore();
  const { toneName, fetchTones } = useToneStore();
  const { fetchHistory } = useHistoryStore();

  useEffect(() => {
    fetchHistory();
    fetchTones();
  }, [fetchHistory, fetchTones]);

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 flex justify-center">
      <div className="max-w-5xl w-full flex flex-col gap-6">
        <TopNavbar />
        
        <div className="flex-1 min-h-[600px]">
          {currentView === 'dictation' ? (
            <DictationCanvas />
          ) : (
            <CorrectionReviewer rawText={documentText} toneName={toneName} />
          )}
        </div>
      </div>
    </main>
  );
}
