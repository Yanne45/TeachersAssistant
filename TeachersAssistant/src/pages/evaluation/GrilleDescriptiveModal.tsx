import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Button } from '../../components/ui';
import { assignmentService, skillDescriptorService } from '../../services';
import type { SkillLevelDescriptor } from '../../services';
import { useApp } from '../../stores';
import './GrilleDescriptiveModal.css';

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
        <div className="grille-desc__footer">
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
        <p className="grille-desc__empty">Chargement…</p>
      ) : skills.length === 0 ? (
        <p className="grille-desc__empty">
          Aucune capacité liée à ce devoir. Associez des capacités depuis l'édition du devoir.
        </p>
      ) : (
        <div className="grille-desc__list">
          {skills.map((entry, skillIdx) => (
            <section key={entry.skill_id} className="grille-desc__section">
              <div className="grille-desc__section-header">
                <strong className="grille-desc__section-title">{entry.skill_label}</strong>
                <Button
                  variant="secondary"
                  size="S"
                  onClick={() => void saveSkill(skillIdx)}
                  disabled={saving !== null}
                >
                  {saving === skillIdx ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
              <table className="grille-desc__table">
                <thead>
                  <tr>
                    <th>Niveau</th>
                    <th>Libellé</th>
                    <th>Description / Critères observables</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.descriptors.map((desc) => (
                    <tr key={desc.level}>
                      <td>
                        <span
                          className="grille-desc__level-badge"
                          style={{ background: LEVEL_COLORS[desc.level], color: LEVEL_TEXT_COLORS[desc.level] }}
                        >
                          N{desc.level}
                        </span>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="grille-desc__input"
                          value={desc.label}
                          onChange={e => updateDescriptor(skillIdx, desc.level, 'label', e.target.value)}
                          placeholder="Ex: Non atteint"
                        />
                      </td>
                      <td>
                        <textarea
                          className="grille-desc__textarea"
                          value={desc.description}
                          onChange={e => updateDescriptor(skillIdx, desc.level, 'description', e.target.value)}
                          placeholder="Critères observables pour ce niveau…"
                          rows={2}
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
