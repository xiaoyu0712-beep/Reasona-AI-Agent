export interface ProviderReadiness {
  ready: boolean;
  provider: 'none' | 'openai-compatible';
  model: string | null;
  reason: string;
}

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

export class ProviderNotReadyError extends Error {
  constructor(message: string) { super(message); this.name = 'ProviderNotReadyError'; }
}

export function getProviderReadiness(env: NodeJS.ProcessEnv = process.env): ProviderReadiness {
  const provider = env.MODEL_PROVIDER || 'none';
  if (provider === 'none') {
    return { ready: false, provider: 'none', model: null, reason: '尚未設定模型 provider；Reasona 不會呼叫外部模型。' };
  }
  if (provider !== 'openai-compatible') {
    return { ready: false, provider: 'none', model: null, reason: 'MODEL_PROVIDER 僅支援 none 或明確設定的 openai-compatible。' };
  }
  const endpoint = env.MODEL_BASE_URL;
  const key = env.MODEL_API_KEY;
  const model = env.MODEL_NAME;
  if (!endpoint || !key || !model) {
    return { ready: false, provider: 'openai-compatible', model: model || null, reason: '需同時設定 MODEL_BASE_URL、MODEL_API_KEY 與 MODEL_NAME。' };
  }
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') {
      return { ready: false, provider: 'openai-compatible', model, reason: '正式環境 provider endpoint 必須使用 HTTPS。' };
    }
  } catch {
    return { ready: false, provider: 'openai-compatible', model, reason: 'MODEL_BASE_URL 不是有效 URL。' };
  }
  return { ready: true, provider: 'openai-compatible', model, reason: 'Provider 設定完整；來源研究工具仍須另行實作並啟用。' };
}

/** Calls only the explicitly configured server-side OpenAI-compatible endpoint. */
export async function chatCompletion(messages: ChatMessage[], env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const readiness = getProviderReadiness(env);
  if (!readiness.ready || readiness.provider !== 'openai-compatible') throw new ProviderNotReadyError(readiness.reason);
  if (env.RESEARCH_EXECUTION_ENABLED !== 'true') {
    throw new ProviderNotReadyError('研究執行尚未由管理者明確啟用；目前不會呼叫模型。');
  }
  const response = await fetch(`${env.MODEL_BASE_URL!.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.MODEL_API_KEY!}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.MODEL_NAME, messages, temperature: 0.2 }),
    signal: AbortSignal.timeout(Number(env.MODEL_TIMEOUT_MS || 30000))
  });
  if (!response.ok) throw new Error(`Model provider returned HTTP ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('Model provider returned an empty response.');
  return content;
}
