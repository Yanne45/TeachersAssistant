// ============================================================================
// AITemplateEditorPage — Parametres > IA > Templates
// Mode simple (guide) + mode avancé (éditeur complet avec {{variables}})
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Badge } from '../../components/ui';
import { PromptVariablePicker } from '../../components/ui/PromptVariablePicker';
import { aiTaskService, aiSettingsService, getApiKey, setApiKey } from '../../services';
import { useApp } from '../../stores';
import type { AITask, AITaskVariable, AITaskParam, AIUserTemplate } from '../../services';
import './AITemplateEditorPage.css';

const CATEGORY_LABELS: Record<string, string> = {
  contenus: 'Contenus',
  evaluations: 'Évaluations',
  planification: 'Planification',
  correction: 'Correction',
  systeme: 'Système',
};

const CATEGORY_ORDER = ['contenus', 'evaluations', 'planification', 'correction', 'systeme'];

export const AITemplateEditorPage: React.FC = () => {
  const { addToast } = useApp();

  // --- State ---
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AITask | null>(null);
  const [variables, setVariables] = useState<AITaskVariable[]>([]);
  const [params, setParams] = useState<AITaskParam[]>([]);
  const [userTemplate, setUserTemplate] = useState<AIUserTemplate | null>(null);

  const [advancedMode, setAdvancedMode] = useState(false);
  const [templateDraft, setTemplateDraft] = useState('');
  const [paramOverrides, setParamOverrides] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  // AI Settings
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [aiTemp, setAiTemp] = useState(0.7);
  const [aiMaxTokens, setAiMaxTokens] = useState(4096);

  // API Key
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState('Stockée dans le keyring OS');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Load tasks + check API key ---
  useEffect(() => {
    aiTaskService.getAll().then(setTasks).catch(() => setTasks([]));
    aiSettingsService.get().then(s => {
      if (s) {
        setAiModel(s.model || 'gpt-4o');
        setAiTemp(s.temperature ?? 0.7);
        setAiMaxTokens(s.max_tokens_per_request ?? 4096);
      }
    }).catch(() => {});
    // Check if key exists
    getApiKey().then((k: string | null) => {
      if (k) {
        setApiKeyValue('••••••••' + k.slice(-4));
        setApiKeyStatus('Clé configurée (' + k.slice(-4) + ')');
      } else {
        setApiKeyStatus('Aucune clé configurée');
      }
    }).catch(() => {});
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKeyValue || apiKeyValue.startsWith('••')) {
      addToast('info', 'Saisissez une nouvelle clé API');
      return;
    }
    try {
      await setApiKey(apiKeyValue);
      setApiKeyStatus('Clé enregistrée (' + apiKeyValue.slice(-4) + ')');
      setApiKeyValue('••••••••' + apiKeyValue.slice(-4));
      setShowApiKey(false);
      addToast('success', 'Clé API enregistrée');
    } catch {
      addToast('error', 'Erreur de sauvegarde de la clé');
    }
  };

  // --- Load task details ---
  const loadTaskDetails = useCallback(async (task: AITask) => {
    setSelectedTask(task);
    const [vars, prms, ut] = await Promise.all([
      aiTaskService.getVariables(task.id),
      aiTaskService.getParams(task.id),
      aiTaskService.getUserTemplate(task.id),
    ]);
    setVariables(vars);
    setParams(prms);
    setUserTemplate(ut);

    // Init draft from user template or default
    const tpl = (ut?.is_active && ut.template_content) ? ut.template_content : task.default_template;
    setTemplateDraft(tpl);

    // Init param overrides
    let overrides: Record<string, string> = {};
    try { overrides = JSON.parse(ut?.default_params_override || '{}'); } catch {}
    setParamOverrides(overrides);
    setDirty(false);
  }, []);

  // --- Insert variable at cursor ---
  const handleInsertVariable = (code: string) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const tag = '{{' + code + '}}';
    const newVal = templateDraft.substring(0, start) + tag + templateDraft.substring(end);
    setTemplateDraft(newVal);
    setDirty(true);
    // Restore focus
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + tag.length;
    }, 0);
  };

  // --- Save ---
  const handleSave = async () => {
    if (!selectedTask) return;
    try {
      await aiTaskService.saveUserTemplate(
        selectedTask.id,
        templateDraft,
        JSON.stringify(paramOverrides)
      );
      setDirty(false);
      addToast('success', 'Template sauvegarde pour "' + selectedTask.label + '"');
      // Refresh
      const ut = await aiTaskService.getUserTemplate(selectedTask.id);
      setUserTemplate(ut);
    } catch (e: any) {
      addToast('error', 'Erreur : ' + e.message);
    }
  };

  // --- Reset to default ---
  const handleReset = async () => {
    if (!selectedTask) return;
    await aiTaskService.resetUserTemplate(selectedTask.id);
    setTemplateDraft(selectedTask.default_template);
    setParamOverrides({});
    setUserTemplate(null);
    setDirty(false);
    addToast('info', 'Template réinitialisé au défaut');
  };

  // --- Save AI settings ---
  const handleSaveSettings = async () => {
    try {
      await aiSettingsService.update({
        model: aiModel,
        temperature: aiTemp,
        max_tokens_per_request: aiMaxTokens,
      });
      addToast('success', 'Parametres IA sauvegardes');
    } catch (e: any) {
      addToast('error', 'Erreur : ' + e.message);
    }
  };

  // --- Group tasks by category ---
  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat] || cat,
    tasks: tasks.filter(t => t.category === cat),
  })).filter(g => g.tasks.length > 0);

  return (
    <div className="ai-tpl-page">
      {/* Sidebar: task list */}
      <div className="ai-tpl-page__sidebar">
        <h2 className="ai-tpl-page__sidebar-title">Tâches IA</h2>

        {grouped.map(group => (
          <div key={group.category} className="ai-tpl-page__group">
            <div className="ai-tpl-page__group-label">{group.label}</div>
            {group.tasks.map(task => (
              <button
                key={task.id}
                className={'ai-tpl-page__task-item' + (selectedTask?.id === task.id ? ' ai-tpl-page__task-item--active' : '')}
                onClick={() => loadTaskDetails(task)}
              >
                <span className="ai-tpl-page__task-icon">{task.icon}</span>
                <span className="ai-tpl-page__task-label">{task.label}</span>
              </button>
            ))}
          </div>
        ))}

        {/* AI Global settings at bottom */}
        <div className="ai-tpl-page__settings-section">
          <div className="ai-tpl-page__group-label">Paramètres globaux</div>

          <div className="ai-tpl-page__setting">
            <label className="ai-tpl-page__setting-label">Clé API</label>
            <div className="ai-tpl-page__apikey-row">
              <input
                type={showApiKey ? 'text' : 'password'}
                className="ai-tpl-page__setting-input"
                value={apiKeyValue}
                onChange={e => setApiKeyValue(e.target.value)}
                placeholder="sk-..."
              />
              <button
                className="ai-tpl-page__apikey-toggle"
                onClick={() => setShowApiKey(v => !v)}
                title={showApiKey ? 'Masquer' : 'Afficher'}
              >
                {showApiKey ? '🙈' : '👁'}
              </button>
              <button
                className="ai-tpl-page__apikey-save"
                onClick={handleSaveApiKey}
              >
                ✓
              </button>
            </div>
            <span className="ai-tpl-page__setting-hint">
              {apiKeyStatus}
            </span>
          </div>

          <div className="ai-tpl-page__setting">
            <label className="ai-tpl-page__setting-label">Modèle</label>
            <select
              className="ai-tpl-page__setting-select"
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o mini</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
            </select>
          </div>

          <div className="ai-tpl-page__setting">
            <label className="ai-tpl-page__setting-label">Temperature : {aiTemp}</label>
            <input
              type="range" min="0" max="1" step="0.1"
              value={aiTemp}
              onChange={e => setAiTemp(parseFloat(e.target.value))}
              className="ai-tpl-page__setting-range"
            />
          </div>

          <div className="ai-tpl-page__setting">
            <label className="ai-tpl-page__setting-label">Max tokens</label>
            <input
              type="number" min={256} max={16384} step={256}
              value={aiMaxTokens}
              onChange={e => setAiMaxTokens(parseInt(e.target.value) || 4096)}
              className="ai-tpl-page__setting-input"
            />
          </div>

          <button className="ai-tpl-page__save-settings" onClick={handleSaveSettings}>
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Main content: editor */}
      <div className="ai-tpl-page__main">
        {!selectedTask ? (
          <div className="ai-tpl-page__empty">
            <span className="ai-tpl-page__empty-icon">🤖</span>
            <p>Sélectionnez une tâche IA dans la liste pour personnaliser son template de prompt.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="ai-tpl-page__header">
              <div className="ai-tpl-page__header-left">
                <h2 className="ai-tpl-page__header-title">
                  {selectedTask.icon} {selectedTask.label}
                </h2>
                <p className="ai-tpl-page__header-desc">{selectedTask.description}</p>
                <div className="ai-tpl-page__header-badges">
                  <Badge variant="info">{selectedTask.output_format}</Badge>
                  <Badge variant={userTemplate?.is_active ? 'success' : 'info'}>
                    {userTemplate?.is_active ? 'Template personnalisé' : 'Template par défaut'}
                  </Badge>
                </div>
              </div>
              <div className="ai-tpl-page__header-right">
                <label className="ai-tpl-page__mode-toggle">
                  <input
                    type="checkbox"
                    checked={advancedMode}
                    onChange={e => setAdvancedMode(e.target.checked)}
                  />
                  <span>Mode avancé</span>
                </label>
              </div>
            </div>

            {/* Simple mode */}
            {!advancedMode && (
              <div className="ai-tpl-page__simple">
                <Card className="ai-tpl-page__card">
                  <h3 className="ai-tpl-page__card-title">Paramètres par défaut</h3>
                  <p className="ai-tpl-page__card-desc">
                    Ces valeurs seront utilisées à chaque fois que vous lancez cette tâche.
                    Vous pourrez les modifier ponctuellement dans le Générateur IA.
                  </p>

                  <div className="ai-tpl-page__params-grid">
                    {params.map(p => (
                      <div key={p.id} className="ai-tpl-page__param">
                        <label className="ai-tpl-page__param-label">{p.param_label}</label>
                        {p.param_type === 'select' && (
                          <select
                            className="ai-tpl-page__param-select"
                            value={paramOverrides[p.param_code] || p.default_value || ''}
                            onChange={e => {
                              setParamOverrides(prev => ({ ...prev, [p.param_code]: e.target.value }));
                              setDirty(true);
                            }}
                          >
                            {JSON.parse(p.param_options || '[]').map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {p.param_type === 'toggle' && (
                          <select
                            className="ai-tpl-page__param-select"
                            value={paramOverrides[p.param_code] || p.default_value || 'non'}
                            onChange={e => {
                              setParamOverrides(prev => ({ ...prev, [p.param_code]: e.target.value }));
                              setDirty(true);
                            }}
                          >
                            <option value="oui">Oui</option>
                            <option value="non">Non</option>
                          </select>
                        )}
                        {p.param_type === 'number' && (
                          <input
                            type="number"
                            className="ai-tpl-page__param-input"
                            value={paramOverrides[p.param_code] || p.default_value || ''}
                            onChange={e => {
                              setParamOverrides(prev => ({ ...prev, [p.param_code]: e.target.value }));
                              setDirty(true);
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="ai-tpl-page__card">
                  <h3 className="ai-tpl-page__card-title">Variables contextuelles</h3>
                  <p className="ai-tpl-page__card-desc">
                    Ces variables seront automatiquement remplies par le contexte de la séquence ou séance active.
                  </p>
                  <div className="ai-tpl-page__vars-list">
                    {variables.map(v => (
                      <div key={v.id} className="ai-tpl-page__var-row">
                        <code className="ai-tpl-page__var-code">{'{{' + v.variable_code + '}}'}</code>
                        <span className="ai-tpl-page__var-label">{v.variable_label}</span>
                        <span className="ai-tpl-page__var-source">{v.data_source}</span>
                        {v.is_required ? (
                          <Badge variant="warn">Requise</Badge>
                        ) : (
                          <Badge variant="info">Optionnelle</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Advanced mode */}
            {advancedMode && (
              <div className="ai-tpl-page__advanced">
                <Card className="ai-tpl-page__card">
                  <h3 className="ai-tpl-page__card-title">Éditeur de template</h3>
                  <p className="ai-tpl-page__card-desc">
                    Modifiez le prompt directement. Cliquez sur une variable pour l'inserer a la position du curseur.
                  </p>

                  <PromptVariablePicker
                    variables={variables}
                    onInsert={handleInsertVariable}
                  />

                  <textarea
                    ref={textareaRef}
                    className="ai-tpl-page__editor"
                    value={templateDraft}
                    onChange={e => { setTemplateDraft(e.target.value); setDirty(true); }}
                    rows={16}
                    spellCheck={false}
                    placeholder="Ecrivez votre template ici. Utilisez {{variable}} pour inserer des variables contextuelles."
                  />
                </Card>

                {/* Params in advanced mode too */}
                <Card className="ai-tpl-page__card">
                  <h3 className="ai-tpl-page__card-title">Paramètres par défaut</h3>
                  <div className="ai-tpl-page__params-grid">
                    {params.map(p => (
                      <div key={p.id} className="ai-tpl-page__param">
                        <label className="ai-tpl-page__param-label">
                          {p.param_label}
                          {p.is_common ? ' (commun)' : ''}
                        </label>
                        {p.param_type === 'select' && (
                          <select
                            className="ai-tpl-page__param-select"
                            value={paramOverrides[p.param_code] || p.default_value || ''}
                            onChange={e => {
                              setParamOverrides(prev => ({ ...prev, [p.param_code]: e.target.value }));
                              setDirty(true);
                            }}
                          >
                            {JSON.parse(p.param_options || '[]').map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {p.param_type === 'toggle' && (
                          <select
                            className="ai-tpl-page__param-select"
                            value={paramOverrides[p.param_code] || p.default_value || 'non'}
                            onChange={e => {
                              setParamOverrides(prev => ({ ...prev, [p.param_code]: e.target.value }));
                              setDirty(true);
                            }}
                          >
                            <option value="oui">Oui</option>
                            <option value="non">Non</option>
                          </select>
                        )}
                        {p.param_type === 'number' && (
                          <input
                            type="number"
                            className="ai-tpl-page__param-input"
                            value={paramOverrides[p.param_code] || p.default_value || ''}
                            onChange={e => {
                              setParamOverrides(prev => ({ ...prev, [p.param_code]: e.target.value }));
                              setDirty(true);
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Actions bar */}
            <div className="ai-tpl-page__actions">
              <button
                className="ai-tpl-page__btn ai-tpl-page__btn--primary"
                onClick={handleSave}
                disabled={!dirty}
              >
                Sauvegarder
              </button>
              <button
                className="ai-tpl-page__btn ai-tpl-page__btn--secondary"
                onClick={handleReset}
              >
                Réinitialiser au défaut
              </button>
              {dirty && <span className="ai-tpl-page__dirty-indicator">Modifications non sauvegardées</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
