import React, { useState } from 'react';
import { Card, Badge, Button } from '../../components/ui';
import { useApp } from '../../stores';
import './ProgrammeOfficielPage.css';

// ── Types ──

interface Chapter {
  id: number;
  code: string;
  title: string;
  sequenceCount: number;
  isEvaluated: boolean;
}

interface Theme {
  id: number;
  code: string;
  title: string;
  coveragePercent: number;
  chapters: Chapter[];
}

// ── Mock ──

const MOCK_THEMES: Theme[] = [
  {
    id: 1, code: 'T1', title: 'De nouveaux espaces de conquête',
    coveragePercent: 85,
    chapters: [
      { id: 1, code: 'T1-C1', title: "L'enjeu de la connaissance", sequenceCount: 2, isEvaluated: true },
      { id: 2, code: 'T1-C2', title: 'Nouveaux espaces de conquête : océans et espace', sequenceCount: 1, isEvaluated: false },
    ],
  },
  {
    id: 2, code: 'T2', title: 'Faire la guerre, faire la paix',
    coveragePercent: 30,
    chapters: [
      { id: 3, code: 'T2-C1', title: 'La dimension politique de la guerre', sequenceCount: 1, isEvaluated: false },
      { id: 4, code: 'T2-C2', title: 'Le défi de la construction de la paix', sequenceCount: 0, isEvaluated: false },
    ],
  },
  {
    id: 3, code: 'T3', title: 'Histoire et mémoires',
    coveragePercent: 0,
    chapters: [
      { id: 5, code: 'T3-C1', title: 'Histoire et mémoires des conflits', sequenceCount: 0, isEvaluated: false },
      { id: 6, code: 'T3-C2', title: 'Histoire, mémoire et justice', sequenceCount: 0, isEvaluated: false },
    ],
  },
];

const SUBJECT_COLOR = '#7B3FA0'; // HGGSP

// ── Composant ──

export const ProgrammeOfficielPage: React.FC = () => {
  const { addToast } = useApp();
  const [openThemes, setOpenThemes] = useState<Set<number>>(new Set([1]));

  const toggleTheme = (id: number) => {
    setOpenThemes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="programme-page">
      {/* Barre supérieure */}
      <div className="programme-page__toolbar">
        <div>
          <span className="programme-page__context">HGGSP — Terminale</span>
          <h1 className="programme-page__title">Programme officiel</h1>
        </div>
        <div className="programme-page__actions">
          <Button variant="secondary" size="S" onClick={async () => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = '.json,.csv,.txt';
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              const text = await file.text();
              const { programJsonService } = await import('../../services');
              try {
                let count: number;
                if (file.name.endsWith('.json')) {
                  count = await programJsonService.importProgram(text, 1, 3, 2);
                } else {
                  count = await programJsonService.importCSV(text, 1, 3, 2);
                }
                alert(`${count} éléments importés`);
                addToast('success', `${count} éléments importés`);
              } catch (err) { addToast('error', 'Erreur lors de l\'import'); console.error(err); }
            };
            input.click();
          }}>Importer (JSON/CSV)</Button>
          <Button variant="primary" size="S">+ Ajouter thème</Button>
        </div>
      </div>

      {/* Accordéon thèmes */}
      <div className="programme-page__themes">
        {MOCK_THEMES.map(theme => {
          const isOpen = openThemes.has(theme.id);
          return (
            <Card
              key={theme.id}
              borderLeftColor={SUBJECT_COLOR}
              noHover
              className="theme-card"
            >
              {/* Header thème (cliquable) */}
              <button
                className="theme-card__header"
                onClick={() => toggleTheme(theme.id)}
                type="button"
              >
                <span className="theme-card__chevron">{isOpen ? '▼' : '▶'}</span>
                <span className="theme-card__title">{theme.code} — {theme.title}</span>
                <Badge
                  variant={theme.coveragePercent === 100 ? 'success' : theme.coveragePercent > 0 ? 'filter' : 'info'}
                  active={theme.coveragePercent > 0}
                >
                  {theme.coveragePercent > 0 ? `${theme.coveragePercent}% couvert` : 'Non commencé'}
                </Badge>
              </button>

              {/* Chapitres (déplié) */}
              {isOpen && (
                <div className="theme-card__chapters">
                  {theme.chapters.map(ch => (
                    <div key={ch.id} className="chapter-row">
                      <span className="chapter-row__title">
                        {ch.code} — {ch.title}
                      </span>
                      <div className="chapter-row__badges">
                        {ch.sequenceCount > 0 && (
                          <Badge color={SUBJECT_COLOR} variant="subject">
                            {ch.sequenceCount} séquence{ch.sequenceCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {ch.isEvaluated && (
                          <Badge variant="success">✓ évalué</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
