// ============================================================================
// FeedbackVocalStudioPage — Dictée vocale + structuration des appréciations
// Le prof dicte librement, le studio structure en sections.
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
import { Card, Button, Badge, EmptyState } from '../../components/ui';
import { VoiceInput } from '../../components/ui/VoiceInput';
import './FeedbackVocalStudioPage.css';

// ── Feedback categories ──

interface FeedbackSection {
  id: string;
  label: string;
  icon: string;
  color: string;
  lines: string[];
}

const DEFAULT_SECTIONS: () => FeedbackSection[] = () => [
  { id: 'positif', label: 'Points positifs', icon: '✅', color: '#2d9f3f', lines: [] },
  { id: 'ameliorer', label: 'À améliorer', icon: '⚠️', color: '#e89b00', lines: [] },
  { id: 'consigne', label: 'Consignes', icon: '📌', color: '#3db4c6', lines: [] },
  { id: 'note', label: 'Remarques', icon: '💬', color: '#888', lines: [] },
];

// ── Keyword-based classification ──

const POSITIVE_KEYWORDS = [
  'bien', 'très bien', 'bravo', 'excellent', 'bonne', 'bon travail', 'solide',
  'maîtrisé', 'pertinent', 'clair', 'complet', 'intéressant', 'bel effort',
  'progrès', 'encourageant', 'juste', 'correct', 'réussi', 'précis',
];

const IMPROVE_KEYWORDS = [
  'attention', 'manque', 'insuffisant', 'revoir', 'améliorer', 'travailler',
  'faible', 'erreur', 'confusion', 'hors sujet', 'incomplet', 'imprécis',
  'superficiel', 'absent', 'oublié', 'négligé', 'problème', 'difficul',
];

const INSTRUCTION_KEYWORDS = [
  'il faut', 'tu dois', 'vous devez', 'penser à', 'pensez à', 'n\'oublie',
  'n\'oubliez', 'relire', 'relis', 'revois', 'entraîne', 'exercice',
  'prochain', 'prochaine fois', 'conseil', 'recommand',
];

function classifyLine(text: string): string {
  const lower = text.toLowerCase();
  if (INSTRUCTION_KEYWORDS.some(k => lower.includes(k))) return 'consigne';
  if (POSITIVE_KEYWORDS.some(k => lower.includes(k))) return 'positif';
  if (IMPROVE_KEYWORDS.some(k => lower.includes(k))) return 'ameliorer';
  return 'note';
}

// ── Component ──

export const FeedbackVocalStudioPage: React.FC = () => {
  const [sections, setSections] = useState<FeedbackSection[]>(DEFAULT_SECTIONS);
  const [rawText, setRawText] = useState('');
  const [studentName, setStudentName] = useState('');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [activeSection, setActiveSection] = useState<string>('positif');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle voice result
  const handleVoiceResult = useCallback((text: string) => {
    // Append to raw text
    setRawText(prev => (prev ? prev + ' ' : '') + text);

    // Split into sentences
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 2);

    if (mode === 'auto') {
      // Auto-classify each sentence
      setSections(prev => {
        const updated = prev.map(s => ({ ...s, lines: [...s.lines] }));
        for (const sentence of sentences) {
          const category = classifyLine(sentence);
          const section = updated.find(s => s.id === category);
          if (section) {
            section.lines.push(capitalize(sentence));
          }
        }
        return updated;
      });
    } else {
      // Manual: add to active section
      setSections(prev => {
        return prev.map(s => {
          if (s.id === activeSection) {
            return { ...s, lines: [...s.lines, ...sentences.map(capitalize)] };
          }
          return s;
        });
      });
    }
  }, [mode, activeSection]);

  // Edit a line
  const editLine = useCallback((sectionId: string, lineIdx: number, newText: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      const lines = [...s.lines];
      if (newText.trim() === '') {
        lines.splice(lineIdx, 1);
      } else {
        lines[lineIdx] = newText;
      }
      return { ...s, lines };
    }));
  }, []);

  // Move a line to another section
  const moveLine = useCallback((fromId: string, lineIdx: number, toId: string) => {
    setSections(prev => {
      const from = prev.find(s => s.id === fromId);
      if (!from || !from.lines[lineIdx]) return prev;
      const text = from.lines[lineIdx];
      return prev.map(s => {
        if (s.id === fromId) {
          const lines = [...s.lines];
          lines.splice(lineIdx, 1);
          return { ...s, lines };
        }
        if (s.id === toId) {
          return { ...s, lines: [...s.lines, text] };
        }
        return s;
      });
    });
  }, []);

  // Generate formatted output
  const generateOutput = useCallback(() => {
    const parts: string[] = [];
    if (studentName) parts.push(`Élève : ${studentName}\n`);
    for (const section of sections) {
      if (section.lines.length === 0) continue;
      parts.push(`${section.icon} ${section.label} :`);
      for (const line of section.lines) {
        parts.push(`  • ${line}`);
      }
      parts.push('');
    }
    return parts.join('\n').trim();
  }, [sections, studentName]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    const text = generateOutput();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generateOutput]);

  // Reset
  const handleReset = useCallback(() => {
    setSections(DEFAULT_SECTIONS());
    setRawText('');
    setStudentName('');
    setCopied(false);
  }, []);

  const totalLines = sections.reduce((sum, s) => sum + s.lines.length, 0);

  return (
    <div className="feedback-studio">
      <div className="feedback-studio__header">
        <h2 className="feedback-studio__title">Studio de feedback vocal</h2>
        <div className="feedback-studio__mode">
          <button
            className={`feedback-studio__mode-btn ${mode === 'auto' ? 'feedback-studio__mode-btn--active' : ''}`}
            onClick={() => setMode('auto')}
          >
            Auto-classement
          </button>
          <button
            className={`feedback-studio__mode-btn ${mode === 'manual' ? 'feedback-studio__mode-btn--active' : ''}`}
            onClick={() => setMode('manual')}
          >
            Manuel
          </button>
        </div>
      </div>

      {/* Student name + voice input */}
      <Card noHover className="feedback-studio__input-zone">
        <div className="feedback-studio__input-row">
          <input
            className="feedback-studio__student-input"
            type="text"
            placeholder="Nom de l'élève (optionnel)"
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
          />
          <VoiceInput onResult={handleVoiceResult} />
          <span className="feedback-studio__hint">
            {mode === 'auto'
              ? 'Dictez librement — les phrases seront classées automatiquement'
              : `Dictez → section « ${sections.find(s => s.id === activeSection)?.label} »`}
          </span>
        </div>

        {/* Manual mode: section selector */}
        {mode === 'manual' && (
          <div className="feedback-studio__section-selector">
            {sections.map(s => (
              <button
                key={s.id}
                className={`feedback-studio__section-btn ${activeSection === s.id ? 'feedback-studio__section-btn--active' : ''}`}
                style={{ borderColor: activeSection === s.id ? s.color : undefined }}
                onClick={() => setActiveSection(s.id)}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Manual text input fallback */}
        <textarea
          ref={textareaRef}
          className="feedback-studio__textarea"
          placeholder="Ou tapez votre appréciation ici…"
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          rows={3}
        />
        <Button
          variant="secondary"
          size="S"
          onClick={() => {
            if (rawText.trim()) {
              handleVoiceResult(rawText);
              setRawText('');
            }
          }}
          disabled={!rawText.trim()}
        >
          Structurer le texte
        </Button>
      </Card>

      {/* Structured sections */}
      <div className="feedback-studio__sections">
        {sections.map(section => (
          <Card key={section.id} noHover className="feedback-studio__section-card">
            <div className="feedback-studio__section-header" style={{ borderLeftColor: section.color }}>
              <span className="feedback-studio__section-icon">{section.icon}</span>
              <span className="feedback-studio__section-label">{section.label}</span>
              <Badge variant="info">{section.lines.length}</Badge>
            </div>
            {section.lines.length === 0 ? (
              <div className="feedback-studio__section-empty">
                {mode === 'auto' ? 'Les phrases adaptées apparaîtront ici' : 'Dictez ou tapez dans cette section'}
              </div>
            ) : (
              <ul className="feedback-studio__line-list">
                {section.lines.map((line, idx) => (
                  <li key={idx} className="feedback-studio__line">
                    <input
                      className="feedback-studio__line-input"
                      value={line}
                      onChange={e => editLine(section.id, idx, e.target.value)}
                    />
                    <div className="feedback-studio__line-actions">
                      {sections.filter(s => s.id !== section.id).map(target => (
                        <button
                          key={target.id}
                          className="feedback-studio__move-btn"
                          title={`Déplacer vers ${target.label}`}
                          onClick={() => moveLine(section.id, idx, target.id)}
                        >
                          {target.icon}
                        </button>
                      ))}
                      <button
                        className="feedback-studio__delete-btn"
                        title="Supprimer"
                        onClick={() => editLine(section.id, idx, '')}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      {/* Output + actions */}
      {totalLines > 0 && (
        <Card noHover className="feedback-studio__output">
          <h3 className="feedback-studio__output-title">Appréciation générée</h3>
          <pre className="feedback-studio__output-text">{generateOutput()}</pre>
          <div className="feedback-studio__output-actions">
            <Button variant="primary" onClick={handleCopy}>
              {copied ? '✓ Copié !' : 'Copier dans le presse-papier'}
            </Button>
            <Button variant="secondary" onClick={handleReset}>Nouveau feedback</Button>
          </div>
        </Card>
      )}

      {totalLines === 0 && (
        <EmptyState
          icon="🎤"
          title="Dictez votre appréciation"
          description="Utilisez le micro ou tapez directement. Les phrases seront automatiquement classées en points positifs, axes d'amélioration et consignes."
        />
      )}
    </div>
  );
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
