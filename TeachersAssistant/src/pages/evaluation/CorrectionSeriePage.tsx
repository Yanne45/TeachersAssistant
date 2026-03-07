import React, { useState } from 'react';
import { Card, Badge, Button, SkillLevelSelector } from '../../components/ui';
import { smartCorrect } from '../../services';
import { useCorrectionShortcuts } from '../../hooks';
import { useApp } from '../../stores';
import type { CorrectionAIResult } from '../../services';
import './CorrectionSeriePage.css';

// ── Types ──

interface StudentSubmission {
  id: number;
  name: string;
  score: number | null;
  status: 'final' | 'to_confirm' | 'ai_processing' | 'pending';
  skillLevels: Record<string, number | null>;
  strengths: string[];
  weaknesses: string[];
  correctionText: string;
}

// ── Mock ──

const SKILLS = ['Problématiser', 'Construire un plan', 'Mobiliser connaissances', 'Rédaction', 'Analyser doc.'];

const MOCK_STUDENTS: StudentSubmission[] = [
  { id: 1, name: 'DUPONT Léa', score: 14, status: 'final',
    skillLevels: { 'Problématiser': 3, 'Construire un plan': 3, 'Mobiliser connaissances': 4, 'Rédaction': 3, 'Analyser doc.': 2 },
    strengths: ['Bonne maîtrise des connaissances', 'Introduction bien construite'],
    weaknesses: ["Analyse de documents trop superficielle"],
    correctionText: 'Bon travail dans l\'ensemble. L\'introduction pose bien le sujet. L\'analyse des documents mériterait plus de profondeur.' },
  { id: 2, name: 'MARTIN Lucas', score: 11, status: 'to_confirm',
    skillLevels: { 'Problématiser': 2, 'Construire un plan': 2, 'Mobiliser connaissances': 3, 'Rédaction': 2, 'Analyser doc.': 2 },
    strengths: ['Connaissances présentes'], weaknesses: ['Plan déséquilibré', 'Transitions absentes'],
    correctionText: 'Des connaissances sont mobilisées mais le plan manque de cohérence. Attention aux transitions entre parties.' },
  { id: 3, name: 'BERNARD Emma', score: null, status: 'ai_processing',
    skillLevels: { 'Problématiser': null, 'Construire un plan': null, 'Mobiliser connaissances': null, 'Rédaction': null, 'Analyser doc.': null },
    strengths: [], weaknesses: [], correctionText: '' },
  { id: 4, name: 'PETIT Thomas', score: null, status: 'pending',
    skillLevels: { 'Problématiser': null, 'Construire un plan': null, 'Mobiliser connaissances': null, 'Rédaction': null, 'Analyser doc.': null },
    strengths: [], weaknesses: [], correctionText: '' },
];

const STATUS_ICONS: Record<string, string> = { final: '✅', to_confirm: '⚠', ai_processing: '⏳', pending: '⬜' };

// ── Composant ──

export const CorrectionSeriePage: React.FC = () => {
  const { addToast } = useApp();
  const [students, setStudents] = useState(MOCK_STUDENTS);
  const [selectedId, setSelectedId] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeSkillIdx, setActiveSkillIdx] = useState(0);
  const selected = students.find(s => s.id === selectedId)!;

  // ── Skill level change handler ──
  const handleSkillChange = (skill: string, level: number) => {
    setStudents(prev => prev.map(s =>
      s.id === selectedId
        ? { ...s, skillLevels: { ...s.skillLevels, [skill]: level } }
        : s
    ));
  };

  // ── Finalize handler ──
  const handleFinalize = () => {
    setStudents(prev => prev.map(s =>
      s.id === selectedId ? { ...s, status: 'final' as const } : s
    ));
    addToast('success', `${selected.name} — copie finalisée`);
    goNext();
  };

  // ── Keyboard shortcuts (spec §5.9) ──
  useCorrectionShortcuts({
    onPrevStudent: () => goPrev(),
    onNextStudent: () => goNext(),
    onSetLevel: (level) => {
      const skill = SKILLS[activeSkillIdx];
      if (skill) handleSkillChange(skill, level);
    },
    onNextSkill: () => setActiveSkillIdx(i => (i + 1) % SKILLS.length),
    onFinalize: () => handleFinalize(),
    onAnalyzeAI: () => { if (!analyzing) handleAnalyzeIA(); },
    onSave: () => console.log('Save triggered'),
  });

  const handleAnalyzeIA = async () => {
    setAnalyzing(true);
    try {
      const result = await smartCorrect(selectedId, 1 /* assignmentId */);
      if ('queued' in result) {
        setStudents(prev => prev.map(s =>
          s.id === selectedId ? { ...s, status: 'ai_processing' as const } : s
        ));
        addToast('info', 'Analyse IA ajoutée à la file d\'attente');
      } else {
        // Résultat immédiat
        const r = result as CorrectionAIResult;
        const newLevels: Record<string, number | null> = { ...selected.skillLevels };
        for (const sk of r.skills) {
          // Mapper par nom le plus proche
          const match = SKILLS.find(s => s.toLowerCase().includes(sk.skill_name.toLowerCase().slice(0, 6)));
          if (match) newLevels[match] = sk.level;
        }
        setStudents(prev => prev.map(s =>
          s.id === selectedId ? {
            ...s,
            skillLevels: newLevels,
            strengths: r.strengths,
            weaknesses: r.weaknesses,
            correctionText: r.general_comment,
            status: 'to_confirm' as const,
          } : s
        ));
        addToast('success', 'Analyse IA terminée — vérifiez les niveaux');
      }
    } catch (err) {
      console.error('AI analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const goPrev = () => {
    const idx = students.findIndex(s => s.id === selectedId);
    if (idx > 0) setSelectedId(students[idx - 1].id);
  };

  const goNext = () => {
    const idx = students.findIndex(s => s.id === selectedId);
    if (idx < students.length - 1) setSelectedId(students[idx + 1].id);
  };

  return (
    <div className="correction-page">
      {/* ── Colonne A : Liste élèves ── */}
      <Card noHover className="correction-page__students">
        <h3 className="correction-page__panel-title">Élèves ({students.length})</h3>
        {students.map(s => (
          <button
            key={s.id}
            className={`student-row ${selectedId === s.id ? 'student-row--active' : ''}`}
            onClick={() => setSelectedId(s.id)}
            type="button"
          >
            <span className="student-row__icon">{STATUS_ICONS[s.status]}</span>
            <span className="student-row__name">{s.name}</span>
            {s.score !== null && (
              <span className="student-row__score">{s.score}/20</span>
            )}
          </button>
        ))}
      </Card>

      {/* ── Colonne B : Copie + Correction ── */}
      <Card noHover className="correction-page__main">
        <div className="correction-page__main-header">
          <div>
            <span className="correction-page__student-name">{selected.name}</span>
            <span className="correction-page__student-score">
              Note: {selected.score !== null ? `${selected.score}/20` : '—'}
            </span>
          </div>
          <div className="correction-page__nav">
            <Button variant="ghost" size="S" onClick={goPrev}>⬅ Préc.</Button>
            <Button variant="ghost" size="S" onClick={goNext}>Suiv. ➡</Button>
          </div>
        </div>

        <div className="correction-page__split">
          {/* Aperçu copie */}
          <div className="correction-page__preview">
            <span className="correction-page__preview-label">📄 Aperçu copie (PDF viewer)</span>
          </div>

          {/* Correction */}
          <div className="correction-page__editor">
            <span className="correction-page__editor-title">Correction</span>
            <textarea
              className="correction-page__textarea"
              defaultValue={selected.correctionText}
              placeholder="Saisir la correction..."
            />
          </div>
        </div>

        <div className="correction-page__main-actions">
          <Button variant="secondary" size="S" icon={<span>🤖</span>} onClick={handleAnalyzeIA} disabled={analyzing}>
            {analyzing ? '⏳ Analyse…' : 'Analyser (IA)'}
          </Button>
          <Button variant="secondary" size="S" icon={<span>📥</span>}>Importer correction</Button>
          <Button variant="primary" size="S" onClick={handleFinalize}>✓ Finaliser</Button>
        </div>

        {/* Consignes IA complémentaires (dépliable) */}
        <details className="correction-page__ia-instructions">
          <summary className="correction-page__ia-instructions-toggle">
            Consignes IA complémentaires
          </summary>
          <textarea
            className="correction-page__ia-textarea"
            placeholder="Instructions supplémentaires pour l'analyse IA (ex: Soyez indulgent sur l'orthographe, centrez-vous sur la problématique)..."
            rows={2}
          />
        </details>
      </Card>

      {/* ── Colonne C : Grille compétences ── */}
      <Card noHover className="correction-page__skills">
        <h3 className="correction-page__panel-title">Grille compétences</h3>

        {SKILLS.map((skill, idx) => (
          <SkillLevelSelector
            key={skill}
            label={skill}
            value={selected.skillLevels[skill]}
            onChange={(level) => handleSkillChange(skill, level)}
            className={idx === activeSkillIdx ? 'skill-level--active' : ''}
          />
        ))}

        {/* Forces / Lacunes */}
        <div className="correction-page__feedback">
          <div className="correction-page__fb-section">
            <span className="correction-page__fb-title correction-page__fb-title--success">✅ Forces</span>
            {selected.strengths.map((s, i) => (
              <span key={i} className="correction-page__fb-item">• {s}</span>
            ))}
            {selected.strengths.length === 0 && <span className="correction-page__fb-empty">—</span>}
          </div>
          <div className="correction-page__fb-section">
            <span className="correction-page__fb-title correction-page__fb-title--danger">⚠ Lacunes</span>
            {selected.weaknesses.map((w, i) => (
              <span key={i} className="correction-page__fb-item">• {w}</span>
            ))}
            {selected.weaknesses.length === 0 && <span className="correction-page__fb-empty">—</span>}
          </div>
        </div>

        <Button variant="secondary" size="S" fullWidth>Générer feedback IA</Button>
      </Card>

      {/* Shortcuts hint */}
      <div className="correction-page__shortcuts">
        <span>⌨ <b>J</b>/<b>K</b> élève · <b>1-4</b> niveau · <b>Tab</b> compétence · <b>F</b> finaliser · <b>A</b> analyser IA</span>
      </div>
    </div>
  );
};
