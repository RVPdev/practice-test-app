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

export const itemSchema = z.object({ id: idSchema, text: nonEmpty }).strict();

// A matching response is carried as `left:right` strings, so a colon inside either id
// would make the pair unparseable. Only matching is constrained - every other id stays
// free-form, because nothing else packs two ids into one string.
const matchingIdSchema = idSchema.refine((id) => !id.includes(':'), {
  message: 'a matching item id must not contain ":"',
});

export const matchingItemSchema = z
  .object({ id: matchingIdSchema, text: nonEmpty })
  .strict();

export const orderingQuestionSchema = z
  .object({
    ...questionHead,
    type: z.literal('ordering'),
    items: z.array(itemSchema).min(2),
    correctOrder: z.array(idSchema).min(2),
  })
  .strict();

export const matchingQuestionSchema = z
  .object({
    ...questionHead,
    type: z.literal('matching'),
    left: z.array(matchingItemSchema).min(1),
    right: z.array(matchingItemSchema).min(1),
    pairs: z
      .array(z.object({ left: matchingIdSchema, right: matchingIdSchema }).strict())
      .min(1),
  })
  .strict();

export const questionSchema = z.discriminatedUnion('type', [
  choiceQuestionSchema,
  booleanQuestionSchema,
  orderingQuestionSchema,
  matchingQuestionSchema,
]);

const uniqueIds = (items: { id: string }[]) =>
  new Set(items.map((i) => i.id)).size === items.length;

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
  .strict()
  .superRefine((set, ctx) => {
    const declared = set.topics ? new Set(set.topics.map((t) => t.id)) : null;
    const seen = new Set<string>();

    set.questions.forEach((question, index) => {
      const at = (...rest: (string | number)[]) => ['questions', index, ...rest];

      if (seen.has(question.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate question id "${question.id}"`,
          path: at('id'),
        });
      }
      seen.add(question.id);

      if (question.topicId && declared && !declared.has(question.topicId)) {
        ctx.addIssue({
          code: 'custom',
          message: `topicId "${question.topicId}" is not declared in topics`,
          path: at('topicId'),
        });
      }

      if (question.type === 'single' || question.type === 'multi') {
        if (!uniqueIds(question.options)) {
          ctx.addIssue({ code: 'custom', message: 'option ids must be unique', path: at('options') });
        }
        const correct = question.options.filter((o) => o.correct).length;
        if (question.type === 'single' && correct !== 1) {
          ctx.addIssue({
            code: 'custom',
            message: `a single-choice question needs exactly one correct option (found ${correct})`,
            path: at('options'),
          });
        }
        if (question.type === 'multi' && correct < 1) {
          ctx.addIssue({
            code: 'custom',
            message: 'a multi-choice question needs at least one correct option',
            path: at('options'),
          });
        }
      }

      if (question.type === 'ordering') {
        if (!uniqueIds(question.items)) {
          ctx.addIssue({ code: 'custom', message: 'item ids must be unique', path: at('items') });
        }
        const itemIds = question.items.map((i) => i.id).sort();
        const ordered = [...question.correctOrder].sort();
        const isPermutation =
          itemIds.length === ordered.length && itemIds.every((id, i) => id === ordered[i]);
        if (!isPermutation) {
          ctx.addIssue({
            code: 'custom',
            message: 'correctOrder must list every item id exactly once',
            path: at('correctOrder'),
          });
        }
      }

      if (question.type === 'matching') {
        if (!uniqueIds(question.left) || !uniqueIds(question.right)) {
          ctx.addIssue({ code: 'custom', message: 'item ids must be unique', path: at('left') });
        }
        const leftIds = new Set(question.left.map((i) => i.id));
        const rightIds = new Set(question.right.map((i) => i.id));
        const usedLeft = new Set<string>();

        question.pairs.forEach((pair, p) => {
          if (!leftIds.has(pair.left)) {
            ctx.addIssue({
              code: 'custom',
              message: `pair references an undeclared left id "${pair.left}"`,
              path: at('pairs', p, 'left'),
            });
          }
          if (!rightIds.has(pair.right)) {
            ctx.addIssue({
              code: 'custom',
              message: `pair references an undeclared right id "${pair.right}"`,
              path: at('pairs', p, 'right'),
            });
          }
          if (usedLeft.has(pair.left)) {
            ctx.addIssue({
              code: 'custom',
              message: `left item "${pair.left}" appears in more than one pair`,
              path: at('pairs', p, 'left'),
            });
          }
          usedLeft.add(pair.left);
        });
      }
    });
  });

export type Media = z.infer<typeof mediaSchema>;
export type Reference = z.infer<typeof referenceSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type ExamConfig = z.infer<typeof examSchema>;
export type Option = z.infer<typeof optionSchema>;
export type ChoiceQuestion = z.infer<typeof choiceQuestionSchema>;
export type BooleanQuestion = z.infer<typeof booleanQuestionSchema>;
export type Item = z.infer<typeof itemSchema>;
export type OrderingQuestion = z.infer<typeof orderingQuestionSchema>;
export type MatchingQuestion = z.infer<typeof matchingQuestionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type QuestionSet = z.infer<typeof questionSetSchema>;
export type QuestionType = Question['type'];
