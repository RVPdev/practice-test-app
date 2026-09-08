import { describe, expect, it } from '@jest/globals';
import { questionSetSchema } from './schema';

const minimalSet = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Set One',
  questions: [
    {
      id: 'q-001',
      type: 'single',
      prompt: 'Which one?',
      options: [
        { id: 'a', text: 'Right', correct: true },
        { id: 'b', text: 'Wrong', correct: false },
      ],
    },
  ],
};

describe('questionSetSchema', () => {
  it('accepts a minimal valid set', () => {
    const result = questionSetSchema.safeParse(minimalSet);
    expect(result.success).toBe(true);
  });

  it('accepts the full envelope', () => {
    const result = questionSetSchema.safeParse({
      ...minimalSet,
      description: 'A set',
      version: '1.2.0',
      author: 'rvp',
      language: 'en',
      topics: [{ id: 'vpc', name: 'Networking' }],
      exam: {
        questionCount: 65,
        timeLimitMinutes: 90,
        passingScore: 72,
        shuffleQuestions: true,
        shuffleOptions: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a set with no questions', () => {
    const result = questionSetSchema.safeParse({ ...minimalSet, questions: [] });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields anywhere', () => {
    const result = questionSetSchema.safeParse({ ...minimalSet, nickname: 'oops' });
    expect(result.success).toBe(false);
  });

  it('rejects a passingScore outside 0-100', () => {
    const result = questionSetSchema.safeParse({
      ...minimalSet,
      exam: { passingScore: 140 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional question metadata', () => {
    const result = questionSetSchema.safeParse({
      ...minimalSet,
      topics: [{ id: 'vpc', name: 'Networking' }],
      questions: [
        {
          ...minimalSet.questions[0],
          topicId: 'vpc',
          difficulty: 'medium',
          explanation: 'Because.',
          media: { type: 'image', source: 'https://example.com/a.png', alt: 'A' },
          reference: { label: 'Docs', url: 'https://example.com/docs' },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-https media source', () => {
    const result = questionSetSchema.safeParse({
      ...minimalSet,
      questions: [
        {
          ...minimalSet.questions[0],
          media: { type: 'image', source: 'file:///home/rvp/a.png', alt: 'A' },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a boolean question with no options', () => {
    const result = questionSetSchema.safeParse({
      ...minimalSet,
      questions: [
        { id: 'q-002', type: 'boolean', prompt: 'True or false?', answer: true },
      ],
    });
    expect(result.success).toBe(true);
  });
});

const wrap = (questions: unknown[], extra: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  id: 'set-1',
  title: 'Set One',
  questions,
  ...extra,
});

const ordering = {
  id: 'q-ord',
  type: 'ordering',
  prompt: 'Put these in order',
  items: [
    { id: 'i1', text: 'First' },
    { id: 'i2', text: 'Second' },
  ],
  correctOrder: ['i1', 'i2'],
};

const matching = {
  id: 'q-mat',
  type: 'matching',
  prompt: 'Match these',
  left: [{ id: 'l1', text: 'S3' }],
  right: [
    { id: 'r1', text: 'Object storage' },
    { id: 'r2', text: 'Block storage' },
  ],
  pairs: [{ left: 'l1', right: 'r1' }],
};

describe('ordering and matching questions', () => {
  it('accepts a valid ordering question', () => {
    expect(questionSetSchema.safeParse(wrap([ordering])).success).toBe(true);
  });

  it('rejects a correctOrder that is not a permutation of the items', () => {
    const bad = { ...ordering, correctOrder: ['i1', 'i3'] };
    expect(questionSetSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('rejects a correctOrder that repeats an item', () => {
    const bad = { ...ordering, correctOrder: ['i1', 'i1'] };
    expect(questionSetSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('accepts a valid matching question with an unused right item', () => {
    expect(questionSetSchema.safeParse(wrap([matching])).success).toBe(true);
  });

  it('rejects a pair referencing an undeclared right id', () => {
    const bad = { ...matching, pairs: [{ left: 'l1', right: 'r9' }] };
    expect(questionSetSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('rejects a left item used in two pairs', () => {
    const bad = { ...matching, pairs: [{ left: 'l1', right: 'r1' }, { left: 'l1', right: 'r2' }] };
    expect(questionSetSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  // A matching response travels as `left:right`, so a colon in either id would corrupt it.
  it('rejects a matching left id containing a colon', () => {
    const bad = {
      ...matching,
      left: [{ id: 'l:1', text: 'S3' }],
      pairs: [{ left: 'l:1', right: 'r1' }],
    };
    const result = questionSetSchema.safeParse(wrap([bad]));
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('must not contain');
  });

  it('rejects a matching right id containing a colon', () => {
    const bad = {
      ...matching,
      right: [{ id: 'r:1', text: 'Object storage' }],
      pairs: [{ left: 'l1', right: 'r:1' }],
    };
    expect(questionSetSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('still allows a colon in ids that are never packed into a pair string', () => {
    const withColons = {
      ...ordering,
      items: [
        { id: 'i:1', text: 'First' },
        { id: 'i:2', text: 'Second' },
      ],
      correctOrder: ['i:1', 'i:2'],
    };
    expect(questionSetSchema.safeParse(wrap([withColons])).success).toBe(true);
  });
});

describe('cross-field rules', () => {
  const single = (over: Record<string, unknown> = {}) => ({
    id: 'q-1',
    type: 'single',
    prompt: 'Which?',
    options: [
      { id: 'a', text: 'A', correct: true },
      { id: 'b', text: 'B', correct: false },
    ],
    ...over,
  });

  it('rejects duplicate question ids', () => {
    expect(questionSetSchema.safeParse(wrap([single(), single()])).success).toBe(false);
  });

  it('rejects duplicate option ids within a question', () => {
    const bad = single({
      options: [
        { id: 'a', text: 'A', correct: true },
        { id: 'a', text: 'B', correct: false },
      ],
    });
    expect(questionSetSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('rejects a single question with two correct options', () => {
    const bad = single({
      options: [
        { id: 'a', text: 'A', correct: true },
        { id: 'b', text: 'B', correct: true },
      ],
    });
    expect(questionSetSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('rejects a single question with no correct option', () => {
    const bad = single({
      options: [
        { id: 'a', text: 'A', correct: false },
        { id: 'b', text: 'B', correct: false },
      ],
    });
    expect(questionSetSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('accepts a multi question with two correct options', () => {
    const ok = single({
      type: 'multi',
      options: [
        { id: 'a', text: 'A', correct: true },
        { id: 'b', text: 'B', correct: true },
        { id: 'c', text: 'C', correct: false },
      ],
    });
    expect(questionSetSchema.safeParse(wrap([ok])).success).toBe(true);
  });

  it('rejects a multi question with no correct option', () => {
    const bad = single({
      type: 'multi',
      options: [
        { id: 'a', text: 'A', correct: false },
        { id: 'b', text: 'B', correct: false },
      ],
    });
    expect(questionSetSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('rejects a topicId that is not declared in topics', () => {
    const parsed = questionSetSchema.safeParse(
      wrap([single({ topicId: 'vpc ' })], { topics: [{ id: 'vpc', name: 'Networking' }] }),
    );
    expect(parsed.success).toBe(false);
  });

  it('allows any topicId when topics is absent', () => {
    expect(questionSetSchema.safeParse(wrap([single({ topicId: 'anything' })])).success).toBe(true);
  });
});
