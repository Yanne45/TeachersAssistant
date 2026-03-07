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
}

export interface CorrectionAIResult {
  skills: Array<{ skill_name: string; level: number; comment: string }>;
  strengths: string[];
  weaknesses: string[];
  general_comment: string;
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

export async function getApiKey(): Promise<string> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const key = await invoke("plugin:keyring|get", { service: "teacher-assistant", key: "openai-api-key" });
    if (key) return key as string;
  } catch { /* fallback */ }
  const envKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (envKey) return envKey;
  throw new Error("Cle API non configuree. Ajoutez-la dans Parametres > IA.");
}

export async function setApiKey(key: string): Promise<void> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("plugin:keyring|set", { service: "teacher-assistant", key: "openai-api-key", value: key });
  } catch { console.warn("[AI] Keyring indisponible"); }
}

interface ChatMessage { role: "system" | "user" | "assistant"; content: string; }
interface ChatResponse { content: string; model: string; tokens_input: number; tokens_output: number; }

async function callChatAPI(messages: ChatMessage[], model?: string): Promise<ChatResponse> {
  const apiKey = await getApiKey();
  const settings = await aiSettingsService.get();
  const endpoint = settings?.api_endpoint || "https://api.openai.com/v1/chat/completions";
  const modelName = model ?? settings?.model ?? "gpt-4o";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
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
      return await db.selectOne("SELECT * FROM ai_generations WHERE id = ?", [genId]);
    } catch (err: any) {
      await db.execute("UPDATE ai_generations SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?", [err.message, genId]);
      throw err;
    }
  },
  async getHistory(limit = 50) {
    return db.select("SELECT g.*, t.label as task_label, t.icon as task_icon, t.category as task_category " +
      "FROM ai_generations g LEFT JOIN ai_tasks t ON g.task_id = t.id ORDER BY g.created_at DESC LIMIT ?", [limit]);
  },
  async getById(id: ID) {
    return db.selectOne("SELECT g.*, t.label as task_label, t.code as task_code " +
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
    const gen = await this.getById(id);
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
    const gen = await aiGenerationService.generate({
      taskCode: "analyze_submission",
      variables: {
        type_exercice: assignment?.assignment_type ?? "dissertation",
        matiere: assignment?.title ?? "",
        competences: skills.map((s: any) => s.label).join(", "),
        copie_contenu: submission?.text_content?.substring(0, 4000) ?? "[Copie non numerisee]",
        bareme: assignment?.max_score ? "/" + assignment.max_score : "/20",
      },
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
    const gen = await aiGenerationService.generate({
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
  async generateAppreciation(studentId: ID, periodId: ID, subjectId: ID): Promise<string> {
    const student = await db.selectOne<any>("SELECT * FROM students WHERE id = ?", [studentId]);
    const profile = await db.selectOne<any>(
      "SELECT * FROM student_period_profiles WHERE student_id = ? AND report_period_id = ?", [studentId, periodId]);
    const observations = await db.select<any>(
      "SELECT s.label, sso.level FROM student_skill_observations sso " +
      "JOIN skills s ON sso.skill_id = s.id WHERE sso.student_id = ? ORDER BY sso.observed_at DESC LIMIT 10", [studentId]);
    const subject = await db.selectOne<any>("SELECT * FROM subjects WHERE id = ?", [subjectId]);
    const gen = await aiGenerationService.generate({
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
    });
    return gen.output_content ?? gen.processed_result ?? "";
  },

  async generateBatch(classId: ID, periodId: ID, subjectId: ID, onProgress?: (c: number, t: number) => void): Promise<Map<number, string>> {
    const students = await db.select<any>(
      "SELECT s.id FROM students s JOIN student_class_enrollments sce ON sce.student_id = s.id WHERE sce.class_id = ? ORDER BY s.last_name", [classId]);
    const results = new Map<number, string>();
    for (let i = 0; i < students.length; i++) {
      try { results.set(students[i].id, await this.generateAppreciation(students[i].id, periodId, subjectId)); }
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
    const gen = await aiGenerationService.generate({
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
