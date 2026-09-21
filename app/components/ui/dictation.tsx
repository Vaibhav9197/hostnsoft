"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

import { SpeechSession, isSpeechSupported, type VoiceState } from "../../lib/speech";

/**
 * Speak instead of type. The browser does the recognition locally — we only
 * ever see the text it hands back, and nothing is recorded or uploaded.
 */

export interface UseDictationOptions {
  /** Called with each committed phrase, already trimmed. */
  onTranscript: (text: string) => void;
  language?: string;
}

export function useDictation({ onTranscript, language = "en-US" }: UseDictationOptions) {
  const [state, setState] = useState<VoiceState>("idle");
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const sessionRef = useRef<SpeechSession | null>(null);
  // Keep the latest callback without restarting the session on every render.
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  // Feature detection only holds on the client, so don't let SSR decide it.
  useEffect(() => setSupported(isSpeechSupported()), []);

  useEffect(
    () => () => {
      sessionRef.current?.destroy();
      sessionRef.current = null;
    },
    [],
  );

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current?.destroy();
    sessionRef.current = null;
    setInterim("");
  }, []);

  /** `quiet` suppresses the unsupported notice for starts the user didn't ask for. */
  const start = useCallback((quiet = false) => {
    if (!isSpeechSupported()) {
      setSupported(false);
      if (!quiet) setState("unsupported");
      return;
    }
    sessionRef.current?.destroy();
    const session = new SpeechSession(language, {
      onFinal: (text) => {
        const addition = text.trim();
        if (addition) onTranscriptRef.current(addition);
      },
      onInterim: setInterim,
      onStateChange: (next) => {
        setState(next);
        if (next !== "listening" && next !== "requesting-permission") setInterim("");
      },
    });
    sessionRef.current = session;
    session.start();
  }, [language]);

  const listening = state === "listening" || state === "requesting-permission";

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { state, listening, interim, supported, start, stop, toggle };
}

const MESSAGES: Partial<Record<VoiceState, string>> = {
  "requesting-permission": "Allow microphone access to speak.",
  denied: "Microphone access was blocked. You can still type instead.",
  unsupported: "Voice input isn’t supported in this browser.",
  error: "Voice input stopped unexpectedly. Your text has been kept.",
};

export function DictationButton({
  listening,
  supported,
  disabled,
  onToggle,
  label = "Dictate your message",
  className = "",
}: {
  listening: boolean;
  supported: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
}) {
  const Icon = supported ? Mic : MicOff;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || !supported}
      aria-pressed={listening}
      aria-label={listening ? "Stop dictation" : label}
      title={supported ? (listening ? "Stop dictation" : label) : "Voice input isn’t supported here"}
      data-mic-pulse={listening ? "" : undefined}
      className={`relative inline-flex size-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        listening
          ? "animate-[mic-pulse_1.6s_ease-in-out_infinite] border-destructive bg-destructive text-white"
          : "border-input bg-transparent text-muted-foreground hover:border-ring hover:text-foreground"
      } ${className}`}
    >
      {/* A halo outside the button so the pulse reads as "live" from across the
          dialog, while the button's own fade keeps the icon legible. */}
      {listening && (
        <span
          aria-hidden="true"
          className="absolute -inset-1 animate-ping rounded-full bg-destructive/40 motion-reduce:animate-none"
        />
      )}
      <Icon aria-hidden="true" className="relative size-4" />
    </button>
  );
}

/** Live status line: "Listening…" plus the words not yet committed. */
export function DictationStatus({
  state,
  interim,
  className = "",
}: {
  state: VoiceState;
  interim: string;
  className?: string;
}) {
  const listening = state === "listening";
  const message = listening ? null : MESSAGES[state];
  if (!listening && !message) return null;

  return (
    <p
      aria-live="polite"
      className={`flex items-start gap-2 text-xs ${
        state === "denied" || state === "error" ? "text-destructive" : "text-muted-foreground"
      } ${className}`}
    >
      {listening ? (
        <>
          <span
            aria-hidden="true"
            data-mic-pulse=""
            className="mt-1 size-1.5 shrink-0 animate-[mic-pulse_1.4s_ease-in-out_infinite] rounded-full bg-destructive"
          />
          <span>
            <span className="font-medium text-destructive">Listening…</span>
            {interim && <span className="ml-1.5 italic">{interim}</span>}
          </span>
        </>
      ) : (
        <span>{message}</span>
      )}
    </p>
  );
}
