import DictationCanvas from '@/components/DictationCanvas';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 flex justify-center">
      <div className="max-w-5xl w-full flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="text-blue-600">Gema</span>
            <span className="text-slate-400 font-light text-xl">| Estación Literaria</span>
          </h1>
        </header>
        
        <div className="flex-1 min-h-[600px]">
          <DictationCanvas />
        </div>
      </div>
    </main>
  );
}
