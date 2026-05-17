export interface SpeechTranscriberEvents {
  onInterimResult: (text: string) => void;
  onFinalResult: (text: string) => void;
  onError: (error: string) => void;
  onStatusChange: (isRecording: boolean) => void;
}

export interface ISpeechTranscriber {
  start(): void;
  stop(): void;
  subscribe(events: Partial<SpeechTranscriberEvents>): void;
  unsubscribe(): void;
}
