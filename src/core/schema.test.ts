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
