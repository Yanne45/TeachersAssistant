// ============================================================================
// VoiceInput — Saisie vocale via Web Speech API (gratuit, natif navigateur)
// Fallback gracieux si l'API n'est pas disponible.
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import './VoiceInput.css';

interface Props {
  /** Appelé avec le texte final reconnu (à ajouter au champ cible) */
  onResult: (text: string) => void;
  /** Langue de reconnaissance — défaut fr-FR */
  lang?: string;
  disabled?: boolean;
  /** Texte affiché pendant la reconnaissance intermédiaire */
  showInterim?: boolean;
}

// Typing minimal pour SpeechRecognition (absent des lib TypeScript par défaut)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const VoiceInput: React.FC<Props> = ({
  onResult,
  lang = 'fr-FR',
  disabled = false,
  showInterim = true,
}) => {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [supported] = useState(() => !!getSpeechRecognition());
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const rec = new SR();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = showInterim;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r) continue;
        const transcript = r[0]?.transcript ?? '';
        if (r.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) {
        onResult(finalText.trim());
        setInterim('');
      } else {
        setInterim(interimText);
      }
    };

    rec.onerror = () => stop();
    rec.onend = () => {
      setListening(false);
      setInterim('');
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [lang, onResult, showInterim, stop]);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  if (!supported) {
    return (
      <span className="voice-input__unsupported" title="Reconnaissance vocale non disponible dans ce navigateur">
        🎤✗
      </span>
    );
  }

  return (
    <span className="voice-input">
      <button
        type="button"
        className={'voice-input__btn' + (listening ? ' voice-input__btn--active' : '')}
        onClick={listening ? stop : start}
        disabled={disabled}
        title={listening ? 'Arrêter la reconnaissance' : 'Dicter (Web Speech API)'}
      >
        🎤
      </button>
      {listening && showInterim && interim && (
        <span className="voice-input__interim">{interim}</span>
      )}
    </span>
  );
};
