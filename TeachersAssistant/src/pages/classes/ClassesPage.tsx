// ============================================================================
// ClassesPage — Gestion des classes & listes d'élèves
// Vue d'ensemble (cards par classe) + import (CSV/PDF Pronote)
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useData, useRouter } from '../../stores';
import { EleveForm } from '../../components/forms';
import { EmptyState } from '../../components/ui';
import { db } from '../../services/db';
import './ClassesPage.css';

// ── Types locaux ──

interface ClassInfo {
  id: number;
  name: string;
  short_name: string;
  level_label: string;
  student_count: number;
}

interface StudentInfo {
  id: number;
  last_name: string;
  first_name: string;
  birth_year: number | null;
  gender: string | null;
}

interface ParsedStudent {
  last_name: string;
  first_name: string;
  birth_year?: number;
  gender?: string;
}

// ============================================================================
// Main page
// ============================================================================

export const ClassesPage: React.FC = () => {
  const { route } = useRouter();

  if (route.page === 'import') {
    return <ImportView />;
  }

  return <OverviewView />;
};

// ============================================================================
// Vue d'ensemble — cartes par classe
// ============================================================================

function OverviewView() {
  const { navigate } = useRouter();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [studentsByClass, setStudentsByClass] = useState<Record<number, StudentInfo[]>>({});
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Partial<{ last_name: string; first_name: string; birth_year: string; gender: string; class_ids: string[] }> | undefined>();

  // Charger classes
  useEffect(() => {
    (async () => {
      try {
        const rows = await db.select<ClassInfo[]>(`
          SELECT c.id, c.name, c.short_name, l.label AS level_label, c.student_count
          FROM classes c
          JOIN levels l ON l.id = c.level_id
          ORDER BY c.sort_order
        `);
        setClasses(rows);
      } catch (err) {
        console.error('[Classes] Erreur chargement:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Charger élèves quand on déplie une classe
  const loadStudents = async (classId: number) => {
    if (studentsByClass[classId]) return;
    try {
      const rows = await db.select<StudentInfo[]>(`
        SELECT s.id, s.last_name, s.first_name, s.birth_year, s.gender
        FROM students s
        JOIN student_class_enrollments e ON e.student_id = s.id
        WHERE e.class_id = ? AND e.is_active = 1
        ORDER BY s.last_name, s.first_name
      `, [classId]);
      setStudentsByClass(prev => ({ ...prev, [classId]: rows }));
    } catch (err) {
      console.error('[Classes] Erreur chargement élèves:', err);
    }
  };

  const toggleExpand = (classId: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
        loadStudents(classId);
      }
      return next;
    });
  };

  if (loading) {
    return <p style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Chargement des classes…</p>;
  }

  return (
    <div className="classes-page">
      <div className="classes-page__header">
        <h1 className="classes-page__title">Mes classes</h1>
        <div className="classes-page__header-actions">
          <button className="classes-page__btn classes-page__btn--secondary" onClick={() => navigate({ tab: 'classes', page: 'import' })}>
            📥 Importer une classe
          </button>
          <button className="classes-page__btn classes-page__btn--primary" onClick={() => { setEditStudent(undefined); setFormOpen(true); }}>
            + Ajouter un élève
          </button>
        </div>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Aucune classe configurée"
          description="Importez une liste de classe depuis Pronote (PDF) ou ajoutez des élèves manuellement."
          actionLabel="📥 Importer"
          onAction={() => navigate({ tab: 'classes', page: 'import' })}
        />
      ) : (
        <div className="classes-page__grid">
          {classes.map(cls => {
            const isOpen = expandedIds.has(cls.id);
            const students = studentsByClass[cls.id] ?? [];
            return (
              <div key={cls.id} className="classes-page__card">
                <div className="classes-page__card-header" onClick={() => toggleExpand(cls.id)}>
                  <div className="classes-page__card-title">
                    {cls.name}
                    <span className="classes-page__card-level">{cls.level_label}</span>
                  </div>
                  <div className="classes-page__card-count">
                    {cls.student_count} élèves
                    <span className={`classes-page__card-toggle ${isOpen ? 'classes-page__card-toggle--open' : ''}`}>▶</span>
                  </div>
                </div>

                {isOpen && (
                  <>
                    <div className="classes-page__card-actions">
                      <button className="classes-page__card-action" onClick={() => navigate({ tab: 'classes', page: 'import' })}>
                        📥 Importer PDF
                      </button>
                      <button className="classes-page__card-action" onClick={() => { setEditStudent({ class_ids: [String(cls.id)] }); setFormOpen(true); }}>
                        + Ajouter élève
                      </button>
                    </div>
                    <div className="classes-page__students">
                      {students.length === 0 ? (
                        <div style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                          Aucun élève inscrit
                        </div>
                      ) : (
                        students.map((s, idx) => (
                          <div key={s.id} className="classes-page__student-row">
                            <span className="classes-page__student-num">{idx + 1}</span>
                            <span className="classes-page__student-avatar">{(s.last_name ?? '?')[0]}</span>
                            <span className="classes-page__student-name">{s.last_name} {s.first_name}</span>
                            <span className="classes-page__student-gender">{s.gender === 'F' ? 'F' : s.gender === 'M' ? 'M' : ''}</span>
                            <div className="classes-page__student-actions">
                              <button className="classes-page__student-edit" onClick={() => {
                                setEditStudent({
                                  last_name: s.last_name,
                                  first_name: s.first_name,
                                  birth_year: s.birth_year ? String(s.birth_year) : '',
                                  gender: s.gender ?? '',
                                  class_ids: [String(cls.id)],
                                });
                                setFormOpen(true);
                              }}>
                                ✏️
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <EleveForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={(data) => { console.log('Save élève:', data); setFormOpen(false); }}
        initialData={editStudent}
      />
    </div>
  );
}

// ============================================================================
// Vue import — CSV ou PDF (Pronote)
// ============================================================================

function ImportView() {
  const { navigate } = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [targetClassId, setTargetClassId] = useState<number | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [parsed, setParsed] = useState<ParsedStudent[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await db.select<{ id: number; name: string }[]>(
          'SELECT id, name FROM classes ORDER BY sort_order'
        );
        setClasses(rows);
      } catch { /* ignore */ }
    })();
  }, []);

  // ── Parse fichier ──

  const handleFile = async (file: File) => {
    setError(null);
    setParsed([]);
    setFileName(file.name);

    const ext = file.name.toLowerCase().split('.').pop();

    if (ext === 'csv' || ext === 'txt') {
      const text = await file.text();
      parseCSV(text);
    } else if (ext === 'pdf') {
      await parsePDF(file);
    } else {
      setError(`Format non supporté : .${ext}. Utilisez .csv ou .pdf`);
    }
  };

  // ── Parse CSV ──

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) { setError('Fichier vide'); return; }

    const sep = lines[0].includes(';') ? ';' : ',';
    const rows = lines.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')));

    const first = rows[0].map(c => c.toLowerCase());
    const hasHeader = first.includes('nom') || first.includes('last_name') || first.includes('prénom')
      || first.includes('élève') || first.includes('eleve');
    const dataRows = hasHeader ? rows.slice(1) : rows;

    if (dataRows.length === 0) { setError('Aucune donnée trouvée'); return; }
    if (dataRows[0].length < 2) { setError('Format attendu : Nom ; Prénom [; Année ; Genre]'); return; }

    const students = dataRows
      .map(r => ({
        last_name: r[0] || '',
        first_name: r[1] || '',
        birth_year: r[2] ? parseInt(r[2]) : undefined,
        gender: r[3] || undefined,
      }))
      .filter(s => s.last_name && s.first_name);

    setParsed(students);
  };

  // ── Parse PDF (Pronote) ──

  const parsePDF = async (file: File) => {
    try {
      // Lire le PDF comme ArrayBuffer et extraire le texte brut
      const buffer = await file.arrayBuffer();
      const text = extractTextFromPdfBuffer(buffer);

      if (!text || text.trim().length < 10) {
        setError('Impossible d\'extraire le texte du PDF. Essayez avec un export CSV depuis Pronote.');
        return;
      }

      // Parser les lignes pour trouver des noms d'élèves
      const students = extractStudentsFromText(text);

      if (students.length === 0) {
        setError('Aucun élève détecté dans ce PDF. Vérifiez qu\'il s\'agit bien d\'une liste de classe Pronote.');
        return;
      }

      setParsed(students);
    } catch (err) {
      console.error('[Import PDF] Erreur:', err);
      setError('Erreur lors de la lecture du PDF. Essayez avec un export CSV.');
    }
  };

  // ── Import en DB ──

  const handleImport = async () => {
    if (parsed.length === 0) return;
    if (!targetClassId && !newClassName.trim()) {
      setError('Sélectionnez une classe existante ou saisissez le nom d\'une nouvelle classe.');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      let classId = targetClassId;

      // Créer la classe si nouvelle
      if (!classId && newClassName.trim()) {
        // Chercher le premier level et academic_year
        const year = await db.selectOne<{ id: number }>('SELECT id FROM academic_years WHERE is_active = 1');
        const level = await db.selectOne<{ id: number }>('SELECT id FROM levels ORDER BY sort_order LIMIT 1');
        if (!year || !level) { setError('Année scolaire ou niveau manquant. Configurez-les dans les paramètres.'); setImporting(false); return; }

        const maxSort = await db.selectOne<{ m: number }>('SELECT COALESCE(MAX(sort_order), 0) AS m FROM classes');
        classId = await db.insert(
          'INSERT INTO classes (academic_year_id, level_id, name, short_name, student_count, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [year.id, level.id, newClassName.trim(), newClassName.trim(), parsed.length, (maxSort?.m ?? 0) + 1]
        );
      }

      // Insérer les élèves
      let imported = 0;
      for (const s of parsed) {
        const studentId = await db.insert(
          'INSERT INTO students (last_name, first_name, birth_year, gender) VALUES (?, ?, ?, ?)',
          [s.last_name, s.first_name, s.birth_year ?? null, s.gender ?? null]
        );
        await db.execute(
          'INSERT INTO student_class_enrollments (student_id, class_id, enrollment_date, is_active) VALUES (?, ?, date("now"), 1)',
          [studentId, classId]
        );
        imported++;
      }

      // Mettre à jour le compteur
      await db.execute(
        'UPDATE classes SET student_count = (SELECT COUNT(*) FROM student_class_enrollments WHERE class_id = ? AND is_active = 1) WHERE id = ?',
        [classId, classId]
      );

      console.log(`[Import] ${imported} élèves importés dans la classe #${classId}`);
      navigate({ tab: 'classes', page: 'overview' });
    } catch (err) {
      console.error('[Import] Erreur:', err);
      setError(`Erreur à l'import : ${String(err)}`);
    } finally {
      setImporting(false);
    }
  };

  // ── Drag & Drop ──

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="classes-page">
      <div className="classes-page__header">
        <h1 className="classes-page__title">Importer une classe</h1>
        <button className="classes-page__btn classes-page__btn--secondary" onClick={() => navigate({ tab: 'classes', page: 'overview' })}>
          ← Retour
        </button>
      </div>

      <div className="classes-page__import">
        <p className="classes-page__import-title">
          Glissez un fichier PDF (export Pronote) ou CSV contenant la liste des élèves.
        </p>

        {/* Zone de drop */}
        <div
          className={`classes-page__import-zone ${dragging ? 'classes-page__import-zone--drag' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.csv,.txt"
            className="classes-page__import-file-input"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div className="classes-page__import-zone-icon">📄</div>
          <div className="classes-page__import-zone-text">
            {fileName ? `Fichier : ${fileName}` : 'Glissez un fichier ici ou cliquez pour sélectionner'}
          </div>
          <div className="classes-page__import-zone-hint">PDF (Pronote), CSV ou TXT — Nom ; Prénom</div>
        </div>

        {error && <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'rgba(231,76,60,0.08)', color: 'var(--color-danger)', borderRadius: 'var(--radius-xs)', fontSize: 12 }}>{error}</div>}

        {/* Classe cible */}
        {parsed.length > 0 && (
          <div className="classes-page__import-target">
            <label>Classe cible :</label>
            <select value={targetClassId ?? ''} onChange={e => { setTargetClassId(e.target.value ? Number(e.target.value) : null); setNewClassName(''); }}>
              <option value="">— Nouvelle classe —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!targetClassId && (
              <input
                type="text"
                placeholder="Nom de la nouvelle classe"
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                style={{ flex: 1, height: 32, border: 'var(--border-default)', borderRadius: 'var(--radius-xs)', padding: '0 var(--space-2)', fontSize: 12 }}
              />
            )}
          </div>
        )}

        {/* Prévisualisation */}
        {parsed.length > 0 && (
          <div className="classes-page__preview">
            <div className="classes-page__preview-title">{parsed.length} élèves détectés</div>
            <div className="classes-page__preview-list">
              {parsed.slice(0, 20).map((s, i) => (
                <div key={i} className="classes-page__preview-item">
                  <strong>{s.last_name}</strong> {s.first_name}
                  {s.gender ? ` (${s.gender})` : ''}
                </div>
              ))}
              {parsed.length > 20 && (
                <div className="classes-page__preview-more">… et {parsed.length - 20} autres</div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {parsed.length > 0 && (
          <div className="classes-page__import-actions">
            <button className="classes-page__btn classes-page__btn--secondary" onClick={() => { setParsed([]); setFileName(null); setError(null); }}>
              Annuler
            </button>
            <button className="classes-page__btn classes-page__btn--primary" onClick={handleImport} disabled={importing}>
              {importing ? 'Import en cours…' : `Importer ${parsed.length} élèves`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Utilitaires — extraction texte PDF (basique, sans librairie externe)
// ============================================================================

/**
 * Extraction basique de texte depuis un buffer PDF.
 * Parcourt les streams décompressés pour extraire les opérateurs Tj/TJ.
 * Pour les PDF complexes (Pronote), une librairie dédiée serait préférable.
 */
function extractTextFromPdfBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder('latin1').decode(bytes);

  // Chercher les blocs de texte entre BT...ET
  const textBlocks: string[] = [];
  const btRegex = /BT\s([\s\S]*?)ET/g;
  let match;

  while ((match = btRegex.exec(raw)) !== null) {
    const block = match[1];

    // Extraire les chaînes Tj
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tj;
    while ((tj = tjRegex.exec(block)) !== null) {
      textBlocks.push(tj[1]);
    }

    // Extraire les arrays TJ
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tja;
    while ((tja = tjArrayRegex.exec(block)) !== null) {
      const inner = tja[1];
      const strRegex = /\(([^)]*)\)/g;
      let s;
      let line = '';
      while ((s = strRegex.exec(inner)) !== null) {
        line += s[1];
      }
      if (line.trim()) textBlocks.push(line);
    }
  }

  // Aussi chercher le texte brut entre les streams (fallback)
  if (textBlocks.length === 0) {
    // Essayer FlateDecode streams (non compressé — cas rare mais possible)
    const plainText = raw.replace(/[^\x20-\x7EÀ-ÿ\n\r]/g, ' ');
    return plainText;
  }

  return textBlocks.join('\n');
}

/**
 * Extraire des noms d'élèves depuis du texte brut (PDF/Pronote).
 * Heuristiques :
 * - Lignes "NOM Prénom" (NOM tout en majuscules)
 * - Lignes "NOM;Prénom" (séparateur)
 * - Lignes numérotées "1. NOM Prénom"
 */
function extractStudentsFromText(text: string): ParsedStudent[] {
  const students: ParsedStudent[] = [];
  const seen = new Set<string>();

  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 2);

  for (const line of lines) {
    let lastName = '';
    let firstName = '';

    // Pattern 1 : "NOM Prénom" — NOM entièrement en majuscules
    const namePattern = /^(?:\d+[.\s)]*)?([A-ZÀ-Ü]{2,}(?:[\s-][A-ZÀ-Ü]+)*)\s+([A-ZÀ-ÿa-z][\wà-ÿ-]+(?:\s+[A-ZÀ-ÿa-z][\wà-ÿ-]+)*)$/;
    const m1 = line.match(namePattern);
    if (m1) {
      lastName = m1[1].trim();
      firstName = m1[2].trim();
    }

    // Pattern 2 : séparateur "NOM;Prénom" ou "NOM,Prénom"
    if (!lastName) {
      const parts = line.split(/[;,\t]/).map(p => p.trim());
      if (parts.length >= 2 && parts[0].length >= 2 && parts[1].length >= 2) {
        // Vérifier que le premier part ressemble à un nom (majuscules)
        if (/^[A-ZÀ-Ü]{2,}/.test(parts[0])) {
          lastName = parts[0];
          firstName = parts[1];
        }
      }
    }

    if (lastName && firstName) {
      // Normaliser : NOM → Nom
      const key = `${lastName}|${firstName}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        students.push({
          last_name: lastName.toUpperCase(),
          first_name: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        });
      }
    }
  }

  return students;
}
