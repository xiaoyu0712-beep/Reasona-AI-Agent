import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db.js';
import { createTask, hashPayload, shortTitle, transitionTask } from '../src/domain.js';
import { getProviderReadiness, chatCompletion, ProviderNotReadyError } from '../src/provider.js';
import { loadConfig } from '../src/env.js';

function fixture() {
  const db = openDatabase(':memory:');
  const at = new Date().toISOString();
  db.prepare('INSERT INTO users(id,email,name,auth_mode,created_at) VALUES(?,?,?,?,?)').run('u1','u1@example.test','One','local',at);
  db.prepare('INSERT INTO users(id,email,name,auth_mode,created_at) VALUES(?,?,?,?,?)').run('u2','u2@example.test','Two','local',at);
  return db;
}

test('task creation persists queued then blocked status and never invents agent messages', () => {
  const db = fixture();
  try {
    const task = createTask(db, { ownerId: 'u1', prompt: '比較三種公開資料來源的更新頻率', providerReason: '尚未設定模型 provider。' }) as any;
    assert.equal(task.status, 'waiting for user');
    assert.equal(task.phase, 'provider setup');
    const events = db.prepare('SELECT status,event_type FROM task_events WHERE task_id=? ORDER BY id').all(task.id) as any[];
    assert.deepEqual(events.map(e => [e.status, e.event_type]), [['queued','task_queued'],['waiting for user','status_changed']]);
    const messages = db.prepare('SELECT speaker_type FROM messages WHERE task_id=?').all(task.id) as any[];
    assert.deepEqual(messages.map(m => m.speaker_type), ['user']);
  } finally { db.close(); }
});

test('owner-scoped task lookups do not expose another user data', () => {
  const db = fixture();
  try {
    const task = createTask(db, { ownerId: 'u1', prompt: '研究某公開政策文件及其來源', providerReason: 'AI 尚未就緒。' }) as any;
    assert.equal(db.prepare('SELECT id FROM tasks WHERE id=? AND owner_id=?').get(task.id, 'u2'), undefined);
    assert.equal(db.prepare('SELECT id FROM conversations WHERE id=? AND owner_id=?').get(task.conversation_id, 'u2'), undefined);
  } finally { db.close(); }
});

test('terminal transitions are enforced and cancellation is persisted', () => {
  const db = fixture();
  try {
    const task = createTask(db, { ownerId: 'u1', prompt: '檢視兩個來源並保留不確定性', providerReason: '等待設定。' }) as any;
    transitionTask(db, task.id, 'u1', 'cancelled', 'cancelled', '使用者已取消任務。');
    assert.equal((db.prepare('SELECT status FROM tasks WHERE id=?').get(task.id) as any).status, 'cancelled');
    assert.throws(() => transitionTask(db, task.id, 'u1', 'completed', 'done', 'done'), /INVALID_TRANSITION/);
  } finally { db.close(); }
});

test('task keeps the selected personal-agent configuration version as an immutable snapshot', () => {
  const db = fixture();
  try {
    const at = new Date().toISOString();
    db.prepare(`INSERT INTO agents(id,owner_id,name,role,description,instructions,allowed_sources_json,version,created_at,updated_at)
      VALUES('agent-1','u1','研究助理','研究','描述','只記錄來源','[]',3,?,?)`).run(at, at);
    const task = createTask(db, { ownerId: 'u1', prompt: '以來源記錄呈現研究缺口', agentId: 'agent-1', providerReason: '等待設定。' }) as any;
    assert.equal(task.personal_agent_version, 3);
    assert.equal(JSON.parse(task.agent_snapshot_json).name, '研究助理');
    db.prepare("UPDATE agents SET name='改名後的 Agent',version=4 WHERE id='agent-1'").run();
    const snapshot = JSON.parse((db.prepare('SELECT agent_snapshot_json FROM tasks WHERE id=?').get(task.id) as any).agent_snapshot_json);
    assert.equal(snapshot.name, '研究助理');
    assert.equal(snapshot.version, 3);
  } finally { db.close(); }
});

test('source facts require evidence and evidence foreign keys cascade', () => {
  const db = fixture();
  try {
    const task = createTask(db, { ownerId: 'u1', prompt: '比較資料來源並指出證據缺口', providerReason: '等待設定。' }) as any;
    const at = new Date().toISOString();
    const sourceId = 'source-one';
    db.prepare(`INSERT INTO sources(id,task_id,conversation_id,owner_id,url,title,retrieved_at,verification_status,created_at)
      VALUES(?,?,?,?,?,?,?,'unverified',?)`).run(sourceId, task.id, task.conversation_id, 'u1', 'https://example.test/page', 'Example', at, at);
    const evidenceId = 'evidence-one';
    db.prepare('INSERT INTO evidence(id,source_id,task_id,owner_id,excerpt,created_at) VALUES(?,?,?,?,?,?)')
      .run(evidenceId, sourceId, task.id, 'u1', 'Source quote supplied by the user', at);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM evidence WHERE task_id=? AND owner_id=?').get(task.id, 'u1') as any).n, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM evidence WHERE task_id=? AND owner_id=?').get(task.id, 'u2') as any).n, 0);
    db.prepare('DELETE FROM conversations WHERE id=?').run(task.conversation_id);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM sources WHERE id=?').get(sourceId) as any).n, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM evidence WHERE id=?').get(evidenceId) as any).n, 0);
  } finally { db.close(); }
});

test('provider defaults fail closed and adapter refuses an unconfigured request', async () => {
  const result = getProviderReadiness({ MODEL_PROVIDER: 'none' });
  assert.equal(result.ready, false);
  assert.equal(result.provider, 'none');
  await assert.rejects(() => chatCompletion([{ role: 'user', content: 'test' }], { MODEL_PROVIDER: 'none' }), ProviderNotReadyError);
});

test('provider requires all explicit server-side fields and execution opt-in', async () => {
  const env = { NODE_ENV: 'test', MODEL_PROVIDER: 'openai-compatible', MODEL_BASE_URL: 'http://127.0.0.1:9999/v1', MODEL_API_KEY: 'test-only', MODEL_NAME: 'test-model', RESEARCH_EXECUTION_ENABLED: 'false' };
  assert.equal(getProviderReadiness(env).ready, true);
  await assert.rejects(() => chatCompletion([{ role: 'user', content: 'test' }], env), ProviderNotReadyError);
});

test('production rejects local auth and weak session secret', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production', AUTH_MODE: 'local' }), /AUTH_MODE=google/);
  const secureOrigin = { APP_ORIGIN: 'https://reasona.example.test' };
  assert.throws(() => loadConfig({ NODE_ENV: 'production', AUTH_MODE: 'google', ...secureOrigin, SESSION_SECRET: 'short' }), /SESSION_SECRET/);
  assert.throws(() => loadConfig({ NODE_ENV: 'production', AUTH_MODE: 'google', ...secureOrigin, SESSION_SECRET: 'a'.repeat(32) }), /Google OAuth production config is incomplete/);
});

test('approval payload hash is stable across object key order and changes with values', () => {
  assert.equal(hashPayload({ b: 2, a: 1 }), hashPayload({ a: 1, b: 2 }));
  assert.notEqual(hashPayload({ a: 1 }), hashPayload({ a: 2 }));
});

test('automatic conversation titles are derived from input and bounded', () => {
  assert.equal(shortTitle('  新的研究  任務\n標題 '), '新的研究 任務 標題');
  assert.equal(shortTitle('x'.repeat(100)).length, 54);
});
