// ============================================================================
// AITemplateEditorPage — Parametres > IA > Templates
// Mode simple (guide) + mode avancé (éditeur complet avec {{variables}})
// + Création / duplication / suppression de tâches custom
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Badge } from '../../components/ui';
import { PromptVariablePicker } from '../../components/ui/PromptVariablePicker';
import { aiTaskService, aiSettingsService, getApiKey, setApiKey, ollamaService, PROVIDER_LABELS, PROVIDER_MODELS } from '../../services';
import type { AIProvider } from '../../services';
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

const CATEGORIES = CATEGORY_ORDER.map(c => ({ value: c, label: CATEGORY_LABELS[c] ?? c }));

interface NewTaskForm {
  label: string;
  code: string;
  category: string;
  icon: string;
  output_format: string;
  description: string;
}

const EMPTY_FORM: NewTaskForm = {
  label: '', code: '', category: 'contenus', icon: '✏', output_format: 'text', description: '',
};

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

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

  // New task form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<NewTaskForm>(EMPTY_FORM);
  const [newFormSaving, setNewFormSaving] = useState(false);

  // AI Settings
  const [aiProvider, setAiProvider] = useState<AIProvider>('openai');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [aiTemp, setAiTemp] = useState(0.7);
  const [aiMaxTokens, setAiMaxTokens] = useState(4096);
  const [localServerUrl, setLocalServerUrl] = useState('http://localhost:11434');

  // API Key (par provider)
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState('Stockée dans le keyring OS');

  // Ollama
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'online' | 'offline'>('idle');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaRefreshing, setOllamaRefreshing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const refreshTasks = useCallback(async () => {
    const all = await aiTaskService.getAll().catch(() => []);
    setTasks(all);
    return all;
  }, []);

  // --- Load tasks + settings ---
  useEffect(() => {
    refreshTasks();
    aiSettingsService.get().then(s => {
      if (s) {
        const prov = (s.provider as AIProvider) || 'openai';
        setAiProvider(prov);
        setAiModel(s.model || 'gpt-4o');
        setAiTemp(s.temperature ?? 0.7);
        setAiMaxTokens(s.max_tokens_per_request ?? 4096);
        setLocalServerUrl(s.local_server_url || 'http://localhost:11434');
      }
    }).catch(() => {});
  }, [refreshTasks]);

  // Reload API key hint when provider changes
  useEffect(() => {
    if (aiProvider === 'local') {
      setApiKeyStatus('');
      setApiKeyValue('');
      return;
    }
    setApiKeyValue('');
    setApiKeyStatus('');
    getApiKey(aiProvider).then(k => {
      setApiKeyValue('••••••••' + k.slice(-4));
      setApiKeyStatus('Clé configurée (' + k.slice(-4) + ')');
    }).catch(() => setApiKeyStatus('Aucune clé configurée'));
  }, [aiProvider]);

  const handleSaveApiKey = async () => {
    if (!apiKeyValue || apiKeyValue.startsWith('••')) {
      addToast('info', 'Saisissez une nouvelle clé API');
      return;
    }
    try {
      await setApiKey(apiKeyValue, aiProvider);
      setApiKeyStatus('Clé enregistrée (' + apiKeyValue.slice(-4) + ')');
      setApiKeyValue('••••••••' + apiKeyValue.slice(-4));
      setShowApiKey(false);
      addToast('success', 'Clé API enregistrée');
    } catch {
      addToast('error', 'Erreur de sauvegarde de la clé');
    }
  };

  // Ollama ping + model list
  const handleOllamaRefresh = useCallback(async () => {
    setOllamaRefreshing(true);
    const online = await ollamaService.ping(localServerUrl);
    setOllamaStatus(online ? 'online' : 'offline');
    if (online) {
      const models = await ollamaService.listModels(localServerUrl).catch((): string[] => []);
      setOllamaModels(models);
      const first = models[0];
      if (models.length > 0 && !models.includes(aiModel) && first) setAiModel(first);
    }
    setOllamaRefreshing(false);
  }, [localServerUrl, aiModel]);

  // Auto-ping when switching to local
  useEffect(() => {
    if (aiProvider === 'local') handleOllamaRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiProvider]);

  // --- Load task details ---
  const loadTaskDetails = useCallback(async (task: AITask) => {
    setSelectedTask(task);
    setShowNewForm(false);
    const [vars, prms, ut] = await Promise.all([
      aiTaskService.getVariables(task.id),
      aiTaskService.getParams(task.id),
      aiTaskService.getUserTemplate(task.id),
    ]);
    setVariables(vars);
    setParams(prms);
    setUserTemplate(ut);

    const tpl = (ut?.is_active && ut.template_content) ? ut.template_content : task.default_template;
    setTemplateDraft(tpl);

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
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + tag.length;
    }, 0);
  };

  // --- Save template ---
  const handleSave = async () => {
    if (!selectedTask) return;
    try {
      await aiTaskService.saveUserTemplate(
        selectedTask.id,
        templateDraft,
        JSON.stringify(paramOverrides)
      );
      setDirty(false);
      addToast('success', 'Template sauvegardé pour "' + selectedTask.label + '"');
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

  // --- Duplicate task ---
  const handleDuplicate = async (task: AITask) => {
    const newCode = slugify(task.label) + '_custom_' + Date.now().toString(36);
    const newLabel = 'Copie de ' + task.label;
    try {
      const newId = await aiTaskService.duplicateTask(task.id, newCode, newLabel);
      const all = await refreshTasks();
      const newTask = all.find(t => t.id === newId);
      if (newTask) loadTaskDetails(newTask);
      addToast('success', 'Tâche dupliquée : "' + newLabel + '"');
    } catch (e: any) {
      addToast('error', 'Erreur : ' + e.message);
    }
  };

  // --- Delete custom task ---
  const handleDelete = async () => {
    if (!selectedTask) return;
    if (!selectedTask.is_custom) return;
    if (!confirm('Supprimer la tâche "' + selectedTask.label + '" ? Cette action est irréversible.')) return;
    try {
      await aiTaskService.deleteTask(selectedTask.id);
      setSelectedTask(null);
      await refreshTasks();
      addToast('success', 'Tâche supprimée');
    } catch (e: any) {
      addToast('error', 'Erreur : ' + e.message);
    }
  };

  // --- Create new task ---
  const handleCreateTask = async () => {
    if (!newForm.label.trim()) {
      addToast('error', 'Le nom de la tâche est requis');
      return;
    }
    const code = newForm.code.trim() || slugify(newForm.label) + '_' + Date.now().toString(36);
    setNewFormSaving(true);
    try {
      const newId = await aiTaskService.createTask({
        code,
        label: newForm.label.trim(),
        description: newForm.description.trim(),
        category: newForm.category,
        icon: newForm.icon.trim() || '✏',
        system_prompt: '',
        default_template: '',
        output_format: newForm.output_format,
      });
      const all = await refreshTasks();
      const newTask = all.find(t => t.id === newId);
      if (newTask) loadTaskDetails(newTask);
      setNewForm(EMPTY_FORM);
      setShowNewForm(false);
      setAdvancedMode(true);
      addToast('success', 'Tâche créée — rédigez maintenant son template en mode avancé');
    } catch (e: any) {
      addToast('error', 'Erreur : ' + e.message);
    } finally {
      setNewFormSaving(false);
    }
  };

  // --- Save AI settings ---
  const handleSaveSettings = async () => {
    try {
      await aiSettingsService.update({
        provider: aiProvider,
        model: aiModel,
        temperature: aiTemp,
        max_tokens_per_request: aiMaxTokens,
        local_server_url: localServerUrl,
      });
      addToast('success', 'Paramètres IA sauvegardés');
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

  const renderParamField = (p: AITaskParam, overrideKey: 'simple' | 'advanced') => (
    <div key={p.id + overrideKey} className="ai-tpl-page__param">
      <label className="ai-tpl-page__param-label">
        {p.param_label}{overrideKey === 'advanced' && p.is_common ? ' (commun)' : ''}
      </label>
      {p.param_type === 'select' && (
        <select
          className="ai-tpl-page__param-select"
          value={paramOverrides[p.param_code] || p.default_value || ''}
          onChange={e => { setParamOverrides(prev => ({ ...prev, [p.param_code]: e.target.value })); setDirty(true); }}
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
          onChange={e => { setParamOverrides(prev => ({ ...prev, [p.param_code]: e.target.value })); setDirty(true); }}
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
          onChange={e => { setParamOverrides(prev => ({ ...prev, [p.param_code]: e.target.value })); setDirty(true); }}
        />
      )}
    </div>
  );

  return (
    <div className="ai-tpl-page">
      {/* Sidebar: task list */}
      <div className="ai-tpl-page__sidebar">
        <div className="ai-tpl-page__sidebar-header">
          <h2 className="ai-tpl-page__sidebar-title">Tâches IA</h2>
          <button
            className="ai-tpl-page__new-btn"
            onClick={() => { setShowNewForm(v => !v); setSelectedTask(null); }}
            title="Créer une tâche custom"
          >
            +
          </button>
        </div>

        {/* New task inline form */}
        {showNewForm && (
          <div className="ai-tpl-page__new-form">
            <input
              className="ai-tpl-page__new-input"
              placeholder="Nom de la tâche *"
              value={newForm.label}
              onChange={e => setNewForm(f => ({ ...f, label: e.target.value, code: slugify(e.target.value) }))}
            />
            <input
              className="ai-tpl-page__new-input"
              placeholder="Code (auto)"
              value={newForm.code}
              onChange={e => setNewForm(f => ({ ...f, code: e.target.value }))}
            />
            <div className="ai-tpl-page__new-row">
              <select
                className="ai-tpl-page__new-select"
                value={newForm.category}
                onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input
                className="ai-tpl-page__new-icon"
                placeholder="🤖"
                value={newForm.icon}
                onChange={e => setNewForm(f => ({ ...f, icon: e.target.value }))}
                maxLength={4}
              />
            </div>
            <select
              className="ai-tpl-page__new-select"
              value={newForm.output_format}
              onChange={e => setNewForm(f => ({ ...f, output_format: e.target.value }))}
            >
              <option value="text">Texte</option>
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
            </select>
            <div className="ai-tpl-page__new-actions">
              <button
                className="ai-tpl-page__new-confirm"
                onClick={handleCreateTask}
                disabled={newFormSaving || !newForm.label.trim()}
              >
                {newFormSaving ? '...' : 'Créer'}
              </button>
              <button className="ai-tpl-page__new-cancel" onClick={() => setShowNewForm(false)}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.category} className="ai-tpl-page__group">
            <div className="ai-tpl-page__group-label">{group.label}</div>
            {group.tasks.map(task => (
              <div key={task.id} className="ai-tpl-page__task-row">
                <button
                  className={'ai-tpl-page__task-item' + (selectedTask?.id === task.id ? ' ai-tpl-page__task-item--active' : '') + (task.is_custom ? ' ai-tpl-page__task-item--custom' : '')}
                  onClick={() => loadTaskDetails(task)}
                >
                  <span className="ai-tpl-page__task-icon">{task.icon}</span>
                  <span className="ai-tpl-page__task-label">{task.label}</span>
                </button>
                <button
                  className="ai-tpl-page__task-dup"
                  title="Dupliquer"
                  onClick={e => { e.stopPropagation(); handleDuplicate(task); }}
                >
                  ⧉
                </button>
              </div>
            ))}
          </div>
        ))}

        {/* AI Global settings at bottom */}
        <div className="ai-tpl-page__settings-section">
          <div className="ai-tpl-page__group-label">Paramètres globaux</div>

          {/* Provider */}
          <div className="ai-tpl-page__setting">
            <label className="ai-tpl-page__setting-label">Fournisseur</label>
            <select
              className="ai-tpl-page__setting-select"
              value={aiProvider}
              onChange={e => {
                const p = e.target.value as AIProvider;
                setAiProvider(p);
                const models = PROVIDER_MODELS[p];
                if (models.length > 0) setAiModel(models[0]?.value ?? '');
              }}
            >
              {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map(p => (
                <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
              ))}
            </select>
          </div>

          {/* Clé API (masquée pour local) */}
          {aiProvider !== 'local' && (
            <div className="ai-tpl-page__setting">
              <label className="ai-tpl-page__setting-label">Clé API</label>
              <div className="ai-tpl-page__apikey-row">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="ai-tpl-page__setting-input"
                  value={apiKeyValue}
                  onChange={e => setApiKeyValue(e.target.value)}
                  placeholder={aiProvider === 'mistral' ? 'Clé Mistral...' : 'sk-...'}
                />
                <button className="ai-tpl-page__apikey-toggle" onClick={() => setShowApiKey(v => !v)}>
                  {showApiKey ? '🙈' : '👁'}
                </button>
                <button className="ai-tpl-page__apikey-save" onClick={handleSaveApiKey}>✓</button>
              </div>
              {apiKeyStatus && <span className="ai-tpl-page__setting-hint">{apiKeyStatus}</span>}
            </div>
          )}

          {/* Config Ollama (local seulement) */}
          {aiProvider === 'local' && (
            <div className="ai-tpl-page__setting">
              <label className="ai-tpl-page__setting-label">Adresse du serveur</label>
              <div className="ai-tpl-page__apikey-row">
                <input
                  type="text"
                  className="ai-tpl-page__setting-input"
                  value={localServerUrl}
                  onChange={e => setLocalServerUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                />
                <button
                  className="ai-tpl-page__apikey-save"
                  onClick={handleOllamaRefresh}
                  disabled={ollamaRefreshing}
                  title="Ping + lister les modèles"
                >
                  {ollamaRefreshing ? '…' : '↺'}
                </button>
              </div>
              <span className="ai-tpl-page__ollama-status">
                <span
                  className={'ai-tpl-page__ollama-dot' +
                    (ollamaStatus === 'online' ? ' ai-tpl-page__ollama-dot--online' :
                     ollamaStatus === 'offline' ? ' ai-tpl-page__ollama-dot--offline' : '')}
                />
                {ollamaStatus === 'online' ? 'En ligne' :
                 ollamaStatus === 'offline' ? 'Hors ligne' : 'Non vérifié'}
              </span>
            </div>
          )}

          {/* Modèle */}
          <div className="ai-tpl-page__setting">
            <label className="ai-tpl-page__setting-label">Modèle</label>
            {aiProvider === 'local' ? (
              <div className="ai-tpl-page__local-model-row">
                <select
                  className="ai-tpl-page__setting-select"
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value)}
                  disabled={ollamaModels.length === 0}
                >
                  {ollamaModels.length === 0
                    ? <option value="">— Aucun modèle (cliquez ↺) —</option>
                    : ollamaModels.map(m => <option key={m} value={m}>{m}</option>)
                  }
                </select>
              </div>
            ) : (
              <select
                className="ai-tpl-page__setting-select"
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
              >
                {PROVIDER_MODELS[aiProvider].map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            )}
          </div>

          <div className="ai-tpl-page__setting">
            <label className="ai-tpl-page__setting-label">Température : {aiTemp}</label>
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
            <p style={{ marginTop: 8, fontSize: 12 }}>Utilisez <strong>+</strong> pour créer une tâche personnalisée, ou <strong>⧉</strong> pour dupliquer une tâche existante.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="ai-tpl-page__header">
              <div className="ai-tpl-page__header-left">
                <h2 className="ai-tpl-page__header-title">
                  {selectedTask.icon} {selectedTask.label}
                  {selectedTask.is_custom ? <span className="ai-tpl-page__custom-badge">Custom</span> : null}
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
                {selectedTask.is_custom && (
                  <button
                    className="ai-tpl-page__delete-btn"
                    onClick={handleDelete}
                    title="Supprimer cette tâche custom"
                  >
                    Supprimer
                  </button>
                )}
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
                    {params.map(p => renderParamField(p, 'simple'))}
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
                    {variables.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        Aucune variable définie. Passez en mode avancé pour écrire votre template.
                      </p>
                    )}
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
                    Modifiez le prompt directement. Cliquez sur une variable pour l'insérer à la position du curseur.
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
                    placeholder="Écrivez votre template ici. Utilisez {{variable}} pour insérer des variables contextuelles."
                  />
                </Card>

                <Card className="ai-tpl-page__card">
                  <h3 className="ai-tpl-page__card-title">Paramètres par défaut</h3>
                  <div className="ai-tpl-page__params-grid">
                    {params.map(p => renderParamField(p, 'advanced'))}
                    {params.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Aucun paramètre pour cette tâche.</p>
                    )}
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
              <button
                className="ai-tpl-page__btn ai-tpl-page__btn--secondary"
                onClick={() => handleDuplicate(selectedTask)}
                title="Dupliquer cette tâche comme base pour une nouvelle"
              >
                ⧉ Dupliquer
              </button>
              {dirty && <span className="ai-tpl-page__dirty-indicator">Modifications non sauvegardées</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
