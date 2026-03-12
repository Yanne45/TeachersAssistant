// ============================================================================
// Teacher Assistant — Service IA (v2) — Architecture 3 couches
// Couche 1: system_prompt | Couche 2: template {{variables}} | Couche 3: user_instructions
// ============================================================================

import { db } from './db';
import type { ID } from '../types';

// === TYPES ===

export interface AITask {
  id: ID; code: string; label: string; description: string;
  category: string; icon: string; system_prompt: string; default_template: string;
  output_format: string; default_params: string; is_active: number; sort_order: number;
  is_custom: number;
}

export interface AITaskVariable {
  id: ID; task_id: ID; variable_code: string; variable_label: string;
  variable_description: string; data_source: string; is_required: number; sort_order: number;
}

export interface AITaskParam {
  id: ID; task_id: ID; param_code: string; param_label: string;
  param_type: string; param_options: string; default_value: string;
  injection_template: string; sort_order: number; is_common: number;
}

export interface AIUserTemplate {
  id: ID; task_id: ID; template_content: string;
  default_params_override: string; is_active: number;
}

export interface AIGenerationRequest {
  taskCode: string;
  variables: Record<string, string>;
  params?: Record<string, string>;
  userInstructions?: string;
  contextEntityType?: string;
  contextEntityId?: ID;
  subjectId?: ID;
  levelId?: ID;
  sequenceId?: ID;
  sessionId?: ID;
  documentIds?: ID[];
  /** Texte brut extrait de fichiers joints ad-hoc (non enregistrés dans la bibliothèque) */
  rawDocumentContexts?: string[];
}

export interface CorrectionAIResult {
  skills: Array<{ skill_name: string; level: number; comment: string }>;
  strengths: string[];
  weaknesses: string[];
  general_comment: string;
  suggested_score?: number;
}

// ── Multimodal support ──

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type MessageContent = string | ContentPart[];

/** Convert a local file path to a base64 data URL for vision APIs */
export async function filePathToBase64DataUrl(filePath: string): Promise<string> {
  const { readFile } = await import('@tauri-apps/plugin-fs');
  const bytes = await readFile(filePath);
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const mime = ext === 'png' ? 'image/png'
    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : ext === 'gif' ? 'image/gif'
    : ext === 'webp' ? 'image/webp'
    : 'application/octet-stream';
  const base64 = btoa(String.fromCharCode(...bytes));
  return `data:${mime};base64,${base64}`;
}

/** Check if a file extension is an image type */
export function isImageFile(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
}

// === AI SETTINGS ===

export const aiSettingsService = {
  async get() {
    return db.selectOne<any>("SELECT * FROM ai_settings LIMIT 1");
  },
  async update(fields: Record<string, any>): Promise<void> {
    const keys = Object.keys(fields);
    const sets = keys.map(k => k + " = ?").join(", ");
    await db.execute(
      "UPDATE ai_settings SET " + sets + ", updated_at = datetime('now')",
      keys.map(k => fields[k])
    );
  },
};

// === AI TASK CATALOG ===

export const aiTaskService = {
  async getAll(): Promise<AITask[]> {
    return db.select("SELECT * FROM ai_tasks WHERE is_active = 1 ORDER BY sort_order");
  },
  async getByCategory(category: string): Promise<AITask[]> {
    return db.select("SELECT * FROM ai_tasks WHERE is_active = 1 AND category = ? ORDER BY sort_order", [category]);
  },
  async getByCode(code: string): Promise<AITask | null> {
    return db.selectOne("SELECT * FROM ai_tasks WHERE code = ?", [code]);
  },
  async getVariables(taskId: ID): Promise<AITaskVariable[]> {
    return db.select("SELECT * FROM ai_task_variables WHERE task_id = ? ORDER BY sort_order", [taskId]);
  },
  async getParams(taskId: ID): Promise<AITaskParam[]> {
    return db.select("SELECT * FROM ai_task_params WHERE task_id = ? ORDER BY is_common DESC, sort_order", [taskId]);
  },
  async getUserTemplate(taskId: ID): Promise<AIUserTemplate | null> {
    return db.selectOne("SELECT * FROM ai_task_user_templates WHERE task_id = ? AND is_active = 1", [taskId]);
  },
  async saveUserTemplate(taskId: ID, content: string, paramsOverride?: string): Promise<ID> {
    const existing = await this.getUserTemplate(taskId);
    if (existing) {
      await db.execute(
        "UPDATE ai_task_user_templates SET template_content = ?, default_params_override = ?, updated_at = datetime('now') WHERE id = ?",
        [content, paramsOverride || "{}", existing.id]
      );
      return existing.id;
    }
    return db.insert(
      "INSERT INTO ai_task_user_templates (task_id, template_content, default_params_override) VALUES (?, ?, ?)",
      [taskId, content, paramsOverride || "{}"]
    );
  },
  async resetUserTemplate(taskId: ID): Promise<void> {
    await db.execute("UPDATE ai_task_user_templates SET is_active = 0, updated_at = datetime('now') WHERE task_id = ?", [taskId]);
  },
  async updateSystemPrompt(code: string, prompt: string): Promise<void> {
    await db.execute("UPDATE ai_tasks SET system_prompt = ?, updated_at = datetime('now') WHERE code = ?", [prompt, code]);
  },
  async updateDefaultTemplate(code: string, template: string): Promise<void> {
    await db.execute("UPDATE ai_tasks SET default_template = ?, updated_at = datetime('now') WHERE code = ?", [template, code]);
  },
  async createTask(data: {
    code: string; label: string; description: string;
    category: string; icon: string; system_prompt: string;
    default_template: string; output_format: string;
  }): Promise<ID> {
    return db.insert(
      "INSERT INTO ai_tasks (code, label, description, category, icon, system_prompt, default_template, output_format, is_custom, sort_order) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM ai_tasks))",
      [data.code, data.label, data.description || '', data.category, data.icon || '✏', data.system_prompt || '', data.default_template || '', data.output_format || 'text']
    );
  },
  async duplicateTask(sourceId: ID, newCode: string, newLabel: string): Promise<ID> {
    const source = await db.selectOne<AITask>("SELECT * FROM ai_tasks WHERE id = ?", [sourceId]);
    if (!source) throw new Error("Tâche source introuvable");
    const newId = await db.insert(
      "INSERT INTO ai_tasks (code, label, description, category, icon, system_prompt, default_template, output_format, default_params, is_custom, sort_order) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
      [newCode, newLabel, source.description || '', source.category, source.icon, source.system_prompt, source.default_template, source.output_format, source.default_params || '{}', source.sort_order + 1]
    );
    const vars = await db.select<AITaskVariable[]>("SELECT * FROM ai_task_variables WHERE task_id = ?", [sourceId]);
    for (const v of vars) {
      await db.insert(
        "INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [newId, v.variable_code, v.variable_label, v.variable_description, v.data_source, v.is_required, v.sort_order]
      );
    }
    const params = await db.select<AITaskParam[]>("SELECT * FROM ai_task_params WHERE task_id = ?", [sourceId]);
    for (const p of params) {
      await db.insert(
        "INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [newId, p.param_code, p.param_label, p.param_type, p.param_options, p.default_value, p.injection_template, p.sort_order, p.is_common]
      );
    }
    return newId;
  },
  async deleteTask(taskId: ID): Promise<void> {
    const task = await db.selectOne<AITask>("SELECT * FROM ai_tasks WHERE id = ?", [taskId]);
    if (!task) throw new Error("Tâche introuvable");
    if (!task.is_custom) throw new Error("Impossible de supprimer une tâche système");
    await db.execute("DELETE FROM ai_tasks WHERE id = ?", [taskId]);
  },
};

// === AI USAGE & COST SERVICE ===

export type AIProvider = 'openai' | 'mistral' | 'anthropic' | 'local';

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai:    'OpenAI',
  mistral:   'Mistral AI',
  anthropic: 'Anthropic (Claude)',
  local:     'Serveur local (Ollama)',
};

export const PROVIDER_MODELS: Record<AIProvider, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o',       label: 'GPT-4o' },
    { value: 'gpt-4o-mini',  label: 'GPT-4o mini' },
    { value: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
  ],
  mistral: [
    { value: 'mistral-large-latest', label: 'Mistral Large' },
    { value: 'mistral-small-latest', label: 'Mistral Small' },
    { value: 'open-mistral-7b',      label: 'Mistral 7B (open)' },
    { value: 'open-mixtral-8x7b',    label: 'Mixtral 8x7B' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    { value: 'claude-opus-4-6',            label: 'Claude Opus 4.6' },
  ],
  local: [], // dynamique via Ollama /api/tags
};

export const PROVIDER_ENDPOINTS: Record<Exclude<AIProvider, 'local'>, string> = {
  openai:    'https://api.openai.com/v1/chat/completions',
  mistral:   'https://api.mistral.ai/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
};

/** Tarifs en $/million de tokens (mars 2025) */
export const MODEL_PRICING: Record<string, { input: number; output: number; label: string; provider: string }> = {
  'gpt-4o':                     { input: 2.50,  output: 10.00, label: 'GPT-4o',            provider: 'openai' },
  'gpt-4o-mini':                { input: 0.15,  output: 0.60,  label: 'GPT-4o mini',       provider: 'openai' },
  'gpt-4-turbo':                { input: 10.00, output: 30.00, label: 'GPT-4 Turbo',       provider: 'openai' },
  'claude-sonnet-4-5-20250929': { input: 3.00,  output: 15.00, label: 'Claude Sonnet 4.5', provider: 'anthropic' },
  'claude-opus-4-6':            { input: 15.00, output: 75.00, label: 'Claude Opus 4.6',   provider: 'anthropic' },
  'mistral-large-latest':       { input: 3.00,  output: 9.00,  label: 'Mistral Large',     provider: 'mistral' },
  'mistral-small-latest':       { input: 0.20,  output: 0.60,  label: 'Mistral Small',     provider: 'mistral' },
  'open-mistral-7b':            { input: 0.25,  output: 0.25,  label: 'Mistral 7B (open)', provider: 'mistral' },
  'open-mixtral-8x7b':          { input: 0.70,  output: 0.70,  label: 'Mixtral 8x7B',      provider: 'mistral' },
};

export function estimateCost(tokensIn: number, tokensOut: number, model: string): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (tokensIn / 1_000_000) * pricing.input + (tokensOut / 1_000_000) * pricing.output;
}

export interface UsageByModel  { model: string; tokens_input: number; tokens_output: number; count: number; }
export interface UsageByCategory { category: string; tokens_input: number; tokens_output: number; count: number; }
export interface UsageByMonth  { month: string; tokens_input: number; tokens_output: number; count: number; }
export interface RecentGenUsage {
  id: ID; task_label: string; task_icon: string; category: string;
  model: string; tokens_input: number; tokens_output: number; status: string; created_at: string;
}

export const aiUsageService = {
  async byModel(): Promise<UsageByModel[]> {
    return db.select<UsageByModel[]>(
      "SELECT model, SUM(tokens_input) as tokens_input, SUM(tokens_output) as tokens_output, COUNT(*) as count " +
      "FROM ai_generations WHERE status = 'completed' AND model IS NOT NULL GROUP BY model ORDER BY count DESC"
    );
  },
  async byCategory(): Promise<UsageByCategory[]> {
    return db.select<UsageByCategory[]>(
      "SELECT at.category, SUM(ag.tokens_input) as tokens_input, SUM(ag.tokens_output) as tokens_output, COUNT(*) as count " +
      "FROM ai_generations ag JOIN ai_tasks at ON ag.task_id = at.id " +
      "WHERE ag.status = 'completed' GROUP BY at.category ORDER BY count DESC"
    );
  },
  async byMonth(limit = 6): Promise<UsageByMonth[]> {
    return db.select<UsageByMonth[]>(
      "SELECT strftime('%Y-%m', created_at) as month, SUM(tokens_input) as tokens_input, SUM(tokens_output) as tokens_output, COUNT(*) as count " +
      "FROM ai_generations WHERE status = 'completed' GROUP BY month ORDER BY month DESC LIMIT ?",
      [limit]
    );
  },
  async recent(limit = 20): Promise<RecentGenUsage[]> {
    return db.select<RecentGenUsage[]>(
      "SELECT ag.id, COALESCE(at.label, 'Tâche inconnue') as task_label, COALESCE(at.icon, '🤖') as task_icon, " +
      "COALESCE(at.category, '') as category, COALESCE(ag.model, '') as model, " +
      "ag.tokens_input, ag.tokens_output, ag.status, ag.created_at " +
      "FROM ai_generations ag LEFT JOIN ai_tasks at ON ag.task_id = at.id " +
      "WHERE ag.status = 'completed' ORDER BY ag.created_at DESC LIMIT ?",
      [limit]
    );
  },
  async totalsThisMonth(): Promise<{ tokens_input: number; tokens_output: number; count: number }> {
    const month = new Date().toISOString().slice(0, 7);
    const row = await db.selectOne<{ ti: number; to_: number; cnt: number }>(
      "SELECT SUM(tokens_input) as ti, SUM(tokens_output) as to_, COUNT(*) as cnt " +
      "FROM ai_generations WHERE status = 'completed' AND strftime('%Y-%m', created_at) = ?",
      [month]
    );
    return { tokens_input: row?.ti ?? 0, tokens_output: row?.to_ ?? 0, count: row?.cnt ?? 0 };
  },
};

// === PROMPT ASSEMBLER ===

export async function assemblePrompt(request: AIGenerationRequest): Promise<{
  systemMessage: string; userMessage: string; task: AITask;
  snapshot: { system_prompt: string; template_used: string; variables_resolved: Record<string, string>;
    params_applied: Record<string, string>; user_instructions: string; full_prompt: string; };
}> {
  const task = await aiTaskService.getByCode(request.taskCode);
  if (!task) throw new Error("Tache IA inconnue : " + request.taskCode);
  const settings = await aiSettingsService.get();
  const userTemplate = await aiTaskService.getUserTemplate(task.id);
  const templateSource = (userTemplate?.is_active && userTemplate.template_content)
    ? userTemplate.template_content : task.default_template;
  const resolvedTemplate = resolveVariables(templateSource, request.variables);
  const taskParams = await aiTaskService.getParams(task.id);
  const mergedParams = mergeParams(task.default_params, userTemplate?.default_params_override, request.params);
  const paramsBlock = buildParamsBlock(taskParams, mergedParams, settings);
  const parts: string[] = [];
  if (resolvedTemplate) parts.push(resolvedTemplate);
  if (paramsBlock) parts.push(paramsBlock);

  // Inject library documents (extracted_text)
  if (request.documentIds?.length) {
    for (const docId of request.documentIds) {
      const doc = await db.selectOne<{ title: string; extracted_text: string | null }>(
        "SELECT title, extracted_text FROM documents WHERE id = ?", [docId]
      );
      if (doc?.extracted_text?.trim()) {
        parts.push(`\n--- Document de référence : ${doc.title} ---\n${doc.extracted_text.trim()}\n---`);
      }
    }
  }

  // Inject ad-hoc file contents
  if (request.rawDocumentContexts?.length) {
    for (const ctx of request.rawDocumentContexts) {
      if (ctx.trim()) parts.push(`\n--- Fichier joint ---\n${ctx.trim()}\n---`);
    }
  }

  if (request.userInstructions?.trim()) {
    parts.push("\n--- Consignes complementaires ---\n" + request.userInstructions.trim());
  }
  const userMessage = parts.join("\n\n");
  const systemMessage = task.system_prompt || "";
  return { systemMessage, userMessage, task, snapshot: {
    system_prompt: systemMessage, template_used: templateSource,
    variables_resolved: request.variables, params_applied: mergedParams,
    user_instructions: request.userInstructions || "", full_prompt: userMessage } };
}

function resolveVariables(template: string, variables: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key) => variables[key] ?? _m);
}

function mergeParams(taskDefaults?: string, userOverrides?: string, reqParams?: Record<string, string>): Record<string, string> {
  let m: Record<string, string> = {};
  try { m = { ...m, ...JSON.parse(taskDefaults || "{}") }; } catch { /* */ }
  try { m = { ...m, ...JSON.parse(userOverrides || "{}") }; } catch { /* */ }
  if (reqParams) m = { ...m, ...reqParams };
  return m;
}

function buildParamsBlock(taskParams: AITaskParam[], values: Record<string, string>, settings: any): string {
  const lines: string[] = [];
  for (const p of taskParams) {
    const v = values[p.param_code] ?? p.default_value ?? settings?.["default_" + p.param_code] ?? null;
    if (!v || !p.injection_template) continue;
    lines.push(p.injection_template.replace("{value}", v));
  }
  return lines.length > 0 ? lines.join("\n") : "";
}

// === API CLIENT ===

/** Récupère la clé API depuis le keyring pour un fournisseur donné */
export async function getApiKey(provider: AIProvider = 'openai'): Promise<string> {
  const keyName = provider === 'openai' ? 'openai-api-key' : provider + '-api-key';
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const key = await invoke("plugin:keyring|get", { service: "teacher-assistant", key: keyName });
    if (key) return key as string;
  } catch { /* fallback */ }
  if (provider === 'openai') {
    const envKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
    if (envKey) return envKey;
  }
  throw new Error("Clé API non configurée pour " + PROVIDER_LABELS[provider] + ". Ajoutez-la dans Paramètres > IA.");
}

export async function setApiKey(key: string, provider: AIProvider = 'openai'): Promise<void> {
  const keyName = provider === 'openai' ? 'openai-api-key' : provider + '-api-key';
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("plugin:keyring|set", { service: "teacher-assistant", key: keyName, value: key });
  } catch { console.warn("[AI] Keyring indisponible"); }
}

// === OLLAMA SERVICE (serveur local) ===

export const ollamaService = {
  /** Vérifie que le serveur Ollama est joignable (timeout 3s) */
  async ping(baseUrl: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(baseUrl.replace(/\/$/, '') + '/api/version', { signal: controller.signal });
      clearTimeout(t);
      return res.ok;
    } catch { return false; }
  },
  /** Liste les modèles installés sur le serveur Ollama */
  async listModels(baseUrl: string): Promise<string[]> {
    const res = await fetch(baseUrl.replace(/\/$/, '') + '/api/tags');
    if (!res.ok) throw new Error('Serveur local inaccessible (' + res.status + ')');
    const data = await res.json();
    return ((data.models ?? []) as any[]).map(m => m.name as string);
  },
};

interface ChatMessage { role: "system" | "user" | "assistant"; content: MessageContent; }
interface ChatResponse { content: string; model: string; tokens_input: number; tokens_output: number; }

async function callChatAPI(messages: ChatMessage[], model?: string): Promise<ChatResponse> {
  const settings = await aiSettingsService.get();
  const provider: AIProvider = (settings?.provider as AIProvider) || 'openai';
  const modelName = model ?? settings?.model ?? 'gpt-4o';

  let endpoint: string;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (provider === 'local') {
    const baseUrl = (settings?.local_server_url || 'http://localhost:11434').replace(/\/$/, '');
    endpoint = baseUrl + '/v1/chat/completions';
    // Pas de clé d'auth pour un serveur local
  } else {
    endpoint = settings?.api_endpoint || PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openai;
    const apiKey = await getApiKey(provider);
    headers['Authorization'] = 'Bearer ' + apiKey;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: modelName, messages,
      max_tokens: settings?.max_tokens_per_request ?? 4096, temperature: settings?.temperature ?? 0.7 }),
  });
  if (!response.ok) throw new Error("API IA erreur " + response.status + ": " + await response.text());
  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content ?? "", model: data.model ?? modelName,
    tokens_input: data.usage?.prompt_tokens ?? 0, tokens_output: data.usage?.completion_tokens ?? 0 };
}

// === GENERATION SERVICE ===

export const aiGenerationService = {
  async generate(request: AIGenerationRequest) {
    const startTime = Date.now();
    const { systemMessage, userMessage, task, snapshot } = await assemblePrompt(request);
    const genId = await db.insert(
      "INSERT INTO ai_generations (task_id, subject_id, level_id, sequence_id, session_id, " +
      "context_entity_type, context_entity_id, system_prompt, full_prompt_snapshot, prompt_used, " +
      "user_instructions, params_snapshot, output_format, status) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing')",
      [task.id, request.subjectId ?? null, request.levelId ?? null,
       request.sequenceId ?? null, request.sessionId ?? null,
       request.contextEntityType ?? "", request.contextEntityId ?? null,
       snapshot.system_prompt, snapshot.full_prompt, snapshot.full_prompt,
       snapshot.user_instructions, JSON.stringify(snapshot.params_applied), task.output_format]
    );
    if (request.documentIds?.length) {
      for (const docId of request.documentIds) {
        await db.execute("INSERT INTO ai_generation_documents (generation_id, document_id) VALUES (?, ?)", [genId, docId]);
      }
    }
    try {
      const messages: ChatMessage[] = [];
      if (systemMessage) messages.push({ role: "system", content: systemMessage });
      messages.push({ role: "user", content: userMessage });
      const result = await callChatAPI(messages);
      await db.execute(
        "UPDATE ai_generations SET raw_response = ?, processed_result = ?, output_content = ?, " +
        "model_used = ?, tokens_input = ?, tokens_output = ?, duration_ms = ?, " +
        "status = 'completed', updated_at = datetime('now') WHERE id = ?",
        [result.content, result.content, result.content, result.model,
         result.tokens_input, result.tokens_output, Date.now() - startTime, genId]
      );
      return await db.selectOne<any>("SELECT * FROM ai_generations WHERE id = ?", [genId]);
    } catch (err: any) {
      await db.execute("UPDATE ai_generations SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?", [err.message, genId]);
      throw err;
    }
  },
  async getHistory(limit = 50) {
    return db.select("SELECT g.*, t.label as task_label, t.icon as task_icon, t.category as task_category " +
      "FROM ai_generations g LEFT JOIN ai_tasks t ON g.task_id = t.id ORDER BY g.created_at DESC LIMIT ?", [limit]);
  },
  async getById(id: ID): Promise<any | null> {
    return db.selectOne<any>("SELECT g.*, t.label as task_label, t.code as task_code " +
      "FROM ai_generations g LEFT JOIN ai_tasks t ON g.task_id = t.id WHERE g.id = ?", [id]);
  },
  async rate(id: ID, rating: number) {
    await db.execute("UPDATE ai_generations SET rating = ?, updated_at = datetime('now') WHERE id = ?", [rating, id]);
  },
  async accept(id: ID) {
    await db.execute("UPDATE ai_generations SET status = 'accepted', updated_at = datetime('now') WHERE id = ?", [id]);
  },
  async markModified(id: ID, c: string) {
    await db.execute("UPDATE ai_generations SET status = 'modified', processed_result = ?, output_content = ?, updated_at = datetime('now') WHERE id = ?", [c, c, id]);
  },
  async reject(id: ID) {
    await db.execute("UPDATE ai_generations SET status = 'rejected', updated_at = datetime('now') WHERE id = ?", [id]);
  },
  async saveToLibrary(id: ID, title: string, subjectId?: ID): Promise<ID> {
    const gen: any = await this.getById(id);
    if (!gen) throw new Error("Generation introuvable");
    const docId = await db.insert(
      "INSERT INTO documents (title, doc_type, source, subject_id, level_id, text_content, " +
      "generated_from_ai_generation_id) VALUES (?, 'generated', 'ai', ?, ?, ?, ?)",
      [title, subjectId ?? gen.subject_id, gen.level_id, gen.output_content, id]
    );
    await db.execute("UPDATE ai_generations SET is_saved = 1, updated_at = datetime('now') WHERE id = ?", [id]);
    return docId;
  },
};

// === CORRECTION SERVICE ===

export const aiCorrectionService = {
  async analyzeCopy(submissionId: ID, assignmentId: ID): Promise<CorrectionAIResult> {
    const assignment = await db.selectOne<any>("SELECT * FROM assignments WHERE id = ?", [assignmentId]);
    const skills = await db.select<any>(
      "SELECT s.label FROM skills s JOIN assignment_skill_map asm ON asm.skill_id = s.id WHERE asm.assignment_id = ?", [assignmentId]);
    const submission = await db.selectOne<any>("SELECT * FROM submissions WHERE id = ?", [submissionId]);

    const hasTextContent = !!submission?.text_content?.trim();
    const hasImageFile = submission?.file_path && isImageFile(submission.file_path);
    const correctionModelText = assignment?.correction_model_text ?? null;

    // If image copy with no text → use multimodal (direct callChatAPI)
    if (!hasTextContent && hasImageFile) {
      const { systemMessage, userMessage } = await assemblePrompt({
        taskCode: "analyze_submission",
        variables: {
          type_exercice: assignment?.assignment_type ?? "dissertation",
          matiere: assignment?.title ?? "",
          competences: skills.map((s: any) => s.label).join(", "),
          copie_contenu: "[Voir image jointe]",
          bareme: assignment?.max_score ? "/" + assignment.max_score : "/20",
        },
        rawDocumentContexts: correctionModelText ? [`Corrigé type :\n${correctionModelText}`] : undefined,
      });

      const imageDataUrl = await filePathToBase64DataUrl(submission.file_path);
      const userContent: ContentPart[] = [
        { type: "text", text: userMessage },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ];

      const response = await callChatAPI([
        { role: "system", content: systemMessage },
        { role: "user", content: userContent },
      ]);

      try {
        return JSON.parse(response.content.replace(/```json\n?/g, "").replace(/```/g, "").trim()) as CorrectionAIResult;
      } catch { return { skills: [], strengths: [], weaknesses: [], general_comment: response.content }; }
    }

    // Text-based analysis (original path, now with correction model context)
    const gen: any = await aiGenerationService.generate({
      taskCode: "analyze_submission",
      variables: {
        type_exercice: assignment?.assignment_type ?? "dissertation",
        matiere: assignment?.title ?? "",
        competences: skills.map((s: any) => s.label).join(", "),
        copie_contenu: submission?.text_content?.substring(0, 4000) ?? "[Copie non numerisee]",
        bareme: assignment?.max_score ? "/" + assignment.max_score : "/20",
      },
      rawDocumentContexts: correctionModelText ? [`Corrigé type :\n${correctionModelText}`] : undefined,
      contextEntityType: "submission", contextEntityId: submissionId,
    });
    try {
      const content = gen.output_content || gen.processed_result || "";
      return JSON.parse(content.replace(/```json\n?/g, "").replace(/```/g, "").trim()) as CorrectionAIResult;
    } catch { return { skills: [], strengths: [], weaknesses: [], general_comment: gen.output_content ?? "" }; }
  },

  async applyResult(submissionId: ID, assignmentId: ID, result: CorrectionAIResult): Promise<void> {
    const skillMap = await db.select<any>(
      "SELECT s.id, s.label FROM skills s JOIN assignment_skill_map asm ON asm.skill_id = s.id WHERE asm.assignment_id = ?", [assignmentId]);
    await db.transaction(async () => {
      for (const sk of result.skills) {
        const match = skillMap.find((s: any) => s.label.toLowerCase().includes(sk.skill_name.toLowerCase().substring(0, 8)));
        if (match) await db.execute("INSERT OR REPLACE INTO submission_skill_evaluations (submission_id, skill_id, level, source, comment) VALUES (?, ?, ?, 'ai', ?)", [submissionId, match.id, sk.level, sk.comment]);
      }
      for (const s of result.strengths) await db.execute("INSERT INTO submission_feedback (submission_id, feedback_type, content, source) VALUES (?, 'strength', ?, 'ai')", [submissionId, s]);
      for (const wk of result.weaknesses) await db.execute("INSERT INTO submission_feedback (submission_id, feedback_type, content, source) VALUES (?, 'weakness', ?, 'ai')", [submissionId, wk]);
      await db.insert("INSERT INTO corrections (submission_id, correction_text, source) VALUES (?, ?, 'ai')", [submissionId, result.general_comment]);
    });
  },

  async generateBilanComment(assignmentId: ID, stats: {
    average: number; median: number; min: number; max: number; totalStudents: number;
    skillAverages: Array<{ label: string; avg: number }>; topStrengths: string[]; topWeaknesses: string[];
  }): Promise<string> {
    const a = await db.selectOne<any>("SELECT * FROM assignments WHERE id = ?", [assignmentId]);
    const gen: any = await aiGenerationService.generate({
      taskCode: "generate_class_report",
      variables: {
        titre_devoir: a?.title ?? "Devoir", nombre_copies: String(stats.totalStudents),
        moyenne: stats.average.toFixed(1), mediane: String(stats.median),
        note_min: String(stats.min), note_max: String(stats.max),
        competences_moyennes: stats.skillAverages.map(s => s.label + ": " + s.avg.toFixed(1) + "/4").join(", "),
        forces_classe: stats.topStrengths.join(", "), lacunes_classe: stats.topWeaknesses.join(", "),
      },
      contextEntityType: "assignment", contextEntityId: assignmentId,
    });
    return gen.output_content ?? gen.processed_result ?? "";
  },
};

// === BULLETIN SERVICE ===

export const aiBulletinService = {
  async generateAppreciation(studentId: ID, periodId: ID, subjectId: ID, userInstructions?: string): Promise<string> {
    const student = await db.selectOne<any>("SELECT * FROM students WHERE id = ?", [studentId]);
    const profile = await db.selectOne<any>(
      "SELECT * FROM student_period_profiles WHERE student_id = ? AND report_period_id = ?", [studentId, periodId]);
    const observations = await db.select<any>(
      "SELECT s.label, sso.level FROM student_skill_observations sso " +
      "JOIN skills s ON sso.skill_id = s.id WHERE sso.student_id = ? ORDER BY sso.observed_at DESC LIMIT 10", [studentId]);
    const subject = await db.selectOne<any>("SELECT * FROM subjects WHERE id = ?", [subjectId]);
    const gen: any = await aiGenerationService.generate({
      taskCode: "generate_appreciation",
      variables: {
        prenom_eleve: student?.first_name ?? "", nom_eleve: student?.last_name ?? "",
        matiere: subject?.name ?? "",
        comportement: profile?.behavior_score ? profile.behavior_score + "/5" : "non renseigne",
        travail: profile?.work_score ? profile.work_score + "/5" : "non renseigne",
        participation: profile?.participation_score ? profile.participation_score + "/5" : "non renseigne",
        competences_recentes: observations.map((o: any) => o.label + ": " + o.level + "/4").join(", ") || "pas de donnees",
      },
      contextEntityType: "student", contextEntityId: studentId, subjectId,
      userInstructions,
    });
    return gen.output_content ?? gen.processed_result ?? "";
  },

  async generateBatch(
    classId: ID,
    periodId: ID,
    subjectId: ID,
    userInstructions?: string,
    onProgress?: (c: number, t: number) => void,
  ): Promise<Map<number, string>> {
    const students = await db.select<any>(
      "SELECT s.id FROM students s JOIN student_class_enrollments sce ON sce.student_id = s.id WHERE sce.class_id = ? ORDER BY s.last_name", [classId]);
    const results = new Map<number, string>();
    for (let i = 0; i < students.length; i++) {
      try { results.set(students[i].id, await this.generateAppreciation(students[i].id, periodId, subjectId, userInstructions)); }
      catch { results.set(students[i].id, "[Erreur de generation]"); }
      onProgress?.(i + 1, students.length);
    }
    return results;
  },

  async generateOrientation(studentId: ID): Promise<string> {
    const student = await db.selectOne<any>("SELECT * FROM students WHERE id = ?", [studentId]);
    const grades = await db.select<any>(
      "SELECT a.title, sub.score, a.max_score FROM submissions sub JOIN assignments a ON sub.assignment_id = a.id " +
      "WHERE sub.student_id = ? AND sub.score IS NOT NULL ORDER BY a.assignment_date DESC LIMIT 10", [studentId]);
    const skills = await db.select<any>(
      "SELECT s.label, sso.level FROM student_skill_observations sso JOIN skills s ON sso.skill_id = s.id " +
      "WHERE sso.student_id = ? ORDER BY sso.observed_at DESC LIMIT 15", [studentId]);
    const gen: any = await aiGenerationService.generate({
      taskCode: "generate_orientation",
      variables: {
        prenom_eleve: student?.first_name ?? "", nom_eleve: student?.last_name ?? "",
        notes_recentes: grades.map((g: any) => g.title + ": " + g.score + "/" + g.max_score).join(", ") || "aucune note",
        competences: skills.map((s: any) => s.label + ": " + s.level + "/4").join(", ") || "pas de donnees",
      },
      contextEntityType: "student", contextEntityId: studentId,
    });
    return gen.output_content ?? gen.processed_result ?? "";
  },
};

// === QUEUE OFFLINE ===

export const aiQueueService = {
  async enqueue(requestType: string, payload: AIGenerationRequest, priority = 5): Promise<ID> {
    return db.insert("INSERT INTO ai_request_queue (request_type, payload, priority, max_retries) VALUES (?, ?, ?, 3)",
      [requestType, JSON.stringify(payload), priority]);
  },
  async getPending() {
    return db.select("SELECT * FROM ai_request_queue WHERE status IN ('queued', 'error') AND retry_count < max_retries ORDER BY priority DESC, created_at ASC");
  },
  async processQueue(onProgress?: (c: number, t: number) => void): Promise<{ processed: number; errors: number }> {
    const pending = await this.getPending();
    let processed = 0, errors = 0;
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i] as any;
      try {
        await db.execute("UPDATE ai_request_queue SET status = 'processing' WHERE id = ?", [item.id]);
        await aiGenerationService.generate(JSON.parse(item.payload));
        await db.execute("UPDATE ai_request_queue SET status = 'completed', processed_at = datetime('now') WHERE id = ?", [item.id]);
        processed++;
      } catch (err: any) {
        await db.execute("UPDATE ai_request_queue SET status = 'error', error_message = ?, retry_count = retry_count + 1 WHERE id = ?", [err.message, item.id]);
        errors++;
      }
      onProgress?.(i + 1, pending.length);
    }
    return { processed, errors };
  },
  async pendingCount(): Promise<number> {
    const r = await db.selectOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM ai_request_queue WHERE status IN ('queued', 'error') AND retry_count < max_retries");
    return r?.cnt ?? 0;
  },
  async clear(): Promise<void> {
    await db.execute("DELETE FROM ai_request_queue WHERE status != 'processing'");
  },
};

// === SMART WRAPPERS (online/offline) ===

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export async function smartGenerate(request: AIGenerationRequest): Promise<any | { queued: true; queueId: ID }> {
  if (isOnline()) return aiGenerationService.generate(request);
  const queueId = await aiQueueService.enqueue("generate", request);
  return { queued: true, queueId };
}

export async function smartCorrect(submissionId: ID, assignmentId: ID): Promise<CorrectionAIResult | { queued: true; queueId: ID }> {
  if (isOnline()) return aiCorrectionService.analyzeCopy(submissionId, assignmentId);
  const queueId = await aiQueueService.enqueue("correct", {
    taskCode: "analyze_submission", variables: {},
    contextEntityType: "submission", contextEntityId: submissionId,
  });
  return { queued: true, queueId };
}
