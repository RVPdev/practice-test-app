// src/data/exportSet.test.ts
import { describe, expect, it } from '@jest/globals';
import { validateSet } from '@/core/validate';
import type { QuestionSet } from '@/core/schema';
import { buildExportPayload } from './exportSet';

const sampleSet: QuestionSet = {
  schemaVersion: 1,
  id: 'demo-set-ab12cd',
  title: 'Demo Set',
  questions: [{ id: 'q1', type: 'boolean', prompt: 'Is this a test?', answer: true }],
};

describe('buildExportPayload', () => {
  it('throws for a bundled set', () => {
    expect(() => buildExportPayload(sampleSet, 'bundled')).toThrow(/bundled/i);
  });

  it('does not throw for an imported set', () => {
    expect(() => buildExportPayload(sampleSet, 'imported')).not.toThrow();
  });

  it('names the file after the set id', () => {
    expect(buildExportPayload(sampleSet, 'imported').filename).toBe('demo-set-ab12cd.json');
  });

  it('produces JSON that round-trips through validateSet unchanged', () => {
    const { json } = buildExportPayload(sampleSet, 'imported');
    const result = validateSet(JSON.parse(json));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.set).toEqual(sampleSet);
    }
  });
});
