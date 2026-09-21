/**
 * Thin wrapper over the browser SpeechRecognition API.
 *
 * Audio never leaves the browser's own recognition pipeline: we only ever read
 * the transcript strings it produces, and nothing is recorded or uploaded.
 */

export type VoiceState =
  | "idle"
  | "requesting-permission"
  | "listening"
  | "stopped"
  | "denied"
  | "unsupported"
  | "error";

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getConstructor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechSupported(): boolean {
  return getConstructor() !== null;
}

export interface SpeechCallbacks {
  /** Text the engine has committed. Appended to the field. */
  onFinal: (text: string) => void;
  /** Live, still-changing text. Rendered as a preview, never committed. */
  onInterim: (text: string) => void;
  onStateChange: (state: VoiceState, detail?: string) => void;
}

export class SpeechSession {
  private recognition: SpeechRecognitionLike | null = null;
  private stoppedByUser = false;
  private state: VoiceState = "idle";

  constructor(
    private readonly language: string,
    private readonly callbacks: SpeechCallbacks,
  ) {}

  getState(): VoiceState {
    return this.state;
  }

  start(): void {
    const Ctor = getConstructor();
    if (!Ctor) {
      this.setState("unsupported");
      return;
    }

    this.stoppedByUser = false;
    this.setState("requesting-permission");

    const recognition = new Ctor();
    this.recognition = recognition;
    recognition.lang = this.language;
    // Keep the mic open across natural pauses so users can think mid-sentence.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => this.setState("listening");

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          this.callbacks.onFinal(transcript);
        } else {
          interim += transcript;
        }
      }
      this.callbacks.onInterim(interim);
    };

    recognition.onerror = (event) => {
      this.callbacks.onInterim("");
      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          this.setState("denied");
          break;
        case "no-speech":
        case "aborted":
          // Benign: the user simply paused or stopped. onend handles cleanup.
          break;
        default:
          this.setState("error", event.error);
      }
    };

    recognition.onend = () => {
      this.callbacks.onInterim("");
      if (this.state === "denied" || this.state === "error") return;

      // Chrome ends the session on silence even in continuous mode. Restart
      // unless the user asked to stop, so "keep speaking" actually works.
      if (!this.stoppedByUser && this.state === "listening") {
        try {
          recognition.start();
          return;
        } catch {
          // Fall through to stopped if the engine refuses to restart.
        }
      }
      this.setState("stopped");
    };

    try {
      recognition.start();
    } catch (error) {
      this.setState("error", String(error));
    }
  }

  stop(): void {
    this.stoppedByUser = true;
    try {
      this.recognition?.stop();
    } catch {
      // Already stopped.
    }
    if (this.state === "listening" || this.state === "requesting-permission") {
      this.setState("stopped");
    }
  }

  /** Tears down without firing further callbacks. */
  destroy(): void {
    this.stoppedByUser = true;
    const recognition = this.recognition;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      try {
        recognition.abort();
      } catch {
        // Ignore.
      }
    }
    this.recognition = null;
    this.state = "idle";
  }

  private setState(state: VoiceState, detail?: string) {
    this.state = state;
    this.callbacks.onStateChange(state, detail);
  }
}
