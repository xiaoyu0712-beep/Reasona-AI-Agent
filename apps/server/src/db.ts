import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type ReasonaDatabase = Database.Database;

const schema = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  auth_mode TEXT NOT NULL CHECK (auth_mode IN ('local','google')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY, nonce TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, title_edited INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS conversations_owner_updated ON conversations(owner_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, role TEXT NOT NULL, description TEXT NOT NULL,
  instructions TEXT NOT NULL, allowed_sources_json TEXT NOT NULL DEFAULT '[]', version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  personal_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  personal_agent_version INTEGER, agent_snapshot_json TEXT,
  prompt TEXT NOT NULL, title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','waiting for user','completed','failed','cancelled')),
  phase TEXT NOT NULL, blocked_reason TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_owner_created ON tasks(owner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY, parent_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, assigned_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  agent_snapshot_json TEXT, status TEXT NOT NULL CHECK (status IN ('queued','running','waiting for user','completed','failed','cancelled')),
  phase TEXT NOT NULL, blocked_reason TEXT, result_summary TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS subtasks_parent_owner ON subtasks(parent_task_id,owner_id,created_at);
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, prompt TEXT NOT NULL, schedule_spec TEXT NOT NULL, timezone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('inactive','active','paused','waiting for scheduler')),
  next_run_at TEXT, last_run_at TEXT, last_result TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS schedules_owner_updated ON schedules(owner_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS task_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL, phase TEXT NOT NULL, event_type TEXT NOT NULL, detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS task_events_owner_id ON task_events(owner_id, id);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  speaker_type TEXT NOT NULL CHECK (speaker_type IN ('user','agent','system')),
  speaker_id TEXT, body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_conversation_time ON messages(conversation_id, created_at, id);
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL, title TEXT NOT NULL, publisher TEXT, published_at TEXT,
  retrieved_at TEXT, content_hash TEXT, verification_status TEXT NOT NULL DEFAULT 'unverified',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  excerpt TEXT NOT NULL, locator TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('source_fact','synthesis','uncertainty')),
  text TEXT NOT NULL, verification_status TEXT NOT NULL DEFAULT 'unreviewed', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS claim_evidence (
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  PRIMARY KEY(claim_id,evidence_id)
);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY, task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','expired','consumed','rejected')),
  expires_at TEXT NOT NULL, approved_at TEXT, consumed_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id TEXT NOT NULL,
  actor_id TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL,
  target_id TEXT NOT NULL, metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_owner_time ON audit_log(owner_id, id DESC);
`;

export function openDatabase(filename = process.env.DATABASE_PATH || './data/reasona.sqlite'): ReasonaDatabase {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(schema);
  const taskColumns = new Set((db.pragma('table_info(tasks)') as Array<{ name: string }>).map(column => column.name));
  if (!taskColumns.has('personal_agent_version')) db.exec('ALTER TABLE tasks ADD COLUMN personal_agent_version INTEGER');
  if (!taskColumns.has('agent_snapshot_json')) db.exec('ALTER TABLE tasks ADD COLUMN agent_snapshot_json TEXT');
  return db;
}
