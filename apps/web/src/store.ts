import type { TaskStatus } from './core';

export type Conversation = { id: string; title: string; createdAt: string; updatedAt: string; titleEdited: boolean };
export type AgentProfile = { id: string; name: string; role: string; instructions: string; createdAt: string; updatedAt: string };
export type TaskEvent = { id: string; status: TaskStatus; phase: string; detail: string; createdAt: string };
export type Task = {
  id: string;
  conversationId: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  phase: string;
  blockedReason: string | null;
  agentSnapshot: Pick<AgentProfile, 'id' | 'name' | 'role' | 'instructions'>;
  sourceIds: string[];
  events: TaskEvent[];
  gaps: string[];
  conflicts: string[];
  createdAt: string;
  updatedAt: string;
};
export type SourceRecord = {
  id: string;
  evidenceId: string;
  conversationId: string;
  title: string;
  url: string;
  excerpt: string;
  locator: string;
  createdAt: string;
};
export type ChatMessage = {
  id: string;
  conversationId: string;
  taskId: string;
  speaker: 'user' | 'agent' | 'system';
  role: '使用者' | 'Planner' | 'Researcher' | 'Reviewer' | '系統';
  body: string;
  createdAt: string;
};
export type ClaimRecord = {
  id: string;
  taskId: string;
  kind: 'source_fact' | 'synthesis' | 'uncertainty';
  text: string;
  evidenceIds: string[];
  note: string;
  reviewedAt: string | null;
};
export type AuditEvent = { id: string; action: string; entityType: string; entityId: string; at: string };

export type LocalAppState = {
  conversations: Conversation[];
  agents: AgentProfile[];
  tasks: Task[];
  sources: SourceRecord[];
  messages: ChatMessage[];
  claims: ClaimRecord[];
  auditEvents: AuditEvent[];
};

export const DB_NAME = 'reasona-local-workspace-v1';
const STORE_NAME = 'snapshots';
const ROOT_KEY = 'root';

export const newId = () => crypto.randomUUID();
export const isoNow = () => new Date().toISOString();

export function createInitialState(): LocalAppState {
  const at = isoNow();
  return {
    conversations: [],
    agents: [{
      id: 'builtin-research-lead',
      name: 'Research Lead',
      role: '來源密集研究統籌',
      instructions: '以繁體中文工作。只根據使用者提供的來源片段提出候選主張；區分來源直接支持、跨來源綜合與不確定性。不得補造作者、日期、引文或搜尋結果。所有生成內容都需要人工核對。',
      createdAt: at,
      updatedAt: at
    }],
    tasks: [],
    sources: [],
    messages: [],
    claims: [],
    auditEvents: []
  };
}

let openPromise: Promise<IDBDatabase> | undefined;
function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('此瀏覽器不支援 IndexedDB；請使用支援的 HTTPS 現代瀏覽器。'));
  if (!openPromise) {
    openPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('無法開啟本機資料庫。'));
    });
  }
  return openPromise;
}

export async function loadState(): Promise<LocalAppState | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(ROOT_KEY);
    request.onsuccess = () => resolve((request.result as LocalAppState | undefined) || null);
    request.onerror = () => reject(request.error || new Error('無法讀取本機資料。'));
  });
}

export async function saveState(state: LocalAppState): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(state, ROOT_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('無法保存本機資料。'));
    transaction.onabort = () => reject(transaction.error || new Error('本機資料保存已取消。'));
  });
}

export async function clearLocalDatabase(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(ROOT_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('無法刪除本機資料。'));
  });
}
