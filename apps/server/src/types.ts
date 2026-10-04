export const TASK_STATUSES = [
  'queued',
  'running',
  'waiting for user',
  'completed',
  'failed',
  'cancelled'
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type ClaimKind = 'source_fact' | 'synthesis' | 'uncertainty';
export type AuthenticatedUser = { id: string; email: string; name: string; authMode: 'local' | 'google' };

export interface TaskRecord {
  id: string;
  conversation_id: string;
  owner_id: string;
  personal_agent_id: string | null;
  prompt: string;
  title: string;
  status: TaskStatus;
  phase: string;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskEventRecord {
  id: number;
  task_id: string;
  conversation_id: string;
  owner_id: string;
  status: TaskStatus;
  phase: string;
  event_type: string;
  detail: string;
  created_at: string;
}
