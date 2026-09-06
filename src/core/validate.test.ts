import { describe, expect, it } from '@jest/globals';
import { UNSUPPORTED_VERSION_MESSAGE, formatErrors, parseSetFile, validateSet } from './validate';

const valid = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Set One',
  topics: [{ id: 'vpc', name: 'Networking' }],
  questions: [
    {
      id: 'q-001',
      type: 'single',
      topicId: 'vpc',
      prompt: 'Which one?',
      options: [
        { id: 'a', text: 'Right', correct: true },
        { id: 'b', text: 'Wrong', correct: false },
      ],
    },
  ],
};

describe('validateSet', () => {
  it('returns the typed set when valid', () => {
    const result = validateSet(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.set.questions).toHaveLength(1);
  });

  it('reports the version problem alone when schemaVersion is unsupported', () => {
    const result = validateSet({ ...valid, schemaVersion: 99, questions: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe(UNSUPPORTED_VERSION_MESSAGE);
    }
  });

  it('rejects a non-object payload', () => {
    const result = validateSet([1, 2, 3]);
    expect(result.ok).toBe(false);
  });

  it('locates a problem by question number and id', () => {
    const broken = {
      ...valid,
      questions: [
        {
          ...valid.questions[0],
          options: [
            { id: 'a', text: 'Right', correct: false },
            { id: 'b', text: 'Wrong', correct: false },
          ],
        },
      ],
    };
    const result = validateSet(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].location).toContain('Question 1 ("q-001")');
      expect(result.errors[0].message).toContain('correct option');
    }
  });

  it('locates an undeclared topicId', () => {
    const broken = {
      ...valid,
      questions: [{ ...valid.questions[0], topicId: 'vpc ' }],
    };
    const result = validateSet(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message.includes('not declared in topics'))).toBe(true);
    }
  });

  it('reports set-level problems against the file', () => {
    const result = validateSet({ ...valid, title: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].location).toBe('File');
  });

  it('reports every problem, not just the first', () => {
    const broken = {
      ...valid,
      questions: [
        { id: 'q-001', type: 'single', prompt: '', options: [] },
        { id: 'q-001', type: 'boolean', prompt: 'Dup id' },
      ],
    };
    const result = validateSet(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('parseSetFile', () => {
  it('parses valid JSON text', () => {
    expect(parseSetFile(JSON.stringify(valid)).ok).toBe(true);
  });

  it('reports unreadable JSON without throwing', () => {
    const result = parseSetFile('{ not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].message).toContain('not valid JSON');
  });
});

describe('formatErrors', () => {
  it('renders a counted, one-per-line report', () => {
    const text = formatErrors([
      { location: 'Question 12 ("q-012")', message: 'no option is marked "correct"' },
      { location: 'Question 31 ("q-031")', message: 'topicId "vpc " is not declared in topics' },
    ]);
    expect(text).toContain('2 problems found');
    expect(text).toContain('Question 12 ("q-012") — no option is marked "correct"');
  });

  it('uses the singular for one problem', () => {
    expect(formatErrors([{ location: 'File', message: 'bad' }])).toContain('1 problem found');
  });
});
