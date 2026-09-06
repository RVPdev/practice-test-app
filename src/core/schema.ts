import { z } from 'zod';

export const SCHEMA_VERSION = 1;

const idSchema = z.string().min(1).max(120);
const nonEmpty = z.string().min(1);

export const mediaSchema = z
  .object({
    type: z.literal('image'),
    // Spec §3.6: an imported file travels alone, so local paths are rejected.
    // `asset:` is the bundled-set escape hatch.
    source: z.string().regex(/^(https:\/\/|asset:)/, {
      message: 'must be an https:// URL or an asset: path',
    }),
    alt: nonEmpty,
  })
  .strict();

export const referenceSchema = z
  .object({ label: nonEmpty, url: z.string().url() })
  .strict();

export const topicSchema = z.object({ id: idSchema, name: nonEmpty }).strict();

export const examSchema = z
  .object({
    questionCount: z.number().int().positive().optional(),
    timeLimitMinutes: z.number().int().positive().optional(),
    passingScore: z.number().min(0).max(100).optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
  })
  .strict();

export const optionSchema = z
  .object({
    id: idSchema,
    text: nonEmpty,
    correct: z.boolean(),
    explanation: z.string().optional(),
  })
  .strict();

const questionHead = {
  id: idSchema,
  topicId: idSchema.optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  prompt: nonEmpty,
  media: mediaSchema.optional(),
  explanation: z.string().optional(),
  reference: referenceSchema.optional(),
};

export const choiceQuestionSchema = z
  .object({
    ...questionHead,
    type: z.enum(['single', 'multi']),
    options: z.array(optionSchema).min(2),
  })
  .strict();

export const booleanQuestionSchema = z
  .object({
    ...questionHead,
    type: z.literal('boolean'),
    answer: z.boolean(),
    labels: z.object({ true: nonEmpty, false: nonEmpty }).strict().optional(),
  })
  .strict();

export const questionSchema = z.discriminatedUnion('type', [
  choiceQuestionSchema,
  booleanQuestionSchema,
]);

export const questionSetSchema = z
  .object({
    schemaVersion: z.number().int(),
    id: idSchema,
    title: nonEmpty,
    description: z.string().optional(),
    version: z.string().optional(),
    author: z.string().optional(),
    language: z.string().optional(),
    topics: z.array(topicSchema).optional(),
    exam: examSchema.optional(),
    questions: z.array(questionSchema).min(1),
  })
  .strict();

export type Media = z.infer<typeof mediaSchema>;
export type Reference = z.infer<typeof referenceSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type ExamConfig = z.infer<typeof examSchema>;
export type Option = z.infer<typeof optionSchema>;
export type ChoiceQuestion = z.infer<typeof choiceQuestionSchema>;
export type BooleanQuestion = z.infer<typeof booleanQuestionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type QuestionSet = z.infer<typeof questionSetSchema>;
export type QuestionType = Question['type'];
