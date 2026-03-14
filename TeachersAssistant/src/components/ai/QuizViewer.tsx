// ============================================================================
// QuizViewer — Visualisateur de quiz + exports Kahoot CSV / Moodle XML
// Affiche le JSON structuré généré par generate_quiz
// Modes : liste complète ou question par question
// ============================================================================

import React, { useState, useCallback } from 'react';
import type { QuizData, QuizQuestion } from '../../types/ai';
import './QuizViewer.css';

const DIFFICULTY_LABELS: Record<string, string> = {
  facile: 'Facile',
  standard: 'Standard',
  approfondi: 'Approfondi',
  expert: 'Expert',
};

const TYPE_LABELS: Record<string, string> = {
  qcm: 'QCM',
  qcm_multiple: 'QCM multiple',
  vrai_faux: 'Vrai / Faux',
};

interface Props {
  data: QuizData;
}

// ── Exports ──

function exportKahootCSV(data: QuizData): string {
  // Format Kahoot : Question,Answer1,Answer2,Answer3,Answer4,TimeLimit,CorrectAnswer
  const lines: string[] = [];
  for (const q of data.questions) {
    const choices = [...q.choices];
    // Kahoot supporte 4 réponses max
    while (choices.length < 4) choices.push('');
    // CorrectAnswer : 1-based index (pour choix unique)
    const correct = q.correctAnswers.map(i => i + 1).join(',');
    const row = [
      q.question,
      ...choices.slice(0, 4),
      q.timeLimit || 20,
      correct,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

function exportMoodleXML(data: QuizData): string {
  const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n';
  xml += `  <question type="category">\n    <category><text>${escapeXml(data.title)}</text></category>\n  </question>\n`;

  for (const q of data.questions) {
    const isMultiple = q.type === 'qcm_multiple' || q.correctAnswers.length > 1;
    const fraction = isMultiple ? Math.round(100 / q.correctAnswers.length) : 100;

    xml += `  <question type="multichoice">\n`;
    xml += `    <name><text>${escapeXml(q.question.slice(0, 80))}</text></name>\n`;
    xml += `    <questiontext format="html"><text><![CDATA[${q.question}]]></text></questiontext>\n`;
    xml += `    <generalfeedback format="html"><text><![CDATA[${q.explanation}]]></text></generalfeedback>\n`;
    xml += `    <defaultgrade>1</defaultgrade>\n`;
    xml += `    <single>${isMultiple ? 'false' : 'true'}</single>\n`;
    xml += `    <shuffleanswers>true</shuffleanswers>\n`;

    q.choices.forEach((choice, idx) => {
      const isCorrect = q.correctAnswers.includes(idx);
      xml += `    <answer fraction="${isCorrect ? fraction : 0}" format="html">\n`;
      xml += `      <text><![CDATA[${choice}]]></text>\n`;
      xml += `    </answer>\n`;
    });

    xml += `  </question>\n`;
  }

  xml += '</quiz>\n';
  return xml;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Composant ──

export const QuizViewer: React.FC<Props> = ({ data }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'single'>('list');
  const [showAnswers, setShowAnswers] = useState(true);
  const [showExplanations, setShowExplanations] = useState(true);

  const total = data.questions.length;
  const question = data.questions[currentIdx];

  const goTo = useCallback((idx: number) => {
    setCurrentIdx(Math.max(0, Math.min(idx, total - 1)));
  }, [total]);

  const handleExportKahoot = () => {
    const csv = exportKahootCSV(data);
    const safeName = (data.title || 'quiz').replace(/[^a-zA-Z0-9àâéèêëîïôùûüçÀÂÉÈÊËÎÏÔÙÛÜÇ _-]/g, '').trim();
    downloadFile(csv, `${safeName}_kahoot.csv`, 'text/csv;charset=utf-8');
  };

  const handleExportMoodle = () => {
    const xml = exportMoodleXML(data);
    const safeName = (data.title || 'quiz').replace(/[^a-zA-Z0-9àâéèêëîïôùûüçÀÂÉÈÊËÎÏÔÙÛÜÇ _-]/g, '').trim();
    downloadFile(xml, `${safeName}_moodle.xml`, 'application/xml;charset=utf-8');
  };

  if (!data.questions.length) {
    return <div className="quiz-viewer__empty">Aucune question générée.</div>;
  }

  return (
    <div className="quiz-viewer">
      {/* Toolbar */}
      <div className="quiz-viewer__toolbar">
        <div className="quiz-viewer__title-bar">
          <h3 className="quiz-viewer__title">{data.title}</h3>
          <span className="quiz-viewer__count">{total} question{total > 1 ? 's' : ''}</span>
        </div>
        <div className="quiz-viewer__controls">
          <button
            className={'quiz-viewer__mode-btn' + (viewMode === 'list' ? ' quiz-viewer__mode-btn--active' : '')}
            onClick={() => setViewMode('list')}
          >
            Liste
          </button>
          <button
            className={'quiz-viewer__mode-btn' + (viewMode === 'single' ? ' quiz-viewer__mode-btn--active' : '')}
            onClick={() => setViewMode('single')}
          >
            Question
          </button>
          <label className="quiz-viewer__toggle">
            <input type="checkbox" checked={showAnswers} onChange={e => setShowAnswers(e.target.checked)} />
            Réponses
          </label>
          <label className="quiz-viewer__toggle">
            <input type="checkbox" checked={showExplanations} onChange={e => setShowExplanations(e.target.checked)} />
            Explications
          </label>
        </div>
      </div>

      {/* Export buttons */}
      <div className="quiz-viewer__exports">
        <button className="quiz-viewer__export-btn" onClick={handleExportKahoot}>
          Exporter Kahoot CSV
        </button>
        <button className="quiz-viewer__export-btn" onClick={handleExportMoodle}>
          Exporter Moodle XML
        </button>
      </div>

      {/* Vue liste */}
      {viewMode === 'list' && (
        <div className="quiz-viewer__list">
          {data.questions.map((q, i) => (
            <QuestionCard
              key={i}
              question={q}
              showAnswers={showAnswers}
              showExplanation={showExplanations}
              onClick={() => { setCurrentIdx(i); setViewMode('single'); }}
            />
          ))}
        </div>
      )}

      {/* Vue question unique */}
      {viewMode === 'single' && question && (
        <>
          <QuestionCard
            question={question}
            showAnswers={showAnswers}
            showExplanation={showExplanations}
            large
          />
          <div className="quiz-viewer__nav">
            <button
              className="quiz-viewer__nav-btn"
              onClick={() => goTo(currentIdx - 1)}
              disabled={currentIdx === 0}
            >
              ← Précédente
            </button>
            <span className="quiz-viewer__nav-counter">{currentIdx + 1} / {total}</span>
            <button
              className="quiz-viewer__nav-btn"
              onClick={() => goTo(currentIdx + 1)}
              disabled={currentIdx === total - 1}
            >
              Suivante →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/** Carte de question */
const QuestionCard: React.FC<{
  question: QuizQuestion;
  showAnswers: boolean;
  showExplanation: boolean;
  large?: boolean;
  onClick?: () => void;
}> = ({ question: q, showAnswers, showExplanation, large, onClick }) => (
  <div
    className={'quiz-viewer__card' + (large ? ' quiz-viewer__card--large' : '')}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <div className="quiz-viewer__card-header">
      <span className="quiz-viewer__card-number">Q{q.number}</span>
      <span className="quiz-viewer__card-type">{TYPE_LABELS[q.type] || q.type}</span>
      <span className={'quiz-viewer__card-diff quiz-viewer__card-diff--' + q.difficulty}>
        {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
      </span>
      {q.skill && <span className="quiz-viewer__card-skill">{q.skill}</span>}
      <span className="quiz-viewer__card-time">{q.timeLimit}s</span>
    </div>

    <p className="quiz-viewer__card-question">{q.question}</p>

    <div className="quiz-viewer__choices">
      {q.choices.map((choice, idx) => {
        const isCorrect = q.correctAnswers.includes(idx);
        const className = showAnswers
          ? (isCorrect ? 'quiz-viewer__choice quiz-viewer__choice--correct' : 'quiz-viewer__choice quiz-viewer__choice--wrong')
          : 'quiz-viewer__choice';
        return (
          <div key={idx} className={className}>
            <span className="quiz-viewer__choice-letter">{String.fromCharCode(65 + idx)}</span>
            <span className="quiz-viewer__choice-text">{choice}</span>
            {showAnswers && isCorrect && <span className="quiz-viewer__choice-check">✓</span>}
          </div>
        );
      })}
    </div>

    {showExplanation && q.explanation && (
      <div className="quiz-viewer__explanation">
        <strong>Explication :</strong> {q.explanation}
      </div>
    )}
  </div>
);
