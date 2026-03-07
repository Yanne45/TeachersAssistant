// ============================================================================
// GenerateurIAPage v2 — Interface de generation IA (spec 5.8)
// Branchee sur ai_tasks / ai_task_variables / ai_task_params
// Variables: auto-remplies si contexte dispo, dropdown sinon
// Consignes libres (couche 3): visibles en permanence
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Badge } from '../../components/ui';
import {
  aiTaskService, aiGenerationService, smartGenerate,
  subjectService, levelService, sequenceService, classService,
  aiQueueService,
} from '../../services';
import { useApp } from '../../stores';
import type { AITask, AITaskVariable, AITaskParam } from '../../services';
import type { Subject, Level } from '../../types';
import './GenerateurIAPage.css';

const CATEGORY_LABELS: Record<string, string> = {
  contenus: 'Contenus pedagogiques',
  evaluations: 'Evaluations',
  planification: 'Planification',
  correction: 'Correction & suivi',
  systeme: 'Systeme',
};

type SidebarView = 'generate' | 'history' | 'queue';

export const GenerateurIAPage: React.FC = () => {
  const { addToast } = useApp();

  // Navigation
  const [view, setView] = useState<SidebarView>('generate');

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

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [resultContent, setResultContent] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<any[]>([]);

  // Queue monitoring
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [processingQueue, setProcessingQueue] = useState(false);

  // ---- Load tasks + reference data ----
  useEffect(() => {
    aiTaskService.getAll().then(setTasks).catch(() => setTasks([]));
    subjectService.getAll().then(setDbSubjects).catch(() => setDbSubjects([]));
    levelService.getAll().then(setDbLevels).catch(() => setDbLevels([]));
    sequenceService.getByYear(1).then(setDbSequences).catch(() => setDbSequences([]));
    // Load queue count
    aiQueueService.pendingCount().then(setQueueCount).catch(() => {});
  }, []);

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
  }, []);

  // ---- Auto-fill logic using DB reference data ----
  function autoFillVariable(v: AITaskVariable): string | null {
    // If only one subject, auto-fill
    if (v.data_source === 'subjects.name' && dbSubjects.length === 1) {
      return dbSubjects[0].label;
    }
    // If only one level, auto-fill
    if (v.data_source === 'levels.name' && dbLevels.length === 1) {
      return dbLevels[0].label;
    }
    // Could auto-fill from RouterContext active sequence/session in future
    return null;
  }

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
      // For now, free text — could be a searchable dropdown later
      return (
        <textarea
          className="ia-gen__var-textarea"
          value={value}
          onChange={e => setVariableValues(prev => ({ ...prev, [v.variable_code]: e.target.value }))}
          rows={2}
          placeholder={v.variable_description || 'Titre du chapitre / theme'}
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
        subjectId: undefined, // TODO: resolve from variables
        levelId: undefined,
      });

      if ('queued' in res && res.queued) {
        setResultContent('Requete ajoutee a la file d\'attente (hors-ligne). Elle sera traitee au retour de la connexion.');
        addToast('info', 'Requete IA mise en file d\'attente');
      } else {
        setResult(res);
        setResultContent(res.output_content || res.processed_result || '');
        addToast('success', 'Contenu genere avec succes');
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
      addToast('success', 'Sauvegarde dans la bibliotheque');
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
    addToast('success', 'Note enregistree');
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
          onClick={() => setView('generate')}
        >
          Generer
        </button>
        <button
          className={'ia-gen__view-btn' + (view === 'history' ? ' ia-gen__view-btn--active' : '')}
          onClick={() => setView('history')}
        >
          Historique
        </button>
        <button
          className={'ia-gen__view-btn' + (view === 'queue' ? ' ia-gen__view-btn--active' : '')}
          onClick={() => setView('queue')}
        >
          File d'attente
          {queueCount > 0 && <span className="ia-gen__queue-badge">{queueCount}</span>}
        </button>
      </div>

      {view === 'generate' && (
        <div className="ia-gen__content">
          {/* Task selection grid */}
          <section className="ia-gen__section">
            <h2 className="ia-gen__section-title">Type de generation</h2>
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
                <h2 className="ia-gen__section-title">Contexte pedagogique</h2>
                <p className="ia-gen__section-desc">
                  Les variables requises sont pre-remplies si un contexte est actif. Completez ou modifiez-les ci-dessous.
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
                  <h2 className="ia-gen__section-title">Parametres</h2>
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

              {/* User instructions (couche 3) — always visible */}
              <section className="ia-gen__section">
                <h2 className="ia-gen__section-title">Consignes complementaires</h2>
                <p className="ia-gen__section-desc">
                  Instructions libres ajoutees a cette generation uniquement. Non sauvegardees.
                </p>
                <textarea
                  className="ia-gen__instructions"
                  value={userInstructions}
                  onChange={e => setUserInstructions(e.target.value)}
                  rows={3}
                  placeholder="Ex: Centrer sur la crise de Cuba. Niveau accessible, 2h de cours. Inclure une chronologie."
                />
              </section>

              {/* Generate button */}
              <div className="ia-gen__generate-bar">
                <button
                  className="ia-gen__generate-btn"
                  onClick={handleGenerate}
                  disabled={generating || requiredVarsMissing}
                >
                  {generating ? 'Generation en cours...' : 'Generer'}
                </button>
                {requiredVarsMissing && (
                  <span className="ia-gen__missing-warning">Completez les variables requises (*)</span>
                )}
              </div>
            </>
          )}

          {/* Result */}
          {(resultContent || generating) && (
            <section className="ia-gen__section">
              <h2 className="ia-gen__section-title">Resultat</h2>

              {generating && (
                <div className="ia-gen__loading">
                  <div className="ia-gen__spinner" />
                  <span>Generation en cours — 10-30 secondes...</span>
                </div>
              )}

              {resultContent && !generating && (
                <Card className="ia-gen__result-card">
                  <pre className="ia-gen__result-text">{resultContent}</pre>

                  <div className="ia-gen__result-actions">
                    <button className="ia-gen__result-btn ia-gen__result-btn--primary" onClick={handleSaveToLibrary}>
                      Sauvegarder en bibliotheque
                    </button>
                    <button className="ia-gen__result-btn" onClick={handleCopy}>
                      Copier
                    </button>
                    <button className="ia-gen__result-btn" onClick={handleGenerate}>
                      Regenerer
                    </button>
                    <div className="ia-gen__rating">
                      <span className="ia-gen__rating-label">Qualite :</span>
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
            <h2 className="ia-gen__section-title">Historique des generations</h2>
            {history.length === 0 && (
              <p className="ia-gen__empty-history">Aucune generation pour le moment.</p>
            )}
            <div className="ia-gen__history-list">
              {history.map((item: any) => (
                <div key={item.id} className="ia-gen__history-item">
                  <div className="ia-gen__history-left">
                    <span className="ia-gen__history-icon">{item.task_icon || '🤖'}</span>
                    <div>
                      <span className="ia-gen__history-title">{item.task_label || 'Generation'}</span>
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
                {processingQueue ? '⏳ Traitement…' : '▶ Traiter la file'}
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
                🗑 Vider
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
                  const statusColors: Record<string, string> = {
                    queued: 'var(--color-info)',
                    processing: 'var(--color-warn)',
                    error: 'var(--color-danger)',
                    completed: 'var(--color-success)',
                  };
                  return (
                    <div key={item.id} className="ia-gen__queue-item">
                      <div className="ia-gen__queue-item-left">
                        <span
                          className="ia-gen__queue-status-dot"
                          style={{ background: statusColors[item.status] || 'var(--color-text-muted)' }}
                        />
                        <div>
                          <span className="ia-gen__queue-item-type">{item.request_type}</span>
                          <span className="ia-gen__queue-item-meta">
                            {payload?.task_code || '—'} · Priorité {item.priority} · Essai {item.retry_count}/{item.max_retries}
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
