import { z } from 'zod';

export const TASK_STATUSES = ['queued', 'running', 'waiting for user', 'completed', 'failed', 'cancelled'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

const transitions: Record<TaskStatus, readonly TaskStatus[]> = {
  queued: ['running', 'failed', 'cancelled'],
  running: ['waiting for user', 'completed', 'failed', 'cancelled'],
  'waiting for user': ['queued', 'running', 'completed', 'failed', 'cancelled'],
  completed: [],
  failed: ['queued', 'cancelled'],
  cancelled: []
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return transitions[from].includes(to);
}

export function transitionStatus(from: TaskStatus, to: TaskStatus): TaskStatus {
  if (!canTransition(from, to)) throw new Error(`Invalid task transition: ${from} -> ${to}`);
  return to;
}

export function autoTitle(prompt: string): string {
  const compact = prompt.replace(/\s+/g, ' ').trim();
  return compact.length > 48 ? `${compact.slice(0, 47).trimEnd()}…` : compact || '新研究任務';
}

export function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password) return url.href;
  } catch { /* reject malformed stored or input URLs */ }
  return null;
}

const claimSchema = z.object({
  kind: z.enum(['source_fact', 'synthesis', 'uncertainty']),
  text: z.string().trim().min(1).max(1200),
  evidenceIds: z.array(z.string().min(1).max(100)).max(8).default([]),
  note: z.string().trim().max(1200).optional().default('')
}).strict();

const reviewSchema = z.object({
  claims: z.array(claimSchema).max(20),
  gaps: z.array(z.string().trim().min(1).max(500)).max(12).default([]),
  conflicts: z.array(z.string().trim().min(1).max(500)).max(12).default([])
}).strict();

export type ReviewOutput = z.infer<typeof reviewSchema>;

export function parseReviewOutput(raw: string, allowedEvidenceIds: ReadonlySet<string>): ReviewOutput {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { throw new Error('審閱代理沒有回傳可解析的 JSON；草稿已保留，請檢查或重試。'); }
  const parsed = reviewSchema.safeParse(value);
  if (!parsed.success) throw new Error(`審閱代理輸出不符合 schema：${parsed.error.issues[0]?.message || '格式錯誤'}`);

  const seen = new Set<string>();
  for (const claim of parsed.data.claims) {
    if (claim.kind !== 'uncertainty' && claim.evidenceIds.length === 0) {
      throw new Error('事實或綜合主張必須至少連結一段已登錄的 evidence；未建立該主張。');
    }
    if (new Set(claim.evidenceIds).size !== claim.evidenceIds.length) {
      throw new Error('主張包含重複的 evidence ID；未建立該主張。');
    }
    for (const evidenceId of claim.evidenceIds) {
      if (!allowedEvidenceIds.has(evidenceId)) {
        throw new Error(`主張引用不存在的 evidence ID「${evidenceId}」；未建立任何主張。`);
      }
      seen.add(evidenceId);
    }
  }
  return { ...parsed.data, claims: parsed.data.claims };
}
