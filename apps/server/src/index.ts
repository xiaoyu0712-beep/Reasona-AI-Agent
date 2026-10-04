import express, { type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotEnv } from 'dotenv';
import { z } from 'zod';
import { openDatabase } from './db.js';
import { appendAudit, createTask, hashPayload, recordTaskEvent, shortTitle, transitionTask } from './domain.js';
import { loadConfig } from './env.js';
import { completeGoogleLogin, enforceSameOrigin, getUser, logout, requireUser, startGoogleLogin } from './auth.js';
import { getProviderReadiness } from './provider.js';
import type { TaskStatus } from './types.js';

const envFile = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '../.env')].find(existsSync);
if (envFile) loadDotEnv({ path: envFile });
const config = loadConfig();
const db = openDatabase(config.DATABASE_PATH);
const app = express();
app.disable('x-powered-by');
app.set('etag', false);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  next();
});
app.use(express.json({ limit: '64kb', strict: true }));
app.use((req, _res, next) => {
  const raw = req.headers.cookie || '';
  const cookies: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index > 0) {
      const key = part.slice(0, index).trim();
      try { cookies[key] = decodeURIComponent(part.slice(index + 1).trim()); } catch { /* malformed cookies are ignored */ }
    }
  }
  (req as Request & { cookies: Record<string, string> }).cookies = cookies;
  next();
});

const userAuth = requireUser(db, config);
const idParam = z.string().uuid();
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const jsonError = (res: Response, status: number, error: string, message?: string) => res.status(status).json({ error, ...(message ? { message } : {}) });

function ownedTask(taskId: string, ownerId: string) {
  return db.prepare('SELECT * FROM tasks WHERE id=? AND owner_id=?').get(taskId, ownerId) as Record<string, unknown> | undefined;
}
function ownedConversation(conversationId: string, ownerId: string) {
  return db.prepare('SELECT * FROM conversations WHERE id=? AND owner_id=?').get(conversationId, ownerId) as Record<string, unknown> | undefined;
}
function executionBlockReason(): string {
  const provider = getProviderReadiness(process.env);
  if (!provider.ready) return provider.reason;
  if (process.env.RESEARCH_EXECUTION_ENABLED !== 'true') return '管理者尚未明確啟用研究執行；目前不會呼叫模型。';
  return '來源搜尋、網頁擷取與引用驗證工具尚未接通；為避免產生不可追溯的研究內容，任務保持待處理。';
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, status: 'healthy' });
});
app.get('/api/auth/status', (_req, res) => res.json({ mode: config.AUTH_MODE, googleConfigured: Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.GOOGLE_REDIRECT_URI),
  message: config.AUTH_MODE === 'local' ? '本機單一工作區開發模式；不是 Google 登入。' : 'Google OAuth 僅在 credentials、redirect URI 及使用者同意完成後可使用。' }));
app.get('/api/auth/google', (_req, res, next) => { void startGoogleLogin(db, config, res).catch(next); });
app.get('/api/auth/google/callback', (req, res, next) => {
  void completeGoogleLogin(db, config, { code: String(req.query.code || ''), state: String(req.query.state || ''), cookieState: req.cookies?.reasona_oauth_state }, res).catch(next);
});

app.use('/api', userAuth);
app.use('/api', (req, res, next) => enforceSameOrigin(req, res, next, config.APP_ORIGIN));
app.get('/api/me', (req, res) => { const u = getUser(req); res.json({ id: u.id, name: u.name, email: u.email, authMode: u.authMode }); });
app.post('/api/auth/logout', (req, res) => logout(db, req, res, config));
app.get('/api/readiness', (_req, res) => {
  const provider = getProviderReadiness(process.env);
  res.json({ provider, researchExecution: { ready: false, reason: executionBlockReason() }, oauth: { configured: Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.GOOGLE_REDIRECT_URI), mode: config.AUTH_MODE } });
});

app.get('/api/conversations', (req, res) => {
  const u = getUser(req);
  res.json(db.prepare('SELECT * FROM conversations WHERE owner_id=? ORDER BY updated_at DESC').all(u.id));
});
app.post('/api/conversations', (req, res) => {
  const u = getUser(req);
  const input = z.object({ title: text(1, 120).optional() }).safeParse(req.body);
  if (!input.success) return jsonError(res, 400, 'invalid_input');
  const id = randomUUID(), at = new Date().toISOString();
  const title = input.data.title || '新研究對話';
  db.prepare('INSERT INTO conversations(id,owner_id,title,title_edited,created_at,updated_at) VALUES(?,?,?,0,?,?)').run(id, u.id, title, at, at);
  appendAudit(db, u.id, u.id, 'conversation.created', 'conversation', id);
  res.status(201).json(db.prepare('SELECT * FROM conversations WHERE id=?').get(id));
});
app.get('/api/conversations/:id', (req, res) => {
  const u = getUser(req);
  if (!idParam.safeParse(req.params.id).success) return jsonError(res, 400, 'invalid_id');
  const conversation = ownedConversation(req.params.id, u.id);
  if (!conversation) return jsonError(res, 404, 'not_found');
  const tasks = db.prepare('SELECT * FROM tasks WHERE conversation_id=? AND owner_id=? ORDER BY created_at DESC').all(req.params.id, u.id);
  const messages = db.prepare('SELECT id,conversation_id,task_id,speaker_type,speaker_id,body,created_at FROM messages WHERE conversation_id=? AND owner_id=? ORDER BY created_at,id').all(req.params.id, u.id);
  res.json({ conversation, tasks, messages });
});
app.patch('/api/conversations/:id', (req, res) => {
  const u = getUser(req);
  if (!idParam.safeParse(req.params.id).success) return jsonError(res, 400, 'invalid_id');
  const input = z.object({ title: text(1, 120) }).safeParse(req.body);
  if (!input.success) return jsonError(res, 400, 'invalid_input');
  if (!ownedConversation(req.params.id, u.id)) return jsonError(res, 404, 'not_found');
  db.prepare('UPDATE conversations SET title=?,title_edited=1,updated_at=? WHERE id=? AND owner_id=?').run(input.data.title, new Date().toISOString(), req.params.id, u.id);
  appendAudit(db, u.id, u.id, 'conversation.renamed', 'conversation', req.params.id);
  res.json(db.prepare('SELECT * FROM conversations WHERE id=? AND owner_id=?').get(req.params.id, u.id));
});
app.delete('/api/conversations/:id', (req, res) => {
  const u = getUser(req);
  if (!idParam.safeParse(req.params.id).success) return jsonError(res, 400, 'invalid_id');
  const input = z.object({ confirm: z.literal(true), acknowledgedScope: z.literal('conversation-tasks-messages-sources-evidence-claims-approvals') }).safeParse(req.body);
  if (!input.success) return jsonError(res, 400, 'explicit_scope_confirmation_required', '刪除會移除本對話的任務、訊息、來源、證據、主張與核准資料；稽核紀錄保留不含正文的操作 metadata。');
  if (!ownedConversation(req.params.id, u.id)) return jsonError(res, 404, 'not_found');
  const tx = db.transaction(() => {
    appendAudit(db, u.id, u.id, 'conversation.deleted', 'conversation', req.params.id, { scope: input.data.acknowledgedScope, contentRemoved: true });
    db.prepare('DELETE FROM conversations WHERE id=? AND owner_id=?').run(req.params.id, u.id);
  });
  tx(); res.status(204).end();
});

app.get('/api/agents', (req, res) => {
  const u = getUser(req);
  res.json(db.prepare('SELECT * FROM agents WHERE owner_id=? ORDER BY updated_at DESC').all(u.id).map((a: any) => ({ ...a, allowed_sources: JSON.parse(a.allowed_sources_json) })));
});
app.get('/api/schedules', (req, res) => {
  const u = getUser(req);
  res.json(db.prepare('SELECT id,name,schedule_spec,timezone,status,next_run_at,last_run_at,last_result,created_at,updated_at FROM schedules WHERE owner_id=? ORDER BY updated_at DESC').all(u.id));
});
const agentSchema = z.object({ name: text(1, 60), role: text(1, 80), description: text(1, 240), instructions: text(1, 4000), allowedSources: z.array(z.string().max(300)).max(30).default([]) });
app.post('/api/agents', (req, res) => {
  const u = getUser(req), parsed = agentSchema.safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, 'invalid_input');
  const id = randomUUID(), at = new Date().toISOString();
  const a = parsed.data;
  db.prepare(`INSERT INTO agents(id,owner_id,name,role,description,instructions,allowed_sources_json,version,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,1,?,?)`).run(id, u.id, a.name, a.role, a.description, a.instructions, JSON.stringify(a.allowedSources), at, at);
  appendAudit(db, u.id, u.id, 'agent.created', 'agent', id, { version: 1 });
  res.status(201).json(db.prepare('SELECT * FROM agents WHERE id=?').get(id));
});
app.patch('/api/agents/:id', (req, res) => {
  const u = getUser(req), parsed = agentSchema.safeParse(req.body);
  if (!idParam.safeParse(req.params.id).success) return jsonError(res, 400, 'invalid_id');
  if (!parsed.success) return jsonError(res, 400, 'invalid_input');
  const existing = db.prepare('SELECT id,version FROM agents WHERE id=? AND owner_id=?').get(req.params.id, u.id) as { id: string; version: number } | undefined;
  if (!existing) return jsonError(res, 404, 'not_found');
  const a = parsed.data, at = new Date().toISOString();
  db.prepare(`UPDATE agents SET name=?,role=?,description=?,instructions=?,allowed_sources_json=?,version=version+1,updated_at=?
    WHERE id=? AND owner_id=?`).run(a.name, a.role, a.description, a.instructions, JSON.stringify(a.allowedSources), at, req.params.id, u.id);
  appendAudit(db, u.id, u.id, 'agent.updated', 'agent', req.params.id, { fromVersion: existing.version, toVersion: existing.version + 1 });
  res.json(db.prepare('SELECT * FROM agents WHERE id=?').get(req.params.id));
});
app.delete('/api/agents/:id', (req, res) => {
  const u = getUser(req);
  if (!idParam.safeParse(req.params.id).success) return jsonError(res, 400, 'invalid_id');
  if (!db.prepare('SELECT id FROM agents WHERE id=? AND owner_id=?').get(req.params.id, u.id)) return jsonError(res, 404, 'not_found');
  appendAudit(db, u.id, u.id, 'agent.deleted', 'agent', req.params.id, { activeTaskReferencesRetained: true });
  db.prepare('DELETE FROM agents WHERE id=? AND owner_id=?').run(req.params.id, u.id);
  res.status(204).end();
});

app.post('/api/tasks', (req, res) => {
  const u = getUser(req);
  const parsed = z.object({ prompt: text(8, 10000), conversationId: z.string().uuid().optional(), personalAgentId: z.string().uuid().nullable().optional() }).safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, 'invalid_input');
  try {
    const task = createTask(db, { ownerId: u.id, prompt: parsed.data.prompt, conversationId: parsed.data.conversationId,
      agentId: parsed.data.personalAgentId, providerReason: executionBlockReason() });
    res.status(201).json({ task, conversationId: (task as any).conversation_id, executionEnabled: false });
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (reason === 'CONVERSATION_NOT_FOUND' || reason === 'AGENT_NOT_FOUND') return jsonError(res, 404, 'not_found');
    nextError(error, res);
  }
});
app.get('/api/tasks/:id', (req, res) => {
  const u = getUser(req);
  if (!idParam.safeParse(req.params.id).success) return jsonError(res, 400, 'invalid_id');
  const task = ownedTask(req.params.id, u.id);
  if (!task) return jsonError(res, 404, 'not_found');
  const events = db.prepare('SELECT * FROM task_events WHERE task_id=? AND owner_id=? ORDER BY id').all(req.params.id, u.id);
  const messages = db.prepare('SELECT id,speaker_type,speaker_id,body,created_at FROM messages WHERE task_id=? AND owner_id=? ORDER BY created_at,id').all(req.params.id, u.id);
  const subtasks = db.prepare('SELECT id,title,assigned_agent_id,agent_snapshot_json,status,phase,blocked_reason,result_summary,created_at,updated_at FROM subtasks WHERE parent_task_id=? AND owner_id=? ORDER BY created_at,id').all(req.params.id, u.id).map((subtask: any) => ({ ...subtask, agent_snapshot: subtask.agent_snapshot_json ? JSON.parse(subtask.agent_snapshot_json) : null }));
  const approvals = (db.prepare('SELECT id,action,payload_json,payload_hash,status,expires_at,approved_at,created_at FROM approvals WHERE task_id=? AND owner_id=? ORDER BY created_at,id').all(req.params.id, u.id) as any[]).map(approval => ({ ...approval, payload: JSON.parse(approval.payload_json), payload_json: undefined }));
  const claims = db.prepare(`SELECT c.*, COALESCE(json_group_array(json_object('id',e.id,'sourceId',s.id,'url',s.url,'title',s.title,'excerpt',e.excerpt,'locator',e.locator)) FILTER (WHERE e.id IS NOT NULL), '[]') AS evidence_json
    FROM claims c LEFT JOIN claim_evidence ce ON ce.claim_id=c.id LEFT JOIN evidence e ON e.id=ce.evidence_id LEFT JOIN sources s ON s.id=e.source_id
    WHERE c.task_id=? AND c.owner_id=? GROUP BY c.id ORDER BY c.created_at`).all(req.params.id, u.id).map((c: any) => ({ ...c, evidence: JSON.parse(c.evidence_json) }));
  const sources = (db.prepare('SELECT * FROM sources WHERE task_id=? AND owner_id=? ORDER BY created_at').all(req.params.id, u.id) as any[]).map(source => ({ ...source, evidence: db.prepare('SELECT e.id,e.source_id AS sourceId,e.excerpt,e.locator,e.created_at,s.url,s.title FROM evidence e JOIN sources s ON s.id=e.source_id WHERE e.source_id=? AND e.owner_id=? ORDER BY e.created_at').all(source.id, u.id) }));
  const taskWithSnapshot = { ...task, personal_agent_snapshot: task.agent_snapshot_json ? JSON.parse(String(task.agent_snapshot_json)) : null };
  res.json({ task: taskWithSnapshot, events, messages, subtasks, approvals, claims, sources });
});
app.post('/api/tasks/:id/cancel', (req, res) => {
  const u = getUser(req);
  if (!idParam.safeParse(req.params.id).success) return jsonError(res, 400, 'invalid_id');
  try { transitionTask(db, req.params.id, u.id, 'cancelled', 'cancelled', '使用者已取消任務。');
    res.json(ownedTask(req.params.id, u.id));
  } catch (e) { const message = (e as Error).message; if (message === 'TASK_NOT_FOUND') return jsonError(res, 404, 'not_found'); return jsonError(res, 409, 'invalid_transition', message); }
});
app.post('/api/tasks/:id/retry', (req, res) => {
  const u = getUser(req);
  if (!idParam.safeParse(req.params.id).success) return jsonError(res, 400, 'invalid_id');
  const task = ownedTask(req.params.id, u.id);
  if (!task) return jsonError(res, 404, 'not_found');
  const reason = executionBlockReason();
  recordTaskEvent(db, req.params.id, u.id, 'retry_blocked', reason);
  res.status(409).json({ error: 'execution_not_ready', message: reason, task });
});

app.post('/api/tasks/:id/messages', (req, res) => {
  const u = getUser(req);
  if (!idParam.safeParse(req.params.id).success) return jsonError(res, 400, 'invalid_id');
  const parsed = z.object({ body: text(1, 4000) }).safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, 'invalid_input');
  const task = ownedTask(req.params.id, u.id);
  if (!task) return jsonError(res, 404, 'not_found');
  const at = new Date().toISOString(), id = randomUUID();
  db.prepare('INSERT INTO messages(id,conversation_id,task_id,owner_id,speaker_type,body,created_at) VALUES(?,?,?,?,?,?,?)')
    .run(id, task.conversation_id, req.params.id, u.id, 'user', parsed.data.body, at);
  recordTaskEvent(db, req.params.id, u.id, 'message_added', '使用者在此任務留言。');
  appendAudit(db, u.id, u.id, 'task.message_added', 'task', req.params.id, { speakerType: 'user' });
  res.status(201).json({ id, speaker_type: 'user', body: parsed.data.body, created_at: at });
});

app.get('/api/tasks/:id/events', (req, res) => {
  const u = getUser(req);
  if (!idParam.safeParse(req.params.id).success || !ownedTask(req.params.id, u.id)) return jsonError(res, 404, 'not_found');
  const after = Math.max(0, Number(req.query.after || 0));
  if (!Number.isSafeInteger(after)) return jsonError(res, 400, 'invalid_cursor');
  res.json(db.prepare('SELECT * FROM task_events WHERE task_id=? AND owner_id=? AND id>? ORDER BY id').all(req.params.id, u.id, after));
});
app.get('/api/tasks/:id/stream', (req, res) => {
  const u = getUser(req);
  if (!idParam.safeParse(req.params.id).success || !ownedTask(req.params.id, u.id)) return jsonError(res, 404, 'not_found');
  res.status(200); res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders();
  let lastId = Math.max(0, Number(req.get('last-event-id') || req.query.after || 0));
  const pump = () => {
    const rows = db.prepare('SELECT * FROM task_events WHERE task_id=? AND owner_id=? AND id>? ORDER BY id LIMIT 100').all(req.params.id, u.id, lastId) as Array<{ id: number; event_type: string; [key: string]: unknown }>;
    for (const row of rows) { lastId = row.id; res.write(`id: ${row.id}\nevent: ${row.event_type}\ndata: ${JSON.stringify(row)}\n\n`); }
  };
  pump(); const timer = setInterval(pump, 1000);
  const heartbeat = setInterval(() => res.write(': keepalive\n\n'), 15000);
  res.on('close', () => { clearInterval(timer); clearInterval(heartbeat); });
});

app.post('/api/tasks/:id/sources', (req, res) => {
  const u = getUser(req);
  const parsed = z.object({ url: z.string().url().max(2000), title: text(1, 300), publisher: z.string().max(200).optional(), publishedAt: z.string().max(80).optional() }).safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, 'invalid_input');
  const task = ownedTask(req.params.id, u.id);
  if (!task) return jsonError(res, 404, 'not_found');
  const url = new URL(parsed.data.url);
  if (url.protocol !== 'https:') return jsonError(res, 400, 'https_required');
  const id = randomUUID(), at = new Date().toISOString();
  db.prepare(`INSERT INTO sources(id,task_id,conversation_id,owner_id,url,title,publisher,published_at,retrieved_at,verification_status,created_at)
    VALUES(?,?,?,?,?,?,?,?,NULL,'unverified',?)`).run(id, req.params.id, task.conversation_id, u.id, url.toString(), parsed.data.title, parsed.data.publisher || null, parsed.data.publishedAt || null, at);
  appendAudit(db, u.id, u.id, 'source.added', 'source', id, { verificationStatus: 'unverified' });
  res.status(201).json(db.prepare('SELECT * FROM sources WHERE id=?').get(id));
});
app.post('/api/tasks/:id/sources/:sourceId/evidence', (req, res) => {
  const u = getUser(req);
  const parsed = z.object({ excerpt: text(1, 5000), locator: z.string().max(300).optional() }).safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, 'invalid_input');
  const task = ownedTask(req.params.id, u.id);
  const source = db.prepare('SELECT * FROM sources WHERE id=? AND task_id=? AND owner_id=?').get(req.params.sourceId, req.params.id, u.id) as Record<string, unknown> | undefined;
  if (!task || !source) return jsonError(res, 404, 'not_found');
  const id = randomUUID(), at = new Date().toISOString();
  db.prepare('INSERT INTO evidence(id,source_id,task_id,owner_id,excerpt,locator,created_at) VALUES(?,?,?,?,?,?,?)').run(id, req.params.sourceId, req.params.id, u.id, parsed.data.excerpt, parsed.data.locator || null, at);
  appendAudit(db, u.id, u.id, 'evidence.added', 'evidence', id, { sourceId: req.params.sourceId });
  res.status(201).json({ id, source_id: req.params.sourceId, task_id: req.params.id, excerpt: parsed.data.excerpt, locator: parsed.data.locator || null, created_at: at });
});
app.post('/api/tasks/:id/claims', (req, res) => {
  const u = getUser(req);
  const parsed = z.object({ kind: z.enum(['source_fact','synthesis','uncertainty']), text: text(1, 3000), evidenceIds: z.array(z.string().uuid()).max(30).default([]) }).safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, 'invalid_input');
  if (!ownedTask(req.params.id, u.id)) return jsonError(res, 404, 'not_found');
  if (parsed.data.kind !== 'uncertainty' && parsed.data.evidenceIds.length === 0) return jsonError(res, 400, 'evidence_required_for_claim');
  const ids = [...new Set(parsed.data.evidenceIds)];
  if (ids.length !== parsed.data.evidenceIds.length) return jsonError(res, 400, 'duplicate_evidence');
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const valid = db.prepare(`SELECT id FROM evidence WHERE owner_id=? AND task_id=? AND id IN (${placeholders})`).all(u.id, req.params.id, ...ids);
    if (valid.length !== ids.length) return jsonError(res, 400, 'evidence_out_of_scope');
  }
  const id = randomUUID(), at = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO claims(id,task_id,owner_id,kind,text,verification_status,created_at) VALUES(?,?,?,?,?,?,?)').run(id, req.params.id, u.id, parsed.data.kind, parsed.data.text, 'unreviewed', at);
    const add = db.prepare('INSERT INTO claim_evidence(claim_id,evidence_id) VALUES(?,?)');
    for (const evidenceId of ids) add.run(id, evidenceId);
    appendAudit(db, u.id, u.id, 'claim.added', 'claim', id, { kind: parsed.data.kind, evidenceCount: ids.length });
  });
  tx(); res.status(201).json(db.prepare('SELECT * FROM claims WHERE id=?').get(id));
});

app.post('/api/tasks/:id/approvals', (req, res) => {
  const u = getUser(req);
  const parsed = z.object({ action: text(1, 120), payload: z.record(z.unknown()) }).safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, 'invalid_input');
  if (!ownedTask(req.params.id, u.id)) return jsonError(res, 404, 'not_found');
  const payloadJson = JSON.stringify(parsed.data.payload), payloadHash = hashPayload(parsed.data.payload);
  const id = randomUUID(), at = new Date().toISOString(), expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO approvals(id,task_id,owner_id,action,payload_json,payload_hash,status,expires_at,created_at)
    VALUES(?,?,?,?,?,?,'pending',?,?)`).run(id, req.params.id, u.id, parsed.data.action, payloadJson, payloadHash, expires, at);
  recordTaskEvent(db, req.params.id, u.id, 'approval_required', '需要使用者明確核准此精確動作與參數；此平台目前沒有外部執行器。', undefined, 'waiting for user');
  appendAudit(db, u.id, u.id, 'approval.requested', 'approval', id, { action: parsed.data.action, payloadHash, expiresAt: expires });
  res.status(201).json({ id, action: parsed.data.action, payload: parsed.data.payload, payloadHash, status: 'pending', expiresAt: expires, executionAvailable: false });
});
app.post('/api/approvals/:id/approve', (req, res) => {
  const u = getUser(req);
  const parsed = z.object({ confirm: z.literal(true), payload: z.record(z.unknown()) }).safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, 'explicit_exact_payload_confirmation_required');
  const approval = db.prepare('SELECT * FROM approvals WHERE id=? AND owner_id=?').get(req.params.id, u.id) as { id: string; status: string; payload_hash: string; expires_at: string; action: string } | undefined;
  if (!approval) return jsonError(res, 404, 'not_found');
  if (approval.status !== 'pending') return jsonError(res, 409, 'approval_not_pending');
  if (approval.expires_at <= new Date().toISOString()) { db.prepare("UPDATE approvals SET status='expired' WHERE id=?").run(approval.id); return jsonError(res, 410, 'approval_expired'); }
  if (hashPayload(parsed.data.payload) !== approval.payload_hash) return jsonError(res, 409, 'payload_mismatch', '參數已變更，必須重新呈現並核准新的精確內容。');
  const at = new Date().toISOString();
  db.prepare("UPDATE approvals SET status='approved',approved_at=? WHERE id=? AND owner_id=? AND status='pending'").run(at, approval.id, u.id);
  appendAudit(db, u.id, u.id, 'approval.approved', 'approval', approval.id, { action: approval.action, payloadHash: approval.payload_hash });
  res.json({ id: approval.id, status: 'approved', executionAvailable: false, message: '核准已記錄；目前沒有外部執行器，因此未發送、發布或改變外部狀態。' });
});
app.post('/api/approvals/:id/reject', (req, res) => {
  const u = getUser(req);
  const parsed = z.object({ confirm: z.literal(true), payloadHash: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, 'explicit_exact_payload_confirmation_required');
  const approval = db.prepare('SELECT id,task_id,status,payload_hash,expires_at,action FROM approvals WHERE id=? AND owner_id=?').get(req.params.id, u.id) as { id: string; task_id: string; status: string; payload_hash: string; expires_at: string; action: string } | undefined;
  if (!approval) return jsonError(res, 404, 'not_found');
  if (approval.status !== 'pending') return jsonError(res, 409, 'approval_not_pending');
  if (approval.expires_at <= new Date().toISOString()) { db.prepare("UPDATE approvals SET status='expired' WHERE id=? AND owner_id=?").run(approval.id, u.id); return jsonError(res, 410, 'approval_expired'); }
  if (parsed.data.payloadHash !== approval.payload_hash) return jsonError(res, 409, 'payload_mismatch', '核准內容已變更，請重新檢視精確參數。');
  db.prepare("UPDATE approvals SET status='rejected' WHERE id=? AND owner_id=? AND status='pending'").run(approval.id, u.id);
  appendAudit(db, u.id, u.id, 'approval.rejected', 'approval', approval.id, { action: approval.action, payloadHash: approval.payload_hash });
  recordTaskEvent(db, approval.task_id, u.id, 'approval_rejected', '使用者拒絕了已展示的精確動作；目前沒有外部執行器。', undefined, 'waiting for user');
  res.json({ id: approval.id, status: 'rejected', executionAvailable: false, message: '拒絕已記錄；未執行外部操作。' });
});
app.get('/api/audit', (req, res) => {
  const u = getUser(req);
  res.json(db.prepare('SELECT id,actor_id,action,target_type,target_id,metadata_json,created_at FROM audit_log WHERE owner_id=? ORDER BY id DESC LIMIT 200').all(u.id));
});
app.use('/api', (_req, res) => jsonError(res, 404, 'not_found'));

function nextError(error: unknown, res: Response) {
  if (error instanceof Error && error.message.includes('FOREIGN KEY')) return jsonError(res, 400, 'invalid_relationship');
  return jsonError(res, 500, 'internal_error');
}
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;
  if (error instanceof SyntaxError) { res.status(400).json({ error: 'invalid_json' }); return; }
  nextError(error, res);
});

if (config.NODE_ENV === 'production') {
  const webDist = [resolve(process.cwd(), 'apps/web/dist'), resolve(process.cwd(), '../web/dist'), resolve(process.cwd(), '../../apps/web/dist')].find(existsSync);
  if (webDist) {
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => res.sendFile(resolve(webDist, 'index.html')));
  }
}

const server = app.listen(config.PORT, '127.0.0.1', () => {
  console.log(`Reasona API listening on http://127.0.0.1:${config.PORT} (${config.NODE_ENV}; auth=${config.AUTH_MODE}; model=${getProviderReadiness(process.env).ready ? 'configured' : 'not ready'})`);
});
const close = () => { server.close(() => { db.close(); process.exit(0); }); };
process.on('SIGINT', close); process.on('SIGTERM', close);
export { app, db };
