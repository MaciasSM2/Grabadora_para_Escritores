import { ISpeechTranscriber, SpeechTranscriberEvents } from './ISpeechTranscriber';

export class BrowserSpeechAdapter implements ISpeechTranscriber {
  private recognition: any = null;
  private isRecording: boolean = false;
  private isManualStop: boolean = true;
  private events: Partial<SpeechTranscriberEvents> = {};
  private lang: string;

  constructor(lang: string = 'es-ES') {
    this.lang = lang;
  }

  private initRecognition() {
    if (typeof window === 'undefined') return false;
    
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Web Speech API no está soportada.");
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.lang;

    this.recognition.onresult = this.handleResult.bind(this);
    this.recognition.onerror = this.handleError.bind(this);
    this.recognition.onend = this.handleEnd.bind(this);
    
    return true;
  }

  private handleResult(event: any) {
    let final = '';
    let interim = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) final += event.results[i][0].transcript;
      else interim += event.results[i][0].transcript;
    }

    // El espacio extra asegura que las frases no se peguen
    if (final && this.events.onFinalResult) this.events.onFinalResult(final + ' ');
    if (this.events.onInterimResult) this.events.onInterimResult(interim);
  }

  private handleError(event: any) {
    if (this.events.onError) this.events.onError(event.error);
    if (event.error === 'not-allowed') this.updateStatus(false);
  }

  private handleEnd() {
    if (!this.isManualStop) {
      try { 
        this.recognition?.start(); 
      } catch (e) { 
        console.warn("Error al auto-reiniciar", e);
        this.updateStatus(false); 
      }
    } else {
      this.updateStatus(false);
    }
  }

  private updateStatus(status: boolean) {
    this.isRecording = status;
    if (this.events.onStatusChange) this.events.onStatusChange(status);
  }

  public subscribe(events: Partial<SpeechTranscriberEvents>) {
    this.events = events;
  }

  public unsubscribe() {
    this.events = {};
  }

  public start() {
    this.isManualStop = false;
    
    if (!this.recognition) {
      const initialized = this.initRecognition();
      if (!initialized) return; // Navegador no soportado
    }
    
    try {
      this.recognition.start();
      this.updateStatus(true);
    } catch (e) { 
      console.warn("Speech recognition ya está iniciado o falló.");
    }
  }

  public stop() {
    this.isManualStop = true;
    if (!this.recognition) return;
    
    try {
      this.recognition.stop();
      this.updateStatus(false);
    } catch (e) { 
      console.warn("Error al detener el reconocimiento", e);
    }
  }
}
