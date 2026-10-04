import type { ChatCompletionChunk, MLCEngine } from '@mlc-ai/web-llm';

export const MODEL_ID = 'Qwen3-0.6B-q4f16_1-MLC';
export const MODEL_DISPLAY_NAME = 'Qwen3-0.6B · q4f16_1';
export const MODEL_WEIGHT_BYTES = 351_517_143;
export const MODEL_CARD_URL = 'https://huggingface.co/Qwen/Qwen3-0.6B';
export const MLC_REPO_URL = 'https://huggingface.co/mlc-ai/Qwen3-0.6B-q4f16_1-MLC';
const MLC_REVISION = '8c14ce481d4c692769976ad52afea453a102df19';
const MLC_LIBRARY_REVISION = '025bcaf3780fa8254f5e5efd3bfea0a5397248f4';

let engine: MLCEngine | null = null;

export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && Boolean((navigator as Navigator & { gpu?: unknown }).gpu);
}

export async function loadLocalModel(onProgress: (text: string, progress: number) => void): Promise<MLCEngine> {
  if (!hasWebGPU()) throw new Error('此瀏覽器沒有可用的 WebGPU。請使用支援 WebGPU 的 HTTPS 瀏覽器與相容 GPU；沒有啟動任何遠端模型。');
  if (engine) return engine;
  const { CreateMLCEngine, prebuiltAppConfig } = await import('@mlc-ai/web-llm');
  const model = prebuiltAppConfig.model_list.find(item => item.model_id === MODEL_ID);
  if (!model) throw new Error(`目前鎖定的 WebLLM 套件未包含模型設定：${MODEL_ID}`);

  const pinnedModel = {
    ...model,
    model: `${MLC_REPO_URL}/resolve/${MLC_REVISION}`,
    model_lib: model.model_lib.replace('/main/', `/${MLC_LIBRARY_REVISION}/`)
  };
  engine = await CreateMLCEngine(MODEL_ID, {
    appConfig: {
      ...prebuiltAppConfig,
      cacheBackend: 'cache',
      model_list: [pinnedModel]
    },
    initProgressCallback: report => onProgress(report.text, report.progress)
  });
  return engine;
}

export async function streamLocalCompletion(
  activeEngine: MLCEngine,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  onDelta: (text: string) => void,
  jsonMode = false,
  maxTokens = 420
): Promise<string> {
  const result = await activeEngine.chat.completions.create({
    model: MODEL_ID,
    messages,
    stream: true,
    temperature: 0.2,
    max_tokens: maxTokens,
    extra_body: { enable_thinking: false },
    ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {})
  });
  let fullText = '';
  for await (const chunk of result as AsyncIterable<ChatCompletionChunk>) {
    const delta = chunk.choices[0]?.delta?.content;
    if (typeof delta === 'string' && delta.length) {
      fullText += delta;
      onDelta(delta);
    }
  }
  return fullText.trim();
}

export async function interruptLocalGeneration(): Promise<void> {
  if (engine) await engine.interruptGenerate();
}

export type { MLCEngine } from '@mlc-ai/web-llm';
