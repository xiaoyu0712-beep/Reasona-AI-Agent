import { describe, expect, it } from 'vitest';
import { hasWebGPU, loadLocalModel } from './model';

describe('local model readiness gate', () => {
  it('does not initialize or fall back when WebGPU is unavailable', async () => {
    expect(hasWebGPU()).toBe(false);
    await expect(loadLocalModel(() => undefined)).rejects.toThrow(/WebGPU/);
  });
});
