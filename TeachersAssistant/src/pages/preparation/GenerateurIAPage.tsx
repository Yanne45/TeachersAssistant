// ============================================================================
// GenerateurIAPage v2 - Interface de génération IA (spec 5.8)
// Branchée sur ai_tasks / ai_task_variables / ai_task_params
// Variables: auto-remplies si contexte dispo, dropdown sinon
// Consignes libres (couche 3): visibles en permanence
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Badge, VoiceInput } from '../../components/ui';
import {
  aiTaskService, aiGenerationService, assemblePrompt, smartGenerate,
  subjectService, levelService, sequenceService,
  aiQueueService, documentService,
} from '../../services';
import { useApp, useRouter } from '../../stores';
import { AI_TASK_STATUS_META } from '../../constants/statuses';
import type { AITask, AITaskVariable, AITaskParam } from '../../services';
import type { Subject, Level } from '../../types';
import './GenerateurIAPage.css';

const CATEGORY_LABELS: Record<string, string> = {
  contenus: 'Contenus pédagogiques',
  evaluations: 'Évaluations',
  planification: 'Planification',
  correction: 'Correction & suivi',
  systeme: 'Système',
};

type SidebarView = 'generate' | 'history' | 'queue';

export const GenerateurIAPage: React.FC = () => {
  const { addToast, activeYear } = useApp();
  const { route, setPage } = useRouter();

  // Navigation
  const [view, setView] = useState<SidebarView>('generate');

  useEffect(() => {
    if (route.page === 'ia-historique') setView('history');
    else if (route.page === 'ia-queue') setView('queue');
    else setView('generate');
  }, [route.page]);

  // Reference data from DB
  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);
  const [dbLevels, setDbLevels] = useState<Level[]>([]);
  const [dbSequences, setDbSequences] = useState<any[]>([]);

  // Task selection
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AITask | null>(null);
  const [taskVariables, setTaskVariables] = useState<AITaskVariable[]>([]);
  const [taskParams, setTaskParams] = useState<AITaskParam[]>([]);

  // Variable values
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // Param values (overrides for this generation)
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  // User instructions (couche 3)
  const [userInstructions, setUserInstructions] = useState('');

  // État de génération
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [resultContent, setResultContent] = useState<string | null>(null);

  // Aperçu du prompt
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [promptPreview, setPromptPreview] = useState<{ system: string; user: string } | null>(null);
  const [promptPreviewLoading, setPromptPreviewLoading] = useState(false);

  // History
  const [history, setHistory] = useState<any[]>([]);

  // Queue monitoring
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [processingQueue, setProcessingQueue] = useState(false);

  // Document attachment
  const [docSearch, setDocSearch] = useState('');
  const [docResults, setDocResults] = useState<any[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [selectedDocLabels, setSelectedDocLabels] = useState<Record<number, string>>({});
  const [adHocFiles, setAdHocFiles] = useState<Array<{ name: string; text: string }>>([]);

  // ---- Load tasks + reference data ----
  useEffect(() => {
    aiTaskService.getAll().then(setTasks).catch(() => setTasks([]));
    subjectService.getAll().then(setDbSubjects).catch(() => setDbSubjects([]));
    levelService.getAll().then(setDbLevels).catch(() => setDbLevels([]));
    const yearId = activeYear?.id ?? 1;
    sequenceService.getByYear(yearId).then(setDbSequences).catch(() => setDbSequences([]));
    // Load queue count
    aiQueueService.pendingCount().then(setQueueCount).catch(() => {});
  }, [activeYear?.id]);

  // ---- Load history ----
  useEffect(() => {
    if (view === 'history') {
      aiGenerationService.getHistory(30).then(setHistory).catch(() => setHistory([]));
    }
    if (view === 'queue') {
      aiQueueService.getPending().then(setQueueItems).catch(() => setQueueItems([]));
      aiQueueService.pendingCount().then(setQueueCount).catch(() => {});
    }
  }, [view, resultContent]);

  // ---- Search library documents ----
  useEffect(() => {
    if (!docSearch.trim()) {
      documentService.getRecent(8).then(setDocResults).catch(() => setDocResults([]));
      return;
    }
    const t = setTimeout(() => {
      documentService.search(docSearch, 10).then(setDocResults).catch(() => setDocResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [docSearch]);

  // ---- Auto-fill logic using DB reference data ----
  const autoFillVariable = useCallback((v: AITaskVariable): string | null => {
    // If only one subject, auto-fill
    if (v.data_source === 'subjects.name' && dbSubjects.length === 1) {
      const onlySubject = dbSubjects[0];
      if (onlySubject) return onlySubject.label;
    }
    // If only one level, auto-fill
    if (v.data_source === 'levels.name' && dbLevels.length === 1) {
      const onlyLevel = dbLevels[0];
      if (onlyLevel) return onlyLevel.label;
    }
    // Could auto-fill from RouterContext active sequence/session in future
    return null;
  }, [dbSubjects, dbLevels]);

  // ---- Load task details on selection ----
  const selectTask = useCallback(async (task: AITask) => {
    setSelectedTask(task);
    setResultContent(null);
    setResult(null);

    const [vars, prms] = await Promise.all([
      aiTaskService.getVariables(task.id),
      aiTaskService.getParams(task.id),
    ]);
    setTaskVariables(vars);
    setTaskParams(prms);

    // Auto-fill variables from context (mocked)
    const autoFilled: Record<string, string> = {};
    for (const v of vars) {
      const auto = autoFillVariable(v);
      if (auto) autoFilled[v.variable_code] = auto;
    }
    setVariableValues(autoFilled);

    // Reset params to defaults
    let defaults: Record<string, string> = {};
    try { defaults = JSON.parse(task.default_params || '{}'); } catch {}
    setParamValues(defaults);

    setUserInstructions('');
    setSelectedDocIds([]);
    setSelectedDocLabels({});
    setAdHocFiles([]);
    setDocSearch('');
  }, [autoFillVariable]);

  // ---- Group tasks by category ----
  const groupedTasks = useMemo(() => {
    const order = ['contenus', 'evaluations', 'planification', 'correction', 'systeme'];
    return order.map(cat => ({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      tasks: tasks.filter(t => t.category === cat),
    })).filter(g => g.tasks.length > 0);
  }, [tasks]);

  // ---- Render variable input ----
  function renderVariableInput(v: AITaskVariable) {
    const value = variableValues[v.variable_code] || '';

    // Smart rendering based on data_source
    if (v.data_source === 'subjects.name') {
      return (
        <select
          className="ia-gen__var-select"
          value={value}
          onChange={e => setVariableValues(prev => ({ ...prev, [v.variable_code]: e.target.value }))}
        >
          <option value="">-- Choisir --</option>
          {dbSubjects.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
        </select>
      );
    }

    if (v.data_source === 'levels.name') {
      return (
        <select
          className="ia-gen__var-select"
          value={value}
          onChange={e => setVariableValues(prev => ({ ...prev, [v.variable_code]: e.target.value }))}
        >
          <option value="">-- Choisir --</option>
          {dbLevels.map(l => <option key={l.id} value={l.label}>{l.label}</option>)}
        </select>
      );
    }

    if (v.data_source === 'sequences.title') {
      return (
        <select
          className="ia-gen__var-select"
          value={value}
          onChange={e => setVariableValues(prev => ({ ...prev, [v.variable_code]: e.target.value }))}
        >
          <option value="">-- Choisir --</option>
          {dbSequences.map(s => <option key={s.id} value={s.title}>{s.title}</option>)}
        </select>
      );
    }

    if (v.data_source === 'program_topics.title') {
      // For now, free text - could be a searchable dropdown later
      return (
        <textarea
          className="ia-gen__var-textarea"
          value={value}
          onChange={e => setVariableValues(prev => ({ ...prev, [v.variable_code]: e.target.value }))}
          rows={2}
          placeholder={v.variable_description || 'Titre du chapitre / thème'}
        />
      );
    }

    // Default: textarea for free text
    return (
      <textarea
        className="ia-gen__var-textarea"
        value={value}
        onChange={e => setVariableValues(prev => ({ ...prev, [v.variable_code]: e.target.value }))}
        rows={v.variable_code.includes('contenu') || v.variable_code.includes('content') ? 4 : 2}
        placeholder={v.variable_description || v.variable_label}
      />
    );
  }

  // ---- Handle ad-hoc file attachment ----
  const handleAdHocFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        let text = '';
        if (file.name.endsWith('.docx')) {
          const mammoth = await import('mammoth');
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
        } else {
          text = await file.text();
        }
        if (text.trim()) {
          setAdHocFiles(prev => [...prev, { name: file.name, text: text.trim() }]);
        } else {
          addToast('warn', `${file.name} : aucun texte extrait`);
        }
      } catch {
        addToast('error', `Impossible de lire ${file.name}`);
      }
    }
  };

  // ---- Generate ----
  const handleGenerate = async () => {
    if (!selectedTask) return;
    setGenerating(true);
    setResultContent(null);
    setResult(null);

    try {
      const res = await smartGenerate({
        taskCode: selectedTask.code,
        variables: variableValues,
        params: paramValues,
        userInstructions: userInstructions || undefined,
        subjectId: undefined,
        levelId: undefined,
        documentIds: selectedDocIds.length ? selectedDocIds : undefined,
        rawDocumentContexts: adHocFiles.length ? adHocFiles.map(f => f.text) : undefined,
      });

      if ('queued' in res && res.queued) {
        setResultContent('Requete ajoutee a la file d\'attente (hors-ligne). Elle sera traitee au retour de la connexion.');
        addToast('info', 'Requete IA mise en file d\'attente');
      } else {
        setResult(res);
        setResultContent(res.output_content || res.processed_result || '');
        addToast('success', 'Contenu généré avec succès');
      }
    } catch (err: any) {
      setResultContent('Erreur : ' + err.message);
      addToast('error', 'Erreur IA : ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ---- Actions on result ----
  const handleSaveToLibrary = async () => {
    if (!result?.id) return;
    try {
      await aiGenerationService.saveToLibrary(result.id, selectedTask?.label + ' - ' + new Date().toLocaleDateString());
      addToast('success', 'Sauvegarde dans la bibliothèque');
    } catch (e: any) {
      addToast('error', 'Erreur : ' + e.message);
    }
  };

  const handleCopy = () => {
    if (resultContent) {
      navigator.clipboard.writeText(resultContent);
      addToast('success', 'Copie dans le presse-papiers');
    }
  };

  const handleRate = async (rating: number) => {
    if (!result?.id) return;
    await aiGenerationService.rate(result.id, rating);
    addToast('success', 'Note enregistrée');
  };

  // ---- Aperçu du prompt assemblé ----
  const handlePreviewPrompt = async () => {
    if (!selectedTask) return;
    setPromptPreviewLoading(true);
    setShowPromptPreview(true);
    try {
      const assembled = await assemblePrompt({
        taskCode: selectedTask.code,
        variables: variableValues,
        params: paramValues,
        userInstructions: userInstructions || undefined,
        documentIds: selectedDocIds.length ? selectedDocIds : undefined,
        rawDocumentContexts: adHocFiles.length ? adHocFiles.map(f => f.text) : undefined,
      });
      setPromptPreview({ system: assembled.systemMessage, user: assembled.userMessage });
    } catch (err: any) {
      setPromptPreview({ system: '', user: 'Erreur : ' + err.message });
    } finally {
      setPromptPreviewLoading(false);
    }
  };

  // ---- Check if can generate ----
  const requiredVarsMissing = taskVariables
    .filter(v => v.is_required)
    .some(v => !variableValues[v.variable_code]?.trim());

  return (
    <div className="ia-gen">
      {/* Toggle generate / history / queue */}
      <div className="ia-gen__view-bar">
        <button
          className={'ia-gen__view-btn' + (view === 'generate' ? ' ia-gen__view-btn--active' : '')}
          onClick={() => { setView('generate'); setPage('ia-generer'); }}
        >
          Générer
        </button>
        <button
          className={'ia-gen__view-btn' + (view === 'history' ? ' ia-gen__view-btn--active' : '')}
          onClick={() => { setView('history'); setPage('ia-historique'); }}
        >
          Historique
        </button>
        <button
          className={'ia-gen__view-btn' + (view === 'queue' ? ' ia-gen__view-btn--active' : '')}
          onClick={() => { setView('queue'); setPage('ia-queue'); }}
        >
          File d'attente
          {queueCount > 0 && <span className="ia-gen__queue-badge">{queueCount}</span>}
        </button>
      </div>

      {view === 'generate' && (
        <div className="ia-gen__content">
          {/* Task selection grid */}
          <section className="ia-gen__section">
            <h2 className="ia-gen__section-title">Type de génération</h2>
            {groupedTasks.map(group => (
              <div key={group.category} className="ia-gen__task-group">
                <span className="ia-gen__task-group-label">{group.label}</span>
                <div className="ia-gen__task-grid">
                  {group.tasks.map(task => (
                    <button
                      key={task.id}
                      className={'ia-gen__task-card' + (selectedTask?.id === task.id ? ' ia-gen__task-card--active' : '')}
                      onClick={() => selectTask(task)}
                    >
                      <span className="ia-gen__task-icon">{task.icon}</span>
                      <span className="ia-gen__task-label">{task.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Variables + Params + Instructions */}
          {selectedTask && (
            <>
              <section className="ia-gen__section">
                <h2 className="ia-gen__section-title">Contexte pédagogique</h2>
                <p className="ia-gen__section-desc">
                  Les variables requises sont pré-remplies si un contexte est actif. Complétez ou modifiez-les ci-dessous.
                </p>

                <div className="ia-gen__vars-grid">
                  {taskVariables.map(v => (
                    <div
                      key={v.id}
                      className={'ia-gen__var-field' + (v.is_required ? ' ia-gen__var-field--required' : '')}
                    >
                      <label className="ia-gen__var-label">
                        {v.variable_label}
                        {v.is_required ? <span className="ia-gen__required-star"> *</span> : ''}
                        {variableValues[v.variable_code] && (
                          <Badge variant="success" className="ia-gen__var-filled">rempli</Badge>
                        )}
                      </label>
                      {renderVariableInput(v)}
                    </div>
                  ))}
                </div>
              </section>

              {/* Params */}
              {taskParams.length > 0 && (
                <section className="ia-gen__section">
                  <h2 className="ia-gen__section-title">Paramètres</h2>
                  <div className="ia-gen__params-grid">
                    {taskParams.map(p => (
                      <div key={p.id} className="ia-gen__param-field">
                        <label className="ia-gen__param-label">{p.param_label}</label>
                        {p.param_type === 'select' && (
                          <select
                            className="ia-gen__param-select"
                            value={paramValues[p.param_code] || p.default_value || ''}
                            onChange={e => setParamValues(prev => ({ ...prev, [p.param_code]: e.target.value }))}
                          >
                            {JSON.parse(p.param_options || '[]').map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {p.param_type === 'toggle' && (
                          <select
                            className="ia-gen__param-select"
                            value={paramValues[p.param_code] || p.default_value || 'non'}
                            onChange={e => setParamValues(prev => ({ ...prev, [p.param_code]: e.target.value }))}
                          >
                            <option value="oui">Oui</option>
                            <option value="non">Non</option>
                          </select>
                        )}
                        {p.param_type === 'number' && (
                          <input
                            type="number"
                            className="ia-gen__param-input"
                            value={paramValues[p.param_code] || p.default_value || ''}
                            onChange={e => setParamValues(prev => ({ ...prev, [p.param_code]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* User instructions (couche 3) - always visible */}
              <section className="ia-gen__section">
                <div className="ia-gen__section-title-row">
                  <h2 className="ia-gen__section-title">Consignes complémentaires</h2>
                  <VoiceInput
                    onResult={text => setUserInstructions(prev => prev ? prev + ' ' + text : text)}
                    disabled={generating}
                  />
                </div>
                <p className="ia-gen__section-desc">
                  Instructions libres ajoutées à cette génération uniquement. Non sauvegardées.
                </p>
                <textarea
                  className="ia-gen__instructions"
                  value={userInstructions}
                  onChange={e => setUserInstructions(e.target.value)}
                  rows={3}
                  placeholder="Ex: Centrer sur la crise de Cuba. Niveau accessible, 2h de cours. Inclure une chronologie."
                />
              </section>

              {/* Documents de référence */}
              <section className="ia-gen__section">
                <h2 className="ia-gen__section-title">Documents de référence</h2>
                <p className="ia-gen__section-desc">
                  Associez des documents de la bibliothèque ou joignez un fichier .txt/.docx pour que l'IA travaille à partir de leur contenu.
                </p>

                {/* Library search */}
                <div className="ia-gen__doc-search-row">
                  <input
                    className="ia-gen__doc-search-input"
                    type="text"
                    placeholder="Rechercher dans la bibliothèque…"
                    value={docSearch}
                    onChange={e => setDocSearch(e.target.value)}
                  />
                </div>
                {docResults.length > 0 && (
                  <div className="ia-gen__doc-results">
                    {docResults.map((doc: any) => {
                      const selected = selectedDocIds.includes(doc.id);
                      return (
                        <button
                          key={doc.id}
                          className={'ia-gen__doc-result-item' + (selected ? ' ia-gen__doc-result-item--selected' : '')}
                          onClick={() => {
                            if (selected) {
                              setSelectedDocIds(prev => prev.filter(id => id !== doc.id));
                              setSelectedDocLabels(prev => { const n = { ...prev }; delete n[doc.id]; return n; });
                            } else {
                              setSelectedDocIds(prev => [...prev, doc.id]);
                              setSelectedDocLabels(prev => ({ ...prev, [doc.id]: doc.title }));
                            }
                          }}
                          title={doc.extracted_text ? 'Texte extrait disponible' : 'Aucun texte extrait — importez via la bibliothèque'}
                        >
                          <span className="ia-gen__doc-result-icon">{doc.extracted_text ? '📄' : '⚠'}</span>
                          <span className="ia-gen__doc-result-title">{doc.title}</span>
                          {selected && <span className="ia-gen__doc-result-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected chips */}
                {selectedDocIds.length > 0 && (
                  <div className="ia-gen__doc-chips">
                    {selectedDocIds.map(id => (
                      <span key={id} className="ia-gen__doc-chip">
                        📄 {selectedDocLabels[id] || `Doc #${id}`}
                        <button
                          className="ia-gen__doc-chip-remove"
                          onClick={() => {
                            setSelectedDocIds(prev => prev.filter(d => d !== id));
                            setSelectedDocLabels(prev => { const n = { ...prev }; delete n[id]; return n; });
                          }}
                        >✕</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Ad-hoc file attachment */}
                <div className="ia-gen__doc-adhoc-row">
                  <label className="ia-gen__doc-adhoc-btn">
                    Joindre un fichier (.txt, .docx)
                    <input
                      type="file"
                      accept=".txt,.docx"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => void handleAdHocFiles(e.target.files)}
                    />
                  </label>
                  <span className="ia-gen__doc-adhoc-hint">Les PDF doivent d'abord être importés via la bibliothèque.</span>
                </div>
                {adHocFiles.length > 0 && (
                  <div className="ia-gen__doc-chips">
                    {adHocFiles.map((f, i) => (
                      <span key={i} className="ia-gen__doc-chip ia-gen__doc-chip--adhoc">
                        📎 {f.name}
                        <button
                          className="ia-gen__doc-chip-remove"
                          onClick={() => setAdHocFiles(prev => prev.filter((_, j) => j !== i))}
                        >✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Generate button */}
              <div className="ia-gen__generate-bar">
                <button
                  className="ia-gen__generate-btn"
                  onClick={handleGenerate}
                  disabled={generating || requiredVarsMissing}
                >
                  {generating ? 'Génération en cours…' : 'Générer'}
                </button>
                <button
                  className="ia-gen__preview-btn"
                  onClick={handlePreviewPrompt}
                  disabled={generating || requiredVarsMissing}
                  title="Voir le prompt qui sera envoyé à l'IA"
                >
                  Aperçu du prompt
                </button>
                {requiredVarsMissing && (
                  <span className="ia-gen__missing-warning">Complétez les variables requises (*)</span>
                )}
              </div>

              {/* Prompt preview panel */}
              {showPromptPreview && (
                <div className="ia-gen__prompt-preview">
                  <div className="ia-gen__prompt-preview-header">
                    <span className="ia-gen__prompt-preview-title">Prompt assemblé (aperçu)</span>
                    <button className="ia-gen__prompt-preview-close" onClick={() => setShowPromptPreview(false)}>✕</button>
                  </div>
                  {promptPreviewLoading ? (
                    <div className="ia-gen__loading" style={{ padding: '14px' }}>
                      <div className="ia-gen__spinner" />
                      <span>Assemblage du prompt...</span>
                    </div>
                  ) : promptPreview && (
                    <div className="ia-gen__prompt-preview-body">
                      {promptPreview.system && (
                        <div className="ia-gen__prompt-layer">
                          <span className="ia-gen__prompt-layer-label">Couche 1 — Système</span>
                          <pre className="ia-gen__prompt-layer-text ia-gen__prompt-layer-text--system">{promptPreview.system}</pre>
                        </div>
                      )}
                      <div className="ia-gen__prompt-layer">
                        <span className="ia-gen__prompt-layer-label">Couche 2+3 — Prompt utilisateur</span>
                        <pre className="ia-gen__prompt-layer-text">{promptPreview.user}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Result */}
          {(resultContent || generating) && (
            <section className="ia-gen__section">
              <h2 className="ia-gen__section-title">Résultat</h2>

              {generating && (
                <div className="ia-gen__loading">
                  <div className="ia-gen__spinner" />
                  <span>Génération en cours - 10-30 secondes...</span>
                </div>
              )}

              {resultContent && !generating && (
                <Card className="ia-gen__result-card">
                  <pre className="ia-gen__result-text">{resultContent}</pre>

                  <div className="ia-gen__result-actions">
                    <button className="ia-gen__result-btn ia-gen__result-btn--primary" onClick={handleSaveToLibrary}>
                      Sauvegarder en bibliothèque
                    </button>
                    <button className="ia-gen__result-btn" onClick={handleCopy}>
                      Copier
                    </button>
                    <button className="ia-gen__result-btn" onClick={handleGenerate}>
                      Régénérer
                    </button>
                    <div className="ia-gen__rating">
                      <span className="ia-gen__rating-label">Qualité :</span>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          className="ia-gen__star"
                          onClick={() => handleRate(n)}
                        >
                          {'⭐'}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </section>
          )}
        </div>
      )}

      {/* History */}
      {view === 'history' && (
        <div className="ia-gen__content">
          <section className="ia-gen__section">
            <h2 className="ia-gen__section-title">Historique des générations</h2>
            {history.length === 0 && (
              <p className="ia-gen__empty-history">Aucune génération pour le moment.</p>
            )}
            <div className="ia-gen__history-list">
              {history.map((item: any) => (
                <div key={item.id} className="ia-gen__history-item">
                  <div className="ia-gen__history-left">
                    <span className="ia-gen__history-icon">{item.task_icon || '🤖'}</span>
                    <div>
                      <span className="ia-gen__history-title">{item.task_label || 'Génération'}</span>
                      <div className="ia-gen__history-meta">
                        <Badge variant={item.task_category === 'contenus' ? 'info' : 'default'}>
                          {item.task_category || ''}
                        </Badge>
                        <span className="ia-gen__history-date">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        <Badge variant={item.status === 'completed' ? 'success' : item.status === 'failed' ? 'danger' : 'info'}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="ia-gen__history-right">
                    {item.rating && <span className="ia-gen__history-rating">{'⭐'.repeat(item.rating)}</span>}
                    {item.tokens_input > 0 && (
                      <span className="ia-gen__history-tokens">{item.tokens_input + item.tokens_output} tok</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
      {view === 'queue' && (
        <div className="ia-gen__content">
          <section className="ia-gen__section">
            <h2 className="ia-gen__section-title">
              File d'attente IA
              <span className="ia-gen__queue-count">{queueCount} en attente</span>
            </h2>

            <div className="ia-gen__queue-actions">
              <button
                className="ia-gen__queue-action-btn ia-gen__queue-action-btn--primary"
                disabled={queueCount === 0 || processingQueue}
                onClick={async () => {
                  setProcessingQueue(true);
                  try {
                    await aiQueueService.processQueue();
                    addToast('success', 'File traitée');
                  } catch { addToast('error', 'Erreur de traitement'); }
                  finally {
                    setProcessingQueue(false);
                    aiQueueService.getPending().then(setQueueItems).catch(() => {});
                    aiQueueService.pendingCount().then(setQueueCount).catch(() => {});
                  }
                }}
              >
                {processingQueue ? 'Traitement…' : 'Traiter la file'}
              </button>
              <button
                className="ia-gen__queue-action-btn"
                disabled={queueCount === 0}
                onClick={async () => {
                  if (!confirm('Vider toute la file d\'attente ?')) return;
                  await aiQueueService.clear();
                  setQueueItems([]);
                  setQueueCount(0);
                  addToast('success', 'File vidée');
                }}
              >
                Vider
              </button>
            </div>

            {queueItems.length === 0 ? (
              <div className="ia-gen__queue-empty">
                <span className="ia-gen__queue-empty-icon">✅</span>
                <p>Aucune requête en attente.</p>
                <p className="ia-gen__queue-empty-hint">
                  Les requêtes hors-ligne apparaîtront ici automatiquement.
                </p>
              </div>
            ) : (
              <div className="ia-gen__queue-list">
                {queueItems.map((item: any) => {
                  const payload = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
                  const statusMeta = AI_TASK_STATUS_META[item.status as keyof typeof AI_TASK_STATUS_META];
                  return (
                    <div key={item.id} className="ia-gen__queue-item">
                      <div className="ia-gen__queue-item-left">
                        <span
                          className="ia-gen__queue-status-dot"
                          style={{ background: statusMeta?.color ?? 'var(--color-text-muted)' }}
                        />
                        <div>
                          <span className="ia-gen__queue-item-type">{item.request_type}</span>
                          <span className="ia-gen__queue-item-meta">
                            {payload?.task_code || '-'} · Priorité {item.priority} · Essai {item.retry_count}/{item.max_retries}
                          </span>
                          {item.error_message && (
                            <span className="ia-gen__queue-item-error">⚠ {item.error_message}</span>
                          )}
                        </div>
                      </div>
                      <span className="ia-gen__queue-item-date">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

