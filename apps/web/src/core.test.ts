import { describe, expect, it } from 'vitest';
import { autoTitle, canTransition, parseReviewOutput, safeHttpUrl, transitionStatus } from './core';

describe('task status state machine', () => {
  it('allows only documented transitions', () => {
    expect(canTransition('queued', 'running')).toBe(true);
    expect(canTransition('running', 'waiting for user')).toBe(true);
    expect(canTransition('completed', 'running')).toBe(false);
    expect(() => transitionStatus('completed', 'running')).toThrow('Invalid task transition');
  });
});

describe('source claim validation', () => {
  it('accepts source claims only when they reference a supplied evidence id', () => {
    const parsed = parseReviewOutput(JSON.stringify({ claims: [{ kind: 'source_fact', text: '候選主張', evidenceIds: ['ev-1'] }], gaps: [], conflicts: [] }), new Set(['ev-1']));
    expect(parsed.claims[0]?.evidenceIds).toEqual(['ev-1']);
  });

  it('rejects fabricated evidence ids and unsupported factual claims', () => {
    expect(() => parseReviewOutput(JSON.stringify({ claims: [{ kind: 'source_fact', text: '不明主張', evidenceIds: ['made-up'] }] }), new Set(['ev-1']))).toThrow('不存在的 evidence ID');
    expect(() => parseReviewOutput(JSON.stringify({ claims: [{ kind: 'synthesis', text: '沒有證據', evidenceIds: [] }] }), new Set())).toThrow('至少連結一段');
  });

  it('allows uncertainty without inventing a citation and rejects invalid JSON', () => {
    const parsed = parseReviewOutput(JSON.stringify({ claims: [{ kind: 'uncertainty', text: '目前沒有來源可以回答。', evidenceIds: [] }], gaps: [], conflicts: [] }), new Set());
    expect(parsed.claims[0]?.kind).toBe('uncertainty');
    expect(() => parseReviewOutput('not json', new Set())).toThrow('沒有回傳可解析的 JSON');
  });
});

describe('conversation naming', () => {
  it('uses the actual request text and truncates long titles', () => {
    expect(autoTitle('  研究來源密集流程  ')).toBe('研究來源密集流程');
    expect(autoTitle('x'.repeat(60))).toHaveLength(48);
  });
});

describe('source URL safety', () => {
  it('allows HTTP(S) URLs but rejects executable schemes and embedded credentials', () => {
    expect(safeHttpUrl('https://example.org/research')).toBe('https://example.org/research');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:text/html,hello')).toBeNull();
    expect(safeHttpUrl('https://user:password@example.org/')).toBeNull();
  });
});
