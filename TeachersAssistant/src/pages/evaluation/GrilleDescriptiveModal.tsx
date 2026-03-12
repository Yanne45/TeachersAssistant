import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Button } from '../../components/ui';
import { assignmentService, skillDescriptorService } from '../../services';
import type { SkillLevelDescriptor } from '../../services';
import { useApp } from '../../stores';

interface Props {
  open: boolean;
  onClose: () => void;
  assignmentId: number;
  assignmentTitle?: string;
}

interface SkillEntry {
  skill_id: number;
  skill_label: string;
  descriptors: SkillLevelDescriptor[];
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#fca5a5',
  2: '#fcd34d',
  3: '#86efac',
  4: '#4ade80',
};

const LEVEL_TEXT_COLORS: Record<number, string> = {
  1: '#7f1d1d',
  2: '#78350f',
  3: '#14532d',
  4: '#14532d',
};

export const GrilleDescriptiveModal: React.FC<Props> = ({
  open,
  onClose,
  assignmentId,
  assignmentTitle,
}) => {
  const { addToast } = useApp();
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const skillRows = await assignmentService.getSkills(assignmentId);
      const entries: SkillEntry[] = await Promise.all(
        skillRows.map(async (sk) => {
          const descriptors = await skillDescriptorService.getBySkill(sk.skill_id as number);
          return {
            skill_id: sk.skill_id as number,
            skill_label: sk.skill_label,
            descriptors,
          };
        })
      );
      setSkills(entries);
    } catch (err) {
      console.error('[GrilleDescriptiveModal] Erreur chargement:', err);
      addToast('error', 'Impossible de charger les descripteurs');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, addToast]);

  useEffect(() => {
    if (open) {
      void loadData();
    }
  }, [open, loadData]);

  const updateDescriptor = (skillIdx: number, level: number, field: 'label' | 'description', value: string) => {
    setSkills(prev => prev.map((sk, i) => {
      if (i !== skillIdx) return sk;
      return {
        ...sk,
        descriptors: sk.descriptors.map(d =>
          d.level === level ? { ...d, [field]: value } : d
        ),
      };
    }));
  };

  const saveSkill = async (skillIdx: number) => {
    const entry = skills[skillIdx];
    if (!entry) return;
    setSaving(skillIdx);
    try {
      await skillDescriptorService.upsertAll(
        entry.skill_id,
        entry.descriptors.map(d => ({ level: d.level, label: d.label, description: d.description }))
      );
      addToast('success', `Descripteurs de "${entry.skill_label}" enregistrés`);
    } catch (err) {
      console.error('[GrilleDescriptiveModal] Erreur sauvegarde:', err);
      addToast('error', 'Échec de la sauvegarde');
    } finally {
      setSaving(null);
    }
  };

  const saveAll = async () => {
    setSaving(-1);
    try {
      for (const entry of skills) {
        await skillDescriptorService.upsertAll(
          entry.skill_id,
          entry.descriptors.map(d => ({ level: d.level, label: d.label, description: d.description }))
        );
      }
      addToast('success', 'Tous les descripteurs enregistrés');
    } catch (err) {
      console.error('[GrilleDescriptiveModal] Erreur sauvegarde globale:', err);
      addToast('error', 'Échec de la sauvegarde globale');
    } finally {
      setSaving(null);
    }
  };

  const title = assignmentTitle
    ? `Grille descriptive — ${assignmentTitle}`
    : 'Grille descriptive des niveaux de maîtrise';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="large"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="S" onClick={onClose}>Fermer</Button>
          <Button
            variant="primary"
            size="S"
            onClick={() => void saveAll()}
            disabled={saving !== null || loading}
          >
            {saving === -1 ? 'Enregistrement…' : 'Tout enregistrer'}
          </Button>
        </div>
      }
    >
      {loading ? (
        <p style={{ padding: 16, color: 'var(--color-text-secondary)' }}>Chargement…</p>
      ) : skills.length === 0 ? (
        <p style={{ padding: 16, color: 'var(--color-text-secondary)' }}>
          Aucune capacité liée à ce devoir. Associez des capacités depuis l'édition du devoir.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {skills.map((entry, skillIdx) => (
            <section key={entry.skill_id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: 'var(--color-surface-elevated)',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <strong style={{ fontSize: '0.95rem' }}>{entry.skill_label}</strong>
                <Button
                  variant="secondary"
                  size="S"
                  onClick={() => void saveSkill(skillIdx)}
                  disabled={saving !== null}
                >
                  {saving === skillIdx ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)' }}>
                    <th style={{ width: 90, padding: '6px 12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                      Niveau
                    </th>
                    <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                      Libellé
                    </th>
                    <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                      Description / Critères observables
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entry.descriptors.map((desc) => (
                    <tr key={desc.level} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 12,
                          background: LEVEL_COLORS[desc.level],
                          color: LEVEL_TEXT_COLORS[desc.level],
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          whiteSpace: 'nowrap',
                        }}>
                          N{desc.level}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                        <input
                          type="text"
                          value={desc.label}
                          onChange={e => updateDescriptor(skillIdx, desc.level, 'label', e.target.value)}
                          placeholder="Ex: Non atteint"
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 4,
                            fontSize: '0.85rem',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text)',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                        <textarea
                          value={desc.description}
                          onChange={e => updateDescriptor(skillIdx, desc.level, 'description', e.target.value)}
                          placeholder="Critères observables pour ce niveau…"
                          rows={2}
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 4,
                            fontSize: '0.85rem',
                            resize: 'vertical',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text)',
                            fontFamily: 'inherit',
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
};
