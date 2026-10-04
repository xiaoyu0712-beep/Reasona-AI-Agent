import { createHash, randomUUID } from 'node:crypto';
import type { ReasonaDatabase } from './db.js';
import type { TaskStatus } from './types.js';

const now = () => new Date().toISOString();
const allowed: Record<TaskStatus, TaskStatus[]> = {
  queued: ['running', 'waiting for user', 'failed', 'cancelled'],
  running: ['waiting for user', 'completed', 'failed', 'cancelled'],
  'waiting for user': ['queued', 'failed', 'cancelled'],
  completed: [], failed: ['queued'], cancelled: []
};

export function shortTitle(text: string): string {
  const cleaned = text.replace(/[\s\r\n]+/g, ' ').trim();
  return cleaned.length <= 54 ? cleaned : `${cleaned.slice(0, 53).trimEnd()}…`;
}

export function appendAudit(db: ReasonaDatabase, ownerId: string, actorId: string, action: string, targetType: string, targetId: string, metadata: unknown = {}): void {
  db.prepare('INSERT INTO audit_log(owner_id,actor_id,action,target_type,target_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)')
    .run(ownerId, actorId, action, targetType, targetId, JSON.stringify(metadata), now());
}

export function recordTaskEvent(db: ReasonaDatabase, taskId: string, ownerId: string, eventType: string, detail: string, status?: TaskStatus, phase?: string) {
  const task = db.prepare('SELECT * FROM tasks WHERE id=? AND owner_id=?').get(taskId, ownerId) as Record<string, unknown> | undefined;
  if (!task) throw new Error('TASK_NOT_FOUND');
  const eventStatus = status || task.status as TaskStatus;
  const eventPhase = phase || String(task.phase);
  const at = now();
  const result = db.prepare(`INSERT INTO task_events(task_id,conversation_id,owner_id,status,phase,event_type,detail,created_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(taskId, String(task.conversation_id), ownerId, eventStatus, eventPhase, eventType, detail, at);
  return db.prepare('SELECT * FROM task_events WHERE id=?').get(result.lastInsertRowid);
}

export function transitionTask(db: ReasonaDatabase, taskId: string, ownerId: string, next: TaskStatus, phase: string, detail: string, blockedReason: string | null = null) {
  const tx = db.transaction(() => {
    const current = db.prepare('SELECT * FROM tasks WHERE id=? AND owner_id=?').get(taskId, ownerId) as { status: TaskStatus } | undefined;
    if (!current) throw new Error('TASK_NOT_FOUND');
    if (!allowed[current.status].includes(next)) throw new Error(`INVALID_TRANSITION:${current.status}:${next}`);
    const at = now();
    db.prepare('UPDATE tasks SET status=?,phase=?,blocked_reason=?,updated_at=? WHERE id=? AND owner_id=?')
      .run(next, phase, blockedReason, at, taskId, ownerId);
    const event = recordTaskEvent(db, taskId, ownerId, 'status_changed', detail, next, phase);
    appendAudit(db, ownerId, ownerId, `task.${next.replaceAll(' ', '_')}`, 'task', taskId, { phase });
    return event;
  });
  return tx();
}

export function createTask(db: ReasonaDatabase, input: { ownerId: string; prompt: string; conversationId?: string; agentId?: string | null; providerReason: string }) {
  const taskId = randomUUID();
  const convId = input.conversationId || randomUUID();
  const title = shortTitle(input.prompt);
  const at = now();
  const tx = db.transaction(() => {
    if (input.conversationId) {
      const conversation = db.prepare('SELECT id,title,title_edited FROM conversations WHERE id=? AND owner_id=?').get(input.conversationId, input.ownerId) as { id: string; title: string; title_edited: number } | undefined;
      if (!conversation) throw new Error('CONVERSATION_NOT_FOUND');
      if (!conversation.title_edited && conversation.title === '新研究對話') {
        db.prepare('UPDATE conversations SET title=?,updated_at=? WHERE id=? AND owner_id=?').run(title, at, input.conversationId, input.ownerId);
      }
    } else {
      db.prepare('INSERT INTO conversations(id,owner_id,title,title_edited,created_at,updated_at) VALUES(?,?,?,0,?,?)')
        .run(convId, input.ownerId, title, at, at);
      appendAudit(db, input.ownerId, input.ownerId, 'conversation.created', 'conversation', convId, { source: 'task_creation' });
    }
    let agentSnapshot: Record<string, unknown> | null = null;
    if (input.agentId) {
      const agent = db.prepare('SELECT id,name,role,description,instructions,allowed_sources_json,version FROM agents WHERE id=? AND owner_id=?').get(input.agentId, input.ownerId) as { id: string; name: string; role: string; description: string; instructions: string; allowed_sources_json: string; version: number } | undefined;
      if (!agent) throw new Error('AGENT_NOT_FOUND');
      agentSnapshot = { id: agent.id, name: agent.name, role: agent.role, description: agent.description, instructions: agent.instructions, allowedSources: JSON.parse(agent.allowed_sources_json), version: agent.version };
    }
    db.prepare(`INSERT INTO tasks(id,conversation_id,owner_id,personal_agent_id,personal_agent_version,agent_snapshot_json,prompt,title,status,phase,blocked_reason,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,'queued',NULL,?,?)`).run(taskId, convId, input.ownerId, input.agentId || null,
      agentSnapshot?.version || null, agentSnapshot ? JSON.stringify(agentSnapshot) : null, input.prompt, title, 'queued', at, at);
    db.prepare(`INSERT INTO messages(id,conversation_id,task_id,owner_id,speaker_type,body,created_at)
      VALUES(?,?,?,?,?,?,?)`).run(randomUUID(), convId, taskId, input.ownerId, 'user', input.prompt, at);
    recordTaskEvent(db, taskId, input.ownerId, 'task_queued', '研究任務已建立並持久化。', 'queued', 'queued');
    transitionTask(db, taskId, input.ownerId, 'waiting for user', 'provider setup', input.providerReason, input.providerReason);
    appendAudit(db, input.ownerId, input.ownerId, 'task.created', 'task', taskId, { conversationId: convId, agentId: input.agentId || null });
  });
  tx();
  return db.prepare('SELECT * FROM tasks WHERE id=?').get(taskId);
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableJson(val)}`).join(',')}}`;
}

export function hashPayload(payload: unknown): string {
  return createHash('sha256').update(stableJson(payload)).digest('hex');
}
