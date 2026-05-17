import { diffWords } from 'diff';

self.addEventListener('message', (event: MessageEvent<{ rawText: string; correctedText: string }>) => {
  const { rawText, correctedText } = event.data;
  
  if (rawText && correctedText) {
    try {
      const diffResult = diffWords(rawText, correctedText);
      
      const initialChunks = diffResult.map((change, index) => ({
        id: `chunk-${index}-${Date.now()}`,
        value: change.value,
        added: change.added,
        removed: change.removed,
        status: 'pending',
      }));
      
      self.postMessage({ type: 'SUCCESS', chunks: initialChunks });
    } catch (error: any) {
      self.postMessage({ type: 'ERROR', error: error.message });
    }
  }
});
