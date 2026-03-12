import React, { useEffect, useState } from 'react';
import { Card, Button } from '../../components/ui';
import { useApp } from '../../stores';
import { db } from '../../services';
import './ParametresPage.css';

export const ExportPDFSettings: React.FC = () => {
  const { addToast } = useApp();
  const [schoolName, setSchoolName] = useState('Lycée Victor Hugo');
  const [teacherName, setTeacherName] = useState('M. Durand');
  const [teacherSubject, setTeacherSubject] = useState('HGGSP');
  const [footerText, setFooterText] = useState('');

  useEffect(() => {
    db.selectOne<any>('SELECT * FROM export_settings LIMIT 1').then((row) => {
      if (!row) return;
      setSchoolName(row.school_name ?? '');
      setTeacherName(row.teacher_name ?? '');
      setTeacherSubject(row.teacher_subject ?? '');
      setFooterText(row.footer_text ?? '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      const existing = await db.selectOne('SELECT id FROM export_settings LIMIT 1');
      if (existing) {
        await db.execute(
          'UPDATE export_settings SET school_name = ?, teacher_name = ?, teacher_subject = ?, footer_text = ? WHERE id = ?',
          [schoolName, teacherName, teacherSubject, footerText, (existing as any).id],
        );
      } else {
        await db.insert(
          'INSERT INTO export_settings (school_name, teacher_name, teacher_subject, footer_text) VALUES (?, ?, ?, ?)',
          [schoolName, teacherName, teacherSubject, footerText],
        );
      }
      addToast('success', 'Identité PDF enregistrée');
    } catch {
      addToast('error', 'Erreur de sauvegarde');
    }
  };

  return (
    <div className="settings-sub">
      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Identite des documents PDF</h3>
        <div className="settings-sub__field">
          <label className="settings-sub__label">Etablissement</label>
          <input className="settings-sub__input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
        </div>
        <div className="settings-sub__row">
          <div className="settings-sub__field">
            <label className="settings-sub__label">Enseignant</label>
            <input className="settings-sub__input" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
          </div>
          <div className="settings-sub__field">
            <label className="settings-sub__label">Matière</label>
            <input className="settings-sub__input" value={teacherSubject} onChange={(e) => setTeacherSubject(e.target.value)} />
          </div>
        </div>
        <div className="settings-sub__field">
          <label className="settings-sub__label">Pied de page</label>
          <input className="settings-sub__input" value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Texte optionnel" />
        </div>
        <Button variant="primary" size="S" onClick={handleSave}>Enregistrer</Button>
      </Card>
    </div>
  );
};
