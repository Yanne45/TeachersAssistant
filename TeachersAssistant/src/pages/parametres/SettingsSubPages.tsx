// ============================================================================
// Settings Sub-Pages — Composants pour chaque section de paramètres
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, Button, EmptyState } from '../../components/ui';
import { useApp } from '../../stores';
import {
  subjectService, levelService, classService, newYearService,
} from '../../services';
import type { Subject, Level, Class } from '../../types';

// ============================================================================
// Année scolaire
// ============================================================================

export const AnneeSettings: React.FC = () => {
  const { addToast } = useApp();
  const [label, setLabel] = useState('2025-2026');
  const [startDate, setStartDate] = useState('2025-09-01');
  const [endDate, setEndDate] = useState('2026-07-04');

  // New year creation
  const [showNewYear, setShowNewYear] = useState(false);
  const [newYearLabel, setNewYearLabel] = useState('2026-2027');
  const [newYearStart, setNewYearStart] = useState('2026-09-01');
  const [newYearEnd, setNewYearEnd] = useState('2027-07-04');
  const [creatingYear, setCreatingYear] = useState(false);

  useEffect(() => {
    import('../../services').then(({ db }) => {
      db.selectOne<any>('SELECT * FROM academic_years WHERE is_active = 1').then(year => {
        if (year) {
          setLabel(year.label);
          setStartDate(year.start_date ?? '2025-09-01');
          setEndDate(year.end_date ?? '2026-07-04');
        }
      }).catch(() => {});
    });
  }, []);

  const handleSave = async () => {
    try {
      const { db } = await import('../../services');
      await db.execute(
        `UPDATE academic_years SET label = ?, start_date = ?, end_date = ?, updated_at = datetime('now') WHERE is_active = 1`,
        [label, startDate, endDate]
      );
      addToast('success', 'Année scolaire mise à jour');
    } catch { addToast('error', 'Erreur de sauvegarde'); }
  };

  const handleCreateYear = async () => {
    setCreatingYear(true);
    try {
      const result = await newYearService.createFromExisting(
        1, // sourceYearId — active year
        newYearLabel.trim(),
        newYearStart,
        newYearEnd,
      );
      const summary = Object.entries(result.copied)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      addToast('success', `Année "${newYearLabel}" créée (${summary})`);
      setShowNewYear(false);
    } catch (err: any) {
      addToast('error', 'Erreur : ' + (err.message || 'inconnue'));
    } finally {
      setCreatingYear(false);
    }
  };

  return (
    <div className="settings-sub">
      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Année scolaire active</h3>
        <div className="settings-sub__field">
          <label className="settings-sub__label">Libellé</label>
          <input className="settings-sub__input" value={label} onChange={e => setLabel(e.target.value)} />
        </div>
        <div className="settings-sub__row">
          <div className="settings-sub__field">
            <label className="settings-sub__label">Date de début</label>
            <input className="settings-sub__input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="settings-sub__field">
            <label className="settings-sub__label">Date de fin</label>
            <input className="settings-sub__input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <Button variant="primary" size="S" onClick={handleSave}>Enregistrer</Button>
      </Card>

      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Nouvelle année depuis existante</h3>
        <p className="settings-sub__desc">
          Copie les programmes, templates de séquences, capacités et paramètres IA.
          Les élèves, notes, bulletins et cahier de textes ne sont pas copiés.
        </p>
        {!showNewYear ? (
          <Button variant="secondary" size="S" onClick={() => setShowNewYear(true)}>
            Créer nouvelle année
          </Button>
        ) : (
          <div className="settings-sub__new-year">
            <div className="settings-sub__field">
              <label className="settings-sub__label">Libellé nouvelle année</label>
              <input
                className="settings-sub__input"
                value={newYearLabel}
                onChange={e => setNewYearLabel(e.target.value)}
                placeholder="2026-2027"
              />
            </div>
            <div className="settings-sub__row">
              <div className="settings-sub__field">
                <label className="settings-sub__label">Début</label>
                <input className="settings-sub__input" type="date" value={newYearStart} onChange={e => setNewYearStart(e.target.value)} />
              </div>
              <div className="settings-sub__field">
                <label className="settings-sub__label">Fin</label>
                <input className="settings-sub__input" type="date" value={newYearEnd} onChange={e => setNewYearEnd(e.target.value)} />
              </div>
            </div>

            <div className="settings-sub__copy-summary">
              <span className="settings-sub__copy-title">Données copiées :</span>
              <span className="settings-sub__copy-item">✅ Programme officiel (thèmes, chapitres, PPO)</span>
              <span className="settings-sub__copy-item">✅ Compétences / capacités</span>
              <span className="settings-sub__copy-item">✅ Volumes horaires</span>
              <span className="settings-sub__copy-item">✅ Structure journée</span>
              <span className="settings-sub__copy-item">✅ Périodes de bulletin (T1/T2/T3)</span>
              <span className="settings-sub__copy-item">✅ Séquences → sauvées en templates</span>
              <span className="settings-sub__copy-title" style={{ marginTop: 8 }}>Non copiées :</span>
              <span className="settings-sub__copy-item">❌ Élèves, classes, notes</span>
              <span className="settings-sub__copy-item">❌ Bulletins, appréciations</span>
              <span className="settings-sub__copy-item">❌ Cahier de textes, emploi du temps</span>
              <span className="settings-sub__copy-item">❌ Corrections, devoirs</span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button variant="primary" size="S" disabled={creatingYear || !newYearLabel.trim()} onClick={handleCreateYear}>
                {creatingYear ? '⏳ Création…' : 'Confirmer la création'}
              </Button>
              <Button variant="secondary" size="S" onClick={() => setShowNewYear(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

// ============================================================================
// Matières & volumes horaires
// ============================================================================

export const MatieresSettings: React.FC = () => {
  const { addToast } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  useEffect(() => {
    subjectService.getAll().then(setSubjects).catch(() => {});
    levelService.getAll().then(setLevels).catch(() => {});
    classService.getAll().then(setClasses).catch(() => {});
  }, []);

  return (
    <div className="settings-sub">
      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Matières enseignées</h3>
        {subjects.length === 0 ? (
          <EmptyState icon="📚" title="Aucune matière configurée" actionLabel="+ Ajouter" onAction={() => addToast('info', 'TODO')} />
        ) : (
          <table className="settings-sub__table">
            <thead><tr><th>Matière</th><th>Abréviation</th><th>Couleur</th></tr></thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s.id}>
                  <td>{s.label}</td>
                  <td>{s.short_label}</td>
                  <td><span className="settings-sub__color-dot" style={{ background: s.color }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Niveaux</h3>
        {levels.map(l => (
          <span key={l.id} className="settings-sub__badge">{l.label}</span>
        ))}
      </Card>

      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Classes ({classes.length})</h3>
        {classes.length === 0 ? (
          <EmptyState icon="🏫" title="Aucune classe configurée" actionLabel="+ Ajouter" onAction={() => addToast('info', 'TODO')} />
        ) : (
          <table className="settings-sub__table">
            <thead><tr><th>Classe</th><th>Niveau</th><th>Effectif</th></tr></thead>
            <tbody>
              {classes.map(c => (
                <tr key={c.id}>
                  <td>{c.label}</td>
                  <td>{levels.find(l => l.id === c.level_id)?.label ?? '—'}</td>
                  <td>{c.student_count ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

// ============================================================================
// Export PDF — Identité
// ============================================================================

export const ExportPDFSettings: React.FC = () => {
  const { addToast } = useApp();
  const [schoolName, setSchoolName] = useState('Lycée Victor Hugo');
  const [teacherName, setTeacherName] = useState('M. Durand');
  const [teacherSubject, setTeacherSubject] = useState('HGGSP');
  const [footerText, setFooterText] = useState('');

  useEffect(() => {
    import('../../services').then(({ db }) => {
      db.selectOne<any>('SELECT * FROM export_settings LIMIT 1').then(row => {
        if (row) {
          setSchoolName(row.school_name ?? '');
          setTeacherName(row.teacher_name ?? '');
          setTeacherSubject(row.teacher_subject ?? '');
          setFooterText(row.footer_text ?? '');
        }
      }).catch(() => {});
    });
  }, []);

  const handleSave = async () => {
    try {
      const { db } = await import('../../services');
      const existing = await db.selectOne('SELECT id FROM export_settings LIMIT 1');
      if (existing) {
        await db.execute(
          `UPDATE export_settings SET school_name = ?, teacher_name = ?, teacher_subject = ?, footer_text = ? WHERE id = ?`,
          [schoolName, teacherName, teacherSubject, footerText, (existing as any).id]
        );
      } else {
        await db.insert(
          `INSERT INTO export_settings (school_name, teacher_name, teacher_subject, footer_text) VALUES (?, ?, ?, ?)`,
          [schoolName, teacherName, teacherSubject, footerText]
        );
      }
      addToast('success', 'Identité PDF enregistrée');
    } catch { addToast('error', 'Erreur de sauvegarde'); }
  };

  return (
    <div className="settings-sub">
      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Identité des documents PDF</h3>
        <div className="settings-sub__field">
          <label className="settings-sub__label">Établissement</label>
          <input className="settings-sub__input" value={schoolName} onChange={e => setSchoolName(e.target.value)} />
        </div>
        <div className="settings-sub__row">
          <div className="settings-sub__field">
            <label className="settings-sub__label">Enseignant</label>
            <input className="settings-sub__input" value={teacherName} onChange={e => setTeacherName(e.target.value)} />
          </div>
          <div className="settings-sub__field">
            <label className="settings-sub__label">Matière</label>
            <input className="settings-sub__input" value={teacherSubject} onChange={e => setTeacherSubject(e.target.value)} />
          </div>
        </div>
        <div className="settings-sub__field">
          <label className="settings-sub__label">Pied de page</label>
          <input className="settings-sub__input" value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Texte optionnel en bas de page" />
        </div>
        <Button variant="primary" size="S" onClick={handleSave}>Enregistrer</Button>
      </Card>
    </div>
  );
};

// ============================================================================
// Capacités
// ============================================================================

export const CapacitesSettings: React.FC = () => {
  const { addToast } = useApp();
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(() => {
    import('../../services').then(({ db }) => {
      db.select<any>('SELECT * FROM skills ORDER BY category, sort_order').then(setSkills).catch(() => {});
    });
  }, []);

  const byCategory = skills.reduce<Record<string, any[]>>((acc, s) => {
    const cat = s.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div className="settings-sub">
      {Object.entries(byCategory).map(([cat, items]) => (
        <Card key={cat} className="settings-sub__card">
          <h3 className="settings-sub__title">
            {cat === 'exercise_specific' ? 'Compétences spécifiques exercice' : cat === 'general' ? 'Compétences générales' : cat}
            <span className="settings-sub__count">{items.length}</span>
          </h3>
          <table className="settings-sub__table">
            <thead><tr><th>Compétence</th><th>Matière</th><th>Type</th></tr></thead>
            <tbody>
              {items.map((s: any) => (
                <tr key={s.id}>
                  <td>{s.label}</td>
                  <td>{s.subject_id ?? 'Toutes'}</td>
                  <td>{s.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
      {skills.length === 0 && (
        <EmptyState icon="🎯" title="Aucune compétence définie" description="Les compétences sont créées avec le schéma initial." />
      )}
    </div>
  );
};
