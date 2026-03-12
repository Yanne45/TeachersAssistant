import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { useApp } from '../../stores';
import { programTopicService, programKeywordService, subjectService, levelService, smartGenerate } from '../../services';
import type { ProgramTopicTree, TopicType, Subject, Level, ID } from '../../types';
import './ParametresPage.css';

const TOPIC_TYPE_LABELS: Record<TopicType, string> = {
  theme: 'Thème',
  chapter: 'Chapitre',
  point: 'Point',
  sub_point: 'Sous-point',
};

const CHILD_TYPE: Record<TopicType, TopicType | null> = {
  theme: 'chapter',
  chapter: 'point',
  point: 'sub_point',
  sub_point: null,
};

interface TopicDraft {
  id: number | null;
  parent_id: number | null;
  topic_type: TopicType;
  code: string;
  title: string;
  description: string;
  expected_hours: string;
  keywords: string; // comma-separated
}

const EMPTY_DRAFT: TopicDraft = {
  id: null, parent_id: null, topic_type: 'theme',
  code: '', title: '', description: '', expected_hours: '', keywords: '',
};

export const ProgrammeSettings: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<ID | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<ID | null>(null);
  const [tree, setTree] = useState<ProgramTopicTree[]>([]);
  const [expanded, setExpanded] = useState<Set<ID>>(new Set());
  const [draft, setDraft] = useState<TopicDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProgramTopicTree | null>(null);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiExtractedText, setAiExtractedText] = useState('');
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiPreview, setAiPreview] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load subjects & levels
  useEffect(() => {
    Promise.all([subjectService.getAll(), levelService.getAll()]).then(([s, l]) => {
      setSubjects(s);
      setLevels(l);
      if (s.length > 0) setSelectedSubject(s[0]!.id);
      if (l.length > 0) setSelectedLevel(l[l.length - 1]!.id);
    });
  }, []);

  const reload = useCallback(async () => {
    if (!activeYear?.id || !selectedSubject || !selectedLevel) {
      setTree([]);
      return;
    }
    const data = await programTopicService.getTree(activeYear.id, selectedSubject, selectedLevel);
    setTree(data);
  }, [activeYear, selectedSubject, selectedLevel]);

  useEffect(() => { void reload(); }, [reload]);

  const toggleExpand = (id: ID) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startCreate = (parentId: ID | null, topicType: TopicType) => {
    setDraft({ ...EMPTY_DRAFT, parent_id: parentId, topic_type: topicType });
  };

  const startEdit = async (node: ProgramTopicTree) => {
    // Load keywords for this topic
    let kws: string[] = [];
    try {
      const kwRows = await programKeywordService.getByTopic(node.id);
      kws = kwRows.map((k) => k.keyword);
    } catch { /* table might not exist yet */ }

    setDraft({
      id: node.id,
      parent_id: node.parent_id,
      topic_type: node.topic_type,
      code: node.code ?? '',
      title: node.title,
      description: node.description ?? '',
      expected_hours: node.expected_hours != null ? String(node.expected_hours) : '',
      keywords: kws.join(', '),
    });
  };

  const handleSave = async () => {
    if (!draft || !activeYear?.id || !selectedSubject || !selectedLevel) return;
    if (!draft.title.trim()) {
      addToast('warn', 'Le titre est requis');
      return;
    }
    setSaving(true);
    try {
      const hours = draft.expected_hours.trim() ? parseFloat(draft.expected_hours) : null;
      if (draft.id) {
        await programTopicService.update(draft.id, {
          code: draft.code.trim() || null,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          expected_hours: Number.isFinite(hours) ? hours : null,
        });
        // Save keywords
        const kws = draft.keywords.split(',').map((k) => k.trim()).filter(Boolean);
        await programKeywordService.setKeywords(draft.id, kws);
        addToast('success', `${TOPIC_TYPE_LABELS[draft.topic_type]} modifié`);
      } else {
        // Count siblings for sort_order
        const siblings = draft.parent_id
          ? tree.flatMap(function flatten(n: ProgramTopicTree): ProgramTopicTree[] {
              return n.id === draft.parent_id ? n.children : n.children.flatMap(flatten);
            }).length
          : tree.length;

        const newId = await programTopicService.create({
          academic_year_id: activeYear.id,
          subject_id: selectedSubject,
          level_id: selectedLevel,
          parent_id: draft.parent_id,
          topic_type: draft.topic_type,
          code: draft.code.trim() || null,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          expected_hours: Number.isFinite(hours) ? hours : null,
          sort_order: siblings,
        });
        // Save keywords
        const kws = draft.keywords.split(',').map((k) => k.trim()).filter(Boolean);
        if (kws.length > 0) {
          await programKeywordService.setKeywords(newId, kws);
        }
        addToast('success', `${TOPIC_TYPE_LABELS[draft.topic_type]} créé`);
        // Auto-expand parent
        if (draft.parent_id) setExpanded((prev) => new Set(prev).add(draft.parent_id!));
      }
      setDraft(null);
      await reload();
    } catch (error) {
      console.error('[ProgrammeSettings] Erreur sauvegarde:', error);
      addToast('error', 'Échec de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ── Extract text from uploaded file ──
  const handleFileSelect = async (file: File) => {
    setAiFile(file);
    setAiExtractedText('');
    setAiPreview(null);
    setAiExtracting(true);
    try {
      let text = '';
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map((item: any) => item.str).join(' '));
        }
        text = pages.join('\n\n');
      } else if (ext === 'docx') {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        addToast('warn', `Aucun texte extrait de ${file.name}`);
        setAiFile(null);
      } else {
        setAiExtractedText(text.trim());
        addToast('success', `${file.name} : ${text.length} caractères extraits`);
      }
    } catch (error) {
      console.error('[ProgrammeSettings] Erreur extraction:', error);
      addToast('error', `Impossible de lire ${file.name}`);
      setAiFile(null);
    } finally {
      setAiExtracting(false);
    }
  };

  // ── Send to AI for structured parsing ──
  const handleAIParse = async () => {
    if (!aiExtractedText.trim()) {
      addToast('warn', 'Aucun texte à analyser');
      return;
    }
    if (!activeYear?.id || !selectedSubject || !selectedLevel) {
      addToast('error', 'Sélectionnez une matière et un niveau');
      return;
    }
    const subjectName = subjects.find((s) => s.id === selectedSubject)?.label ?? '';
    const levelName = levels.find((l) => l.id === selectedLevel)?.label ?? '';

    setAiParsing(true);
    setAiPreview(null);
    try {
      const res = await smartGenerate({
        taskCode: 'parse_official_program',
        variables: {
          subject_name: subjectName,
          level_name: levelName,
          document_source: aiFile?.name ?? 'texte collé',
          document_content: aiExtractedText,
        },
      });

      const raw = res?.output_content || res?.processed_result || '';
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        addToast('error', "L'IA n'a pas retourné de structure JSON valide");
        return;
      }
      const parsed = JSON.parse(jsonMatch[0]) as any[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        addToast('warn', 'Structure vide retournée par l\'IA');
        return;
      }
      setAiPreview(parsed);
      addToast('success', `${parsed.length} thème(s) détecté(s) — vérifiez puis confirmez l'import`);
    } catch (error: any) {
      console.error('[ProgrammeSettings] Erreur IA:', error);
      addToast('error', 'Erreur IA : ' + (error.message || 'inconnue'));
    } finally {
      setAiParsing(false);
    }
  };

  // ── Confirm and insert AI-parsed topics ──
  const handleAIConfirm = async () => {
    if (!aiPreview || !activeYear?.id || !selectedSubject || !selectedLevel) return;
    setAiParsing(true);
    try {
      const insertedIds: ID[] = [];

      const insertNode = async (node: any, parentId: ID | null, sortOrder: number, topicType: TopicType) => {
        const hours = typeof node.hours_min === 'number' ? node.hours_min
          : typeof node.expected_hours === 'number' ? node.expected_hours : null;

        const newId = await programTopicService.create({
          academic_year_id: activeYear!.id,
          subject_id: selectedSubject!,
          level_id: selectedLevel!,
          parent_id: parentId,
          topic_type: topicType,
          code: node.code ?? null,
          title: node.title,
          description: node.description ?? null,
          expected_hours: hours,
          sort_order: sortOrder,
        });
        insertedIds.push(newId);

        // Keywords
        if (Array.isArray(node.keywords) && node.keywords.length > 0) {
          await programKeywordService.setKeywords(newId, node.keywords);
        }

        // Recurse children
        const children = node.children ?? [];
        const childType = CHILD_TYPE[topicType];
        if (childType && children.length > 0) {
          for (let i = 0; i < children.length; i++) {
            await insertNode(children[i], newId, i, childType);
          }
        }
      };

      for (let i = 0; i < aiPreview.length; i++) {
        await insertNode(aiPreview[i], null, i, 'theme');
      }

      addToast('success', `${insertedIds.length} éléments importés`);
      setAiPreview(null);
      setAiFile(null);
      setAiExtractedText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await reload();
      setExpanded(new Set(insertedIds));
    } catch (error) {
      console.error('[ProgrammeSettings] Erreur insertion:', error);
      addToast('error', "Erreur lors de l'insertion");
    } finally {
      setAiParsing(false);
    }
  };

  const subjectColor = useMemo(
    () => subjects.find((s) => s.id === selectedSubject)?.color ?? 'var(--color-primary)',
    [subjects, selectedSubject],
  );

  const renderNode = (node: ProgramTopicTree, depth: number): React.ReactNode => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children.length > 0;
    const childType = CHILD_TYPE[node.topic_type];
    return (
      <div key={node.id} className="prog-tree__node" style={{ marginLeft: depth * 16 }}>
        <div className="prog-tree__row">
          {hasChildren || childType ? (
            <button
              className="prog-tree__toggle"
              onClick={() => toggleExpand(node.id)}
              aria-label={isExpanded ? 'Réduire' : 'Développer'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="prog-tree__toggle-spacer" />
          )}
          <span
            className="prog-tree__type-badge"
            style={{ borderColor: subjectColor, color: subjectColor }}
          >
            {TOPIC_TYPE_LABELS[node.topic_type]}
          </span>
          {node.code && <span className="prog-tree__code">{node.code}</span>}
          <span className="prog-tree__title">{node.title}</span>
          {node.expected_hours != null && (
            <span className="prog-tree__hours">{node.expected_hours}h</span>
          )}
          <div className="prog-tree__actions">
            <button className="settings-sub__link" onClick={() => void startEdit(node)}>Modifier</button>
            <button className="settings-sub__link settings-sub__link--danger" onClick={() => setDeleteTarget(node)}>Supprimer</button>
            {childType && (
              <button className="settings-sub__link" onClick={() => { startCreate(node.id, childType); toggleExpand(node.id); }}>
                + {TOPIC_TYPE_LABELS[childType]}
              </button>
            )}
          </div>
        </div>
        {isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
        {isExpanded && childType && node.children.length === 0 && (
          <div className="prog-tree__empty" style={{ marginLeft: (depth + 1) * 16 }}>
            Aucun {TOPIC_TYPE_LABELS[childType].toLowerCase()}.{' '}
            <button className="settings-sub__link" onClick={() => startCreate(node.id, childType)}>
              + Ajouter
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="settings-sub settings-sub--two-col">
      <div className="settings-sub__col-left">
        {/* Sélecteurs + arbre */}
        <Card className="settings-sub__card">
          <h3 className="settings-sub__title">Programme officiel</h3>
          <div className="settings-sub__row" style={{ marginBottom: 12 }}>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Matière</label>
              <select
                className="settings-sub__input"
                value={selectedSubject ?? ''}
                onChange={(e) => setSelectedSubject(Number(e.target.value) || null)}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Niveau</label>
              <select
                className="settings-sub__input"
                value={selectedLevel ?? ''}
                onChange={(e) => setSelectedLevel(Number(e.target.value) || null)}
              >
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="prog-tree__toolbar">
            <Button variant="secondary" size="S" onClick={() => startCreate(null, 'theme')}>
              + Nouveau thème
            </Button>
            <span className="settings-sub__table-meta" style={{ marginLeft: 'auto' }}>
              {tree.length} thème(s)
            </span>
          </div>

          {tree.length === 0 ? (
            <EmptyState
              icon="📖"
              title="Aucun programme défini"
              description="Ajoutez des thèmes manuellement ou importez le programme officiel via le panneau IA."
              actionLabel="+ Nouveau thème"
              onAction={() => startCreate(null, 'theme')}
            />
          ) : (
            <div className="prog-tree">
              {tree.map((node) => renderNode(node, 0))}
            </div>
          )}
        </Card>
      </div>

      <div className="settings-sub__col-right">
        {/* Formulaire édition */}
        {draft && (
          <Card className="settings-sub__card">
            <h3 className="settings-sub__title">
              {draft.id ? 'Modifier' : 'Nouveau'} {TOPIC_TYPE_LABELS[draft.topic_type].toLowerCase()}
            </h3>
            <div className="settings-sub__row">
              <div className="settings-sub__field" style={{ maxWidth: 120 }}>
                <label className="settings-sub__label">Code</label>
                <input
                  className="settings-sub__input"
                  value={draft.code}
                  onChange={(e) => setDraft((d) => d && { ...d, code: e.target.value })}
                  placeholder="T1, C2…"
                />
              </div>
              <div className="settings-sub__field">
                <label className="settings-sub__label">Titre *</label>
                <input
                  className="settings-sub__input"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => d && { ...d, title: e.target.value })}
                />
              </div>
              <div className="settings-sub__field" style={{ maxWidth: 80 }}>
                <label className="settings-sub__label">Heures</label>
                <input
                  className="settings-sub__input"
                  value={draft.expected_hours}
                  onChange={(e) => setDraft((d) => d && { ...d, expected_hours: e.target.value })}
                  placeholder="6"
                />
              </div>
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Description</label>
              <textarea
                className="settings-sub__input"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft((d) => d && { ...d, description: e.target.value })}
              />
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Mots-clés (séparés par des virgules)</label>
              <input
                className="settings-sub__input"
                value={draft.keywords}
                onChange={(e) => setDraft((d) => d && { ...d, keywords: e.target.value })}
                placeholder="Renaissance, Humanisme, Réforme…"
              />
            </div>
            <div className="settings-sub__crud-actions">
              <Button variant="primary" size="S" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Enregistrement…' : (draft.id ? 'Mettre à jour' : 'Créer')}
              </Button>
              <Button variant="secondary" size="S" onClick={() => setDraft(null)}>Annuler</Button>
            </div>
          </Card>
        )}

        {/* Import IA depuis fichier */}
        <Card className="settings-sub__card">
          <h3 className="settings-sub__title">Import IA du programme</h3>
          <p className="settings-sub__desc">
            Joignez le PDF du programme officiel (ou un fichier DOCX/TXT).
            L'IA analysera le document et en extraira la structure hiérarchique.
          </p>

          <div className="prog-tree__file-drop">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              className="prog-tree__file-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFileSelect(f);
              }}
            />
            <div className="prog-tree__file-label">
              {aiExtracting ? (
                <span>Extraction en cours…</span>
              ) : aiFile ? (
                <span>{aiFile.name} ({(aiExtractedText.length / 1000).toFixed(1)}k car.)</span>
              ) : (
                <span>Cliquez ou glissez un fichier PDF, DOCX ou TXT</span>
              )}
            </div>
          </div>

          {aiExtractedText && (
            <>
              <details className="prog-tree__text-preview">
                <summary>Aperçu du texte extrait ({aiExtractedText.length} car.)</summary>
                <textarea
                  className="settings-sub__input"
                  rows={6}
                  value={aiExtractedText}
                  onChange={(e) => setAiExtractedText(e.target.value)}
                />
              </details>

              <div className="settings-sub__crud-actions" style={{ marginTop: 8 }}>
                <Button
                  variant="primary"
                  size="S"
                  onClick={() => void handleAIParse()}
                  disabled={aiParsing}
                >
                  {aiParsing ? 'Analyse IA en cours…' : 'Analyser avec l\'IA'}
                </Button>
                <Button
                  variant="secondary"
                  size="S"
                  onClick={() => {
                    setAiFile(null);
                    setAiExtractedText('');
                    setAiPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Retirer
                </Button>
              </div>
            </>
          )}

          {/* AI preview — confirm before inserting */}
          {aiPreview && (
            <div className="prog-tree__ai-preview">
              <h4 className="settings-sub__label" style={{ marginTop: 12 }}>
                Structure détectée ({aiPreview.length} thème{aiPreview.length > 1 ? 's' : ''})
              </h4>
              <div className="prog-tree__ai-preview-tree">
                {aiPreview.map((theme: any, ti: number) => (
                  <div key={ti} className="prog-tree__ai-node">
                    <span className="prog-tree__type-badge" style={{ borderColor: subjectColor, color: subjectColor }}>
                      Thème
                    </span>
                    <span className="prog-tree__title">{theme.title}</span>
                    {(theme.children ?? []).map((ch: any, ci: number) => (
                      <div key={ci} className="prog-tree__ai-node" style={{ marginLeft: 20 }}>
                        <span className="prog-tree__type-badge" style={{ borderColor: subjectColor, color: subjectColor, opacity: 0.7 }}>
                          Chap.
                        </span>
                        <span className="prog-tree__title" style={{ fontSize: 12 }}>{ch.title}</span>
                        {ch.hours_min && <span className="prog-tree__hours">{ch.hours_min}h</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="settings-sub__crud-actions" style={{ marginTop: 10 }}>
                <Button
                  variant="primary"
                  size="S"
                  onClick={() => void handleAIConfirm()}
                  disabled={aiParsing}
                >
                  {aiParsing ? 'Insertion…' : 'Confirmer l\'import'}
                </Button>
                <Button variant="secondary" size="S" onClick={() => setAiPreview(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await programTopicService.delete(deleteTarget.id);
            addToast('success', `${TOPIC_TYPE_LABELS[deleteTarget.topic_type]} supprimé`);
            await reload();
          } catch (error) {
            console.error('[ProgrammeSettings] Erreur suppression:', error);
            addToast('error', 'Échec de la suppression');
          } finally {
            setDeleteTarget(null);
          }
        }}
        title={`Supprimer ${deleteTarget ? TOPIC_TYPE_LABELS[deleteTarget.topic_type].toLowerCase() : ''}`}
        message={`Supprimer « ${deleteTarget?.title ?? ''} » et tous ses enfants ? Cette action est irréversible.`}
      />
    </div>
  );
};
