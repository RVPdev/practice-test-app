# Practice Test App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a content-agnostic practice-test app that runs any JSON question set in two study modes (timed mock exam, immediate-correction practice), storing all sets and attempt history on-device.

**Architecture:** A pure TypeScript `src/core/` — Zod schema, import validator, seeded shuffle, scorer, and a session reducer — with zero React and zero Expo imports, unit-tested in Node. Expo Router screens are thin renderers that dispatch actions into that reducer. Persistence sits behind a `Repository` interface whose only v1 implementation is a key/value store backed by AsyncStorage.

**Tech Stack:** Expo (SDK pinned at scaffold), TypeScript, Expo Router, Zod, AsyncStorage, `expo-document-picker`, Jest (`jest-expo` preset) + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-09-06-practice-test-app-design.md` — read it alongside this plan. Every task argues from a section of that spec.

## Global Constraints

- **`schemaVersion` is `1`.** A file with any other value fails import with "This file needs a newer version of the app." — never a validation dump.
- **`src/core/**` must not import React, React Native, Expo, or any storage API.** Its tests run in Node. A React import in `core/` is a review rejection.
- **Import validation is strict and all-or-nothing.** Unknown fields are rejected. Nothing is imported when anything fails.
- **Multi-select scoring is all-or-nothing.** The chosen set must equal the correct set exactly. No partial credit anywhere.
- **Question ids are authored, never generated.** No code path may synthesize a question id.
- **The mock timer is an absolute deadline timestamp**, never a decrementing counter, so backgrounding the app cannot buy time.
- **Practice mode never auto-advances.** Advancing is always a manual tap.
- **`@expo/ui` must not be used in v1** — it has no web renderer, and web is the first target.
- **Install packages with `npx expo install <pkg>`**, never raw `npm install`, so versions match the SDK.
- **All storage keys are prefixed `pt:`.**
- **Every task ends with a commit.** No `Co-Authored-By` or Claude attribution trailers in any commit message — the user is the sole author of this project.

## File Structure

| File | Responsibility |
|---|---|
| `src/core/schema.ts` | Zod schemas for the question-set format + inferred TS types. The single source of truth for content shape. |
| `src/core/validate.ts` | Turns raw parsed JSON into either a typed set or a list of human-readable errors. |
| `src/core/shuffle.ts` | Seeded PRNG and pure shuffle, so any run's ordering is reproducible from its seed. |
| `src/core/types.ts` | Runtime (non-content) types: `RunConfig`, `SessionState`, `SessionAction`, `Attempt`, `Score`. |
| `src/core/config.ts` | Resolves a set's `exam` block + user overrides + app defaults into one `RunConfig`. |
| `src/core/scoring.ts` | Per-type correctness, aggregate score, per-topic breakdown, attempt construction. |
| `src/core/session.ts` | The session reducer: both modes, navigation, timing, submission, resume. |
| `src/data/repository.ts` | `Repository` interface and `SetSummary` type. |
| `src/data/kv.ts` | `KVStore` interface, in-memory implementation for tests, AsyncStorage implementation for the app. |
| `src/data/storage.ts` | `createStorageRepository(kv)` — the only `Repository` implementation in v1. |
| `src/data/bundled.ts` | Sets compiled into the app + first-run seeding. |
| `src/data/RepositoryProvider.tsx` | React context exposing the repository to screens. |
| `src/ui/theme.ts` | Design tokens (color, spacing, radius, type) + `useTheme()`. |
| `src/ui/*.tsx` | Shared presentational components. |
| `src/ui/useSessionRunner.ts` | Binds the session reducer to persistence and the clock. |
| `app/**` | Expo Router routes only. No scoring, timing, or correctness logic. |
| `assets/sets/*.json` | Bundled sample sets. |

---

### Task 1: Scaffold the Expo project and the test harness

**Files:**
- Create: the Expo project in the repo root (preserving `.git/`, `docs/`, `.gitignore`)
- Create: `jest.config.js`, `src/core/smoke.test.ts`
- Modify: `tsconfig.json`, `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test`, the `@/*` → `./src/*` path alias, and a booting web app.

- [ ] **Step 1: Scaffold into a temp directory and move the files in**

The repo root is not empty (it has `.git/`, `docs/`, `.gitignore`), and `create-expo-app` requires an empty target, so scaffold elsewhere and move:

```bash
cd /home/rvp/Workspace
npx create-expo-app@latest practice-test-app-scaffold --template default
cd practice-test-app-scaffold
# move everything except its own git metadata into the real repo
rm -rf .git
cp -r . ../practice-test-app/
cd ../practice-test-app
rm -rf ../practice-test-app-scaffold
```

- [ ] **Step 2: Record the SDK version and remove the demo content**

```bash
node -p "require('./package.json').dependencies.expo"   # note this value
rm -rf app/\(tabs\) app/+not-found.tsx components hooks constants scripts
mkdir -p src/core src/data src/ui assets/sets
```

Read the version-pinned docs for whatever SDK that command printed (e.g. `https://docs.expo.dev/versions/v56.0.0/`), not the `latest` docs.

- [ ] **Step 3: Install dependencies**

```bash
npx expo install zod @react-native-async-storage/async-storage expo-document-picker
npx expo install -- --save-dev jest jest-expo @testing-library/react-native @types/jest
```

- [ ] **Step 4: Point the `@/*` alias at `src/`**

In `tsconfig.json`, set `compilerOptions.paths` to exactly:

```json
"paths": { "@/*": ["./src/*"] }
```

- [ ] **Step 5: Configure Jest**

Create `jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
```

Add to `package.json` scripts: `"test": "jest"`, `"test:watch": "jest --watch"`.

- [ ] **Step 6: Write the failing smoke test**

Create `src/core/smoke.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

describe('test harness', () => {
  it('runs TypeScript tests from src/core', () => {
    const doubled = [1, 2, 3].map((n) => n * 2);
    expect(doubled).toEqual([2, 4, 6]);
  });
});
```

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: PASS, 1 test. If Jest cannot resolve the preset, the `jest-expo` install in Step 3 failed — fix it before continuing.

- [ ] **Step 8: Verify the app still boots**

Run: `npx expo start --web`
Expected: the dev server starts and the browser renders the default Expo Router screen without a red error. Stop it with Ctrl-C.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Scaffold Expo project with TypeScript and Jest"
```

---

### Task 2: Content schema — envelope and common question fields

**Files:**
- Create: `src/core/schema.ts`
- Test: `src/core/schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SCHEMA_VERSION: 1`, `questionSetSchema` (a Zod schema), and the types `QuestionSet`, `Question`, `Option`, `Topic`, `ExamConfig`, `Media`, `Reference`, `ChoiceQuestion`, `BooleanQuestion`, `OrderingQuestion`, `MatchingQuestion`, `QuestionType`.

Spec §3.1–3.2. This task covers the envelope, the shared question head, and `single`/`multi`/`boolean`; Task 3 adds the remaining types and the cross-field rules.

- [ ] **Step 1: Write the failing tests**

Create `src/core/schema.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/core/schema.test.ts`
Expected: FAIL — "Cannot find module './schema'".

- [ ] **Step 3: Write the schema**

Create `src/core/schema.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/core/schema.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/schema.ts src/core/schema.test.ts
git commit -m "Add question set schema for envelope, choice and boolean questions"
```

---

### Task 3: Content schema — ordering, matching, and cross-field rules

**Files:**
- Modify: `src/core/schema.ts`
- Test: `src/core/schema.test.ts` (append a new describe block)

**Interfaces:**
- Consumes: everything Task 2 produced.
- Produces: `OrderingQuestion` and `MatchingQuestion` in the `Question` union, plus `questionSetSchema` enforcing every rule in spec §3.3 and §3.5.

The rules to enforce, all from spec §3.3/§3.5: question ids unique within a set; option ids unique within a question; `single` has exactly one correct option; `multi` has at least one; `correctOrder` is a permutation of the item ids; `pairs` reference declared left/right ids; a left item appears in at most one pair; a `topicId` must be declared when `topics` is present.

- [ ] **Step 1: Write the failing tests**

Append to `src/core/schema.test.ts`:

```ts
import { questionSetSchema as setSchema } from './schema';

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
    expect(setSchema.safeParse(wrap([ordering])).success).toBe(true);
  });

  it('rejects a correctOrder that is not a permutation of the items', () => {
    const bad = { ...ordering, correctOrder: ['i1', 'i3'] };
    expect(setSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('rejects a correctOrder that repeats an item', () => {
    const bad = { ...ordering, correctOrder: ['i1', 'i1'] };
    expect(setSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('accepts a valid matching question with an unused right item', () => {
    expect(setSchema.safeParse(wrap([matching])).success).toBe(true);
  });

  it('rejects a pair referencing an undeclared right id', () => {
    const bad = { ...matching, pairs: [{ left: 'l1', right: 'r9' }] };
    expect(setSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('rejects a left item used in two pairs', () => {
    const bad = { ...matching, pairs: [{ left: 'l1', right: 'r1' }, { left: 'l1', right: 'r2' }] };
    expect(setSchema.safeParse(wrap([bad])).success).toBe(false);
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
    expect(setSchema.safeParse(wrap([single(), single()])).success).toBe(false);
  });

  it('rejects duplicate option ids within a question', () => {
    const bad = single({
      options: [
        { id: 'a', text: 'A', correct: true },
        { id: 'a', text: 'B', correct: false },
      ],
    });
    expect(setSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('rejects a single question with two correct options', () => {
    const bad = single({
      options: [
        { id: 'a', text: 'A', correct: true },
        { id: 'b', text: 'B', correct: true },
      ],
    });
    expect(setSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('rejects a single question with no correct option', () => {
    const bad = single({
      options: [
        { id: 'a', text: 'A', correct: false },
        { id: 'b', text: 'B', correct: false },
      ],
    });
    expect(setSchema.safeParse(wrap([bad])).success).toBe(false);
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
    expect(setSchema.safeParse(wrap([ok])).success).toBe(true);
  });

  it('rejects a multi question with no correct option', () => {
    const bad = single({
      type: 'multi',
      options: [
        { id: 'a', text: 'A', correct: false },
        { id: 'b', text: 'B', correct: false },
      ],
    });
    expect(setSchema.safeParse(wrap([bad])).success).toBe(false);
  });

  it('rejects a topicId that is not declared in topics', () => {
    const parsed = setSchema.safeParse(
      wrap([single({ topicId: 'vpc ' })], { topics: [{ id: 'vpc', name: 'Networking' }] }),
    );
    expect(parsed.success).toBe(false);
  });

  it('allows any topicId when topics is absent', () => {
    expect(setSchema.safeParse(wrap([single({ topicId: 'anything' })])).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/core/schema.test.ts`
Expected: FAIL — the ordering/matching cases fail on the discriminated union, the cross-field cases return `success: true`.

- [ ] **Step 3: Add the types and the set-level refinements**

Keep `questionSchema` a **discriminated union**. A `.superRefine()` on a member turns it into
a `ZodEffects`, which `z.discriminatedUnion` rejects, and falling back to `z.union` makes Zod
collapse every failure into one opaque `invalid_union` issue with no field path - which would
destroy the readable error report Task 4 depends on. So the new members are plain strict
objects, and **every** cross-field rule lives in a single `.superRefine()` on the set.

In `src/core/schema.ts`, add before `questionSchema`:

```ts
export const itemSchema = z.object({ id: idSchema, text: nonEmpty }).strict();

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
    left: z.array(itemSchema).min(1),
    right: z.array(itemSchema).min(1),
    pairs: z.array(z.object({ left: idSchema, right: idSchema }).strict()).min(1),
  })
  .strict();
```

Extend the union to all four members:

```ts
export const questionSchema = z.discriminatedUnion('type', [
  choiceQuestionSchema,
  booleanQuestionSchema,
  orderingQuestionSchema,
  matchingQuestionSchema,
]);
```

Add the shared helper above it:

```ts
const uniqueIds = (items: { id: string }[]) =>
  new Set(items.map((i) => i.id)).size === items.length;
```

Then chain the cross-field pass onto `questionSetSchema` (after its `.strict()`). It runs only
once the structural parse succeeds, which is what you want - there is no point checking that
`correctOrder` is a permutation of items that failed to parse:

```ts
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
```

Add the exported types:

```ts
export type Item = z.infer<typeof itemSchema>;
export type OrderingQuestion = z.infer<typeof orderingQuestionSchema>;
export type MatchingQuestion = z.infer<typeof matchingQuestionSchema>;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/core/schema.test.ts`
Expected: PASS, 22 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/schema.ts src/core/schema.test.ts
git commit -m "Add ordering and matching questions with cross-field validation"
```

---

### Task 4: Import validation with a human-readable report

**Files:**
- Create: `src/core/validate.ts`
- Test: `src/core/validate.test.ts`

**Interfaces:**
- Consumes: `questionSetSchema`, `SCHEMA_VERSION`, `QuestionSet` from `@/core/schema`.
- Produces:
  - `type ValidationError = { location: string; message: string }`
  - `type ValidationResult = { ok: true; set: QuestionSet } | { ok: false; errors: ValidationError[] }`
  - `validateSet(raw: unknown): ValidationResult`
  - `parseSetFile(text: string): ValidationResult`
  - `formatErrors(errors: ValidationError[]): string`
  - `UNSUPPORTED_VERSION_MESSAGE: string`

Spec §6.6 and §7. Validation is all-or-nothing and the report names a location per problem. The version check runs before schema parsing so a future file never produces a wall of Zod noise.

- [ ] **Step 1: Write the failing tests**

Create `src/core/validate.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/core/validate.test.ts`
Expected: FAIL — "Cannot find module './validate'".

- [ ] **Step 3: Write the validator**

Create `src/core/validate.ts`:

```ts
import type { ZodIssue } from 'zod';
import { SCHEMA_VERSION, questionSetSchema, type QuestionSet } from './schema';

export const UNSUPPORTED_VERSION_MESSAGE = 'This file needs a newer version of the app.';

export type ValidationError = { location: string; message: string };

export type ValidationResult =
  | { ok: true; set: QuestionSet }
  | { ok: false; errors: ValidationError[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Turns a Zod issue path into something a content author can act on. */
function locate(path: readonly (string | number)[], raw: unknown): string {
  if (path[0] !== 'questions' || typeof path[1] !== 'number') return 'File';
  const index = path[1];
  const questions = isRecord(raw) && Array.isArray(raw.questions) ? raw.questions : [];
  const question = questions[index];
  const id = isRecord(question) && typeof question.id === 'string' ? question.id : null;
  const head = `Question ${index + 1}`;
  const field = path.slice(2).filter((p) => typeof p === 'string').join('.');
  const suffix = field ? ` → ${field}` : '';
  return id ? `${head} ("${id}")${suffix}` : `${head}${suffix}`;
}

function toError(issue: ZodIssue, raw: unknown): ValidationError {
  const location = locate(issue.path as (string | number)[], raw);
  const field = issue.path[issue.path.length - 1];
  const message =
    issue.code === 'unrecognized_keys'
      ? `unknown field(s): ${(issue as { keys?: string[] }).keys?.join(', ') ?? ''}`
      : issue.code === 'invalid_type' && typeof field === 'string'
        ? `"${field}" is missing or the wrong type (${issue.message})`
        : issue.message;
  return { location, message };
}

export function validateSet(raw: unknown): ValidationResult {
  if (!isRecord(raw)) {
    return { ok: false, errors: [{ location: 'File', message: 'the file is not a JSON object' }] };
  }
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, errors: [{ location: 'File', message: UNSUPPORTED_VERSION_MESSAGE }] };
  }
  const parsed = questionSetSchema.safeParse(raw);
  if (parsed.success) return { ok: true, set: parsed.data };
  return { ok: false, errors: parsed.error.issues.map((issue) => toError(issue, raw)) };
}

export function parseSetFile(text: string): ValidationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      errors: [{ location: 'File', message: `the file is not valid JSON (${detail})` }],
    };
  }
  return validateSet(raw);
}

export function formatErrors(errors: ValidationError[]): string {
  const heading = `${errors.length} problem${errors.length === 1 ? '' : 's'} found`;
  const lines = errors.map((e) => `  ${e.location} — ${e.message}`);
  return [heading, ...lines].join('\n');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/core/validate.test.ts`
Expected: PASS, 11 tests. If the "locates a problem by question number and id" test fails on the location string, the issue path from the question-level `superRefine` is relative to the question — check whether `locate` received `['questions', 0, 'options']` and adjust `locate`, not the test.

- [ ] **Step 5: Commit**

```bash
git add src/core/validate.ts src/core/validate.test.ts
git commit -m "Add strict import validation with readable error reports"
```

---

### Task 5: Seeded shuffle

**Files:**
- Create: `src/core/shuffle.ts`
- Test: `src/core/shuffle.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `randomSeed(): number`
  - `deriveSeed(seed: number, key: string): number`
  - `shuffle<T>(items: readonly T[], seed: number): T[]`

Spec §4.4. A run stores a seed, never the shuffled arrays. Question order derives from the seed; per-question option/item order derives from `deriveSeed(seed, questionId)` so two questions never share an ordering pattern.

- [ ] **Step 1: Write the failing tests**

Create `src/core/shuffle.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';
import { deriveSeed, randomSeed, shuffle } from './shuffle';

const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

describe('shuffle', () => {
  it('is deterministic for the same seed', () => {
    expect(shuffle(items, 12345)).toEqual(shuffle(items, 12345));
  });

  it('produces a different order for a different seed', () => {
    expect(shuffle(items, 1)).not.toEqual(shuffle(items, 2));
  });

  it('preserves every element exactly once', () => {
    expect([...shuffle(items, 99)].sort()).toEqual([...items].sort());
  });

  it('does not mutate the input', () => {
    const input = [...items];
    shuffle(input, 7);
    expect(input).toEqual(items);
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle([], 1)).toEqual([]);
    expect(shuffle(['only'], 1)).toEqual(['only']);
  });
});

describe('deriveSeed', () => {
  it('is stable for the same seed and key', () => {
    expect(deriveSeed(42, 'q-001')).toBe(deriveSeed(42, 'q-001'));
  });

  it('differs across keys', () => {
    expect(deriveSeed(42, 'q-001')).not.toBe(deriveSeed(42, 'q-002'));
  });

  it('differs across seeds', () => {
    expect(deriveSeed(1, 'q-001')).not.toBe(deriveSeed(2, 'q-001'));
  });
});

describe('randomSeed', () => {
  it('returns a positive 32-bit integer', () => {
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThan(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/core/shuffle.test.ts`
Expected: FAIL — "Cannot find module './shuffle'".

- [ ] **Step 3: Write the implementation**

Create `src/core/shuffle.ts`:

```ts
/** mulberry32 — small, fast, and stable across platforms, unlike Math.random(). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xfffffffe) + 1;
}

/** FNV-1a over the key, mixed with the run seed. */
export function deriveSeed(seed: number, key: string): number {
  let hash = 0x811c9dc5 ^ (seed >>> 0);
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Fisher-Yates driven by the seeded PRNG. Returns a new array. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/core/shuffle.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/shuffle.ts src/core/shuffle.test.ts
git commit -m "Add seeded shuffle so run ordering is reproducible"
```

---

### Task 6: Runtime types and run configuration

**Files:**
- Create: `src/core/types.ts`, `src/core/config.ts`
- Test: `src/core/config.test.ts`

**Interfaces:**
- Consumes: `QuestionSet` from `@/core/schema`.
- Produces (types, from `@/core/types`): `RunMode`, `RunConfig`, `RunOverrides`, `AnswerRecord`, `TopicScore`, `Score`, `Attempt`, `SessionState`, `SessionAction`.
- Produces (from `@/core/config`): `DEFAULT_EXAM`, `resolveRunConfig(set, mode, overrides?, seed?): RunConfig`.

Spec §3.1 (exam defaults), §4.3, §5.3, §6.2. `resolveRunConfig` is the one place app defaults, the set's `exam` block, and the user's pre-test edits are merged — screens never merge config themselves.

- [ ] **Step 1: Write the failing tests**

Create `src/core/config.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';
import { DEFAULT_EXAM, resolveRunConfig } from './config';
import type { QuestionSet } from './schema';

const makeSet = (over: Partial<QuestionSet> = {}): QuestionSet =>
  ({
    schemaVersion: 1,
    id: 'set-1',
    title: 'Set One',
    questions: Array.from({ length: 40 }, (_, i) => ({
      id: `q-${i}`,
      type: 'boolean' as const,
      prompt: 'True?',
      answer: true,
    })),
    ...over,
  }) as QuestionSet;

describe('resolveRunConfig', () => {
  it('falls back to app defaults when the set has no exam block', () => {
    const config = resolveRunConfig(makeSet(), 'mock', undefined, 42);
    expect(config.questionCount).toBe(40);
    expect(config.timeLimitMinutes).toBeNull();
    expect(config.passingScore).toBe(DEFAULT_EXAM.passingScore);
    expect(config.seed).toBe(42);
  });

  it('takes values from the set exam block', () => {
    const set = makeSet({ exam: { questionCount: 25, timeLimitMinutes: 30, passingScore: 80 } });
    const config = resolveRunConfig(set, 'mock', undefined, 1);
    expect(config.questionCount).toBe(25);
    expect(config.timeLimitMinutes).toBe(30);
    expect(config.passingScore).toBe(80);
  });

  it('lets user overrides win over the set', () => {
    const set = makeSet({ exam: { questionCount: 25, timeLimitMinutes: 30 } });
    const config = resolveRunConfig(set, 'mock', { questionCount: 10, shuffleOptions: false }, 1);
    expect(config.questionCount).toBe(10);
    expect(config.shuffleOptions).toBe(false);
    expect(config.timeLimitMinutes).toBe(30);
  });

  it('caps questionCount at the size of the set', () => {
    const set = makeSet({ exam: { questionCount: 65 } });
    expect(resolveRunConfig(set, 'mock', undefined, 1).questionCount).toBe(40);
  });

  it('ignores the time limit in practice mode', () => {
    const set = makeSet({ exam: { timeLimitMinutes: 90, questionCount: 10 } });
    const config = resolveRunConfig(set, 'practice', undefined, 1);
    expect(config.timeLimitMinutes).toBeNull();
    expect(config.questionCount).toBe(40);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/core/config.test.ts`
Expected: FAIL — "Cannot find module './config'".

- [ ] **Step 3: Write the types**

Create `src/core/types.ts`:

```ts
export type RunMode = 'mock' | 'practice';

export type RunConfig = {
  questionCount: number;
  timeLimitMinutes: number | null;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  seed: number;
};

export type RunOverrides = Partial<Omit<RunConfig, 'seed'>>;

/** `response` holds option ids, ["true"]/["false"], an ordered id list, or "left:right" pairs. */
export type AnswerRecord = {
  questionId: string;
  response: string[];
  correct: boolean;
  timeMs: number;
};

export type TopicScore = { topicId: string; correct: number; total: number };

export type Score = { correct: number; total: number; percent: number; passed: boolean };

export type Attempt = {
  id: string;
  setId: string;
  setVersion: string | null;
  mode: RunMode;
  startedAt: string;
  finishedAt: string;
  config: RunConfig;
  score: Score;
  byTopic: TopicScore[];
  answers: AnswerRecord[];
};

/** Serializable in full — this doubles as the resume snapshot. */
export type SessionState = {
  attemptId: string;
  setId: string;
  setVersion: string | null;
  mode: RunMode;
  config: RunConfig;
  questionIds: string[];
  index: number;
  answers: Record<string, string[]>;
  revealed: string[];
  timeMs: Record<string, number>;
  startedAt: string;
  deadlineAt: string | null;
  enteredAt: number;
  status: 'active' | 'submitted';
};

export type SessionAction =
  | { type: 'ANSWER'; questionId: string; response: string[] }
  | { type: 'REVEAL'; questionId: string }
  | { type: 'NEXT'; nowMs: number }
  | { type: 'PREV'; nowMs: number }
  | { type: 'GOTO'; index: number; nowMs: number }
  | { type: 'TICK'; nowMs: number }
  | { type: 'SUBMIT'; nowMs: number };
```

- [ ] **Step 4: Write the config resolver**

Create `src/core/config.ts`:

```ts
import type { QuestionSet } from './schema';
import type { RunConfig, RunMode, RunOverrides } from './types';

export const DEFAULT_EXAM = {
  passingScore: 70,
  shuffleQuestions: true,
  shuffleOptions: true,
} as const;

export function resolveRunConfig(
  set: QuestionSet,
  mode: RunMode,
  overrides: RunOverrides | undefined,
  seed: number,
): RunConfig {
  const exam = set.exam ?? {};
  const total = set.questions.length;

  // Practice walks the whole set and is never timed (spec §6.2).
  const requested =
    mode === 'practice' ? total : (overrides?.questionCount ?? exam.questionCount ?? total);
  const timeLimit =
    mode === 'practice'
      ? null
      : (overrides?.timeLimitMinutes ?? exam.timeLimitMinutes ?? null);

  return {
    questionCount: Math.min(Math.max(1, requested), total),
    timeLimitMinutes: timeLimit,
    passingScore: overrides?.passingScore ?? exam.passingScore ?? DEFAULT_EXAM.passingScore,
    shuffleQuestions:
      overrides?.shuffleQuestions ?? exam.shuffleQuestions ?? DEFAULT_EXAM.shuffleQuestions,
    shuffleOptions:
      overrides?.shuffleOptions ?? exam.shuffleOptions ?? DEFAULT_EXAM.shuffleOptions,
    seed,
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/core/config.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/core/types.ts src/core/config.ts src/core/config.test.ts
git commit -m "Add runtime types and run configuration resolution"
```

---

### Task 7: Scoring and attempt construction

**Files:**
- Create: `src/core/scoring.ts`
- Test: `src/core/scoring.test.ts`

**Interfaces:**
- Consumes: `Question` from `@/core/schema`; `AnswerRecord`, `Attempt`, `Score`, `SessionState`, `TopicScore` from `@/core/types`.
- Produces:
  - `UNCATEGORIZED: 'uncategorized'`
  - `correctResponse(question: Question): string[]`
  - `isCorrect(question: Question, response: string[]): boolean`
  - `scoreAnswers(questions: Question[], answers: AnswerRecord[], passingScore: number): { score: Score; byTopic: TopicScore[] }`
  - `buildAttempt(state: SessionState, questions: Question[], finishedAtMs: number): Attempt`

Spec §4.3 and §5.3. All-or-nothing everywhere; unanswered counts as incorrect and stays in the denominator.

- [ ] **Step 1: Write the failing tests**

Create `src/core/scoring.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';
import { buildAttempt, correctResponse, isCorrect, scoreAnswers, UNCATEGORIZED } from './scoring';
import type { Question } from './schema';
import type { AnswerRecord, SessionState } from './types';

const single: Question = {
  id: 'q-single',
  type: 'single',
  topicId: 'vpc',
  prompt: 'Which?',
  options: [
    { id: 'a', text: 'A', correct: true },
    { id: 'b', text: 'B', correct: false },
  ],
};

const multi: Question = {
  id: 'q-multi',
  type: 'multi',
  topicId: 'vpc',
  prompt: 'Which two?',
  options: [
    { id: 'a', text: 'A', correct: true },
    { id: 'b', text: 'B', correct: true },
    { id: 'c', text: 'C', correct: false },
  ],
};

const boolQ: Question = { id: 'q-bool', type: 'boolean', prompt: 'True?', answer: false };

const ordering: Question = {
  id: 'q-ord',
  type: 'ordering',
  prompt: 'Order these',
  items: [
    { id: 'i1', text: 'One' },
    { id: 'i2', text: 'Two' },
  ],
  correctOrder: ['i1', 'i2'],
};

const matching: Question = {
  id: 'q-mat',
  type: 'matching',
  prompt: 'Match these',
  left: [
    { id: 'l1', text: 'S3' },
    { id: 'l2', text: 'EBS' },
  ],
  right: [
    { id: 'r1', text: 'Object' },
    { id: 'r2', text: 'Block' },
  ],
  pairs: [
    { left: 'l1', right: 'r1' },
    { left: 'l2', right: 'r2' },
  ],
};

describe('isCorrect', () => {
  it('scores single choice', () => {
    expect(isCorrect(single, ['a'])).toBe(true);
    expect(isCorrect(single, ['b'])).toBe(false);
    expect(isCorrect(single, [])).toBe(false);
    expect(isCorrect(single, ['a', 'b'])).toBe(false);
  });

  it('scores multi choice all-or-nothing, ignoring order', () => {
    expect(isCorrect(multi, ['b', 'a'])).toBe(true);
    expect(isCorrect(multi, ['a'])).toBe(false);
    expect(isCorrect(multi, ['a', 'b', 'c'])).toBe(false);
  });

  it('scores boolean', () => {
    expect(isCorrect(boolQ, ['false'])).toBe(true);
    expect(isCorrect(boolQ, ['true'])).toBe(false);
    expect(isCorrect(boolQ, [])).toBe(false);
  });

  it('scores ordering by exact sequence', () => {
    expect(isCorrect(ordering, ['i1', 'i2'])).toBe(true);
    expect(isCorrect(ordering, ['i2', 'i1'])).toBe(false);
    expect(isCorrect(ordering, ['i1'])).toBe(false);
  });

  it('scores matching by exact pair set, ignoring order', () => {
    expect(isCorrect(matching, ['l2:r2', 'l1:r1'])).toBe(true);
    expect(isCorrect(matching, ['l1:r1'])).toBe(false);
    expect(isCorrect(matching, ['l1:r2', 'l2:r1'])).toBe(false);
  });
});

describe('correctResponse', () => {
  it('returns the canonical answer for each type', () => {
    expect(correctResponse(single)).toEqual(['a']);
    expect(correctResponse(multi).sort()).toEqual(['a', 'b']);
    expect(correctResponse(boolQ)).toEqual(['false']);
    expect(correctResponse(ordering)).toEqual(['i1', 'i2']);
    expect(correctResponse(matching)).toEqual(['l1:r1', 'l2:r2']);
  });
});

describe('scoreAnswers', () => {
  const answer = (questionId: string, correct: boolean): AnswerRecord => ({
    questionId,
    response: [],
    correct,
    timeMs: 0,
  });

  it('computes correct, total, percent and pass', () => {
    const { score } = scoreAnswers(
      [single, multi, boolQ, ordering],
      [
        answer('q-single', true),
        answer('q-multi', true),
        answer('q-bool', true),
        answer('q-ord', false),
      ],
      70,
    );
    expect(score).toEqual({ correct: 3, total: 4, percent: 75, passed: true });
  });

  it('fails below the passing score', () => {
    const { score } = scoreAnswers(
      [single, multi],
      [answer('q-single', true), answer('q-multi', false)],
      70,
    );
    expect(score.percent).toBe(50);
    expect(score.passed).toBe(false);
  });

  it('counts a missing answer as incorrect and keeps it in the denominator', () => {
    const { score } = scoreAnswers([single, multi], [answer('q-single', true)], 70);
    expect(score).toEqual({ correct: 1, total: 2, percent: 50, passed: false });
  });

  it('rounds percent to one decimal', () => {
    const { score } = scoreAnswers(
      [single, multi, boolQ],
      [answer('q-single', true), answer('q-multi', true)],
      70,
    );
    expect(score.percent).toBe(66.7);
  });

  it('groups by topic and puts untagged questions under uncategorized', () => {
    const { byTopic } = scoreAnswers(
      [single, multi, boolQ],
      [answer('q-single', true), answer('q-multi', false), answer('q-bool', true)],
      70,
    );
    expect(byTopic).toEqual([
      { topicId: 'vpc', correct: 1, total: 2 },
      { topicId: UNCATEGORIZED, correct: 1, total: 1 },
    ]);
  });
});

describe('buildAttempt', () => {
  const state: SessionState = {
    attemptId: 'att_test',
    setId: 'set-1',
    setVersion: '1.2.0',
    mode: 'mock',
    config: {
      questionCount: 2,
      timeLimitMinutes: 30,
      passingScore: 70,
      shuffleQuestions: true,
      shuffleOptions: true,
      seed: 42,
    },
    questionIds: ['q-single', 'q-multi'],
    index: 1,
    answers: { 'q-single': ['a'], 'q-multi': ['a'] },
    revealed: [],
    timeMs: { 'q-single': 12000 },
    startedAt: '2026-09-06T14:00:00.000Z',
    deadlineAt: '2026-09-06T14:30:00.000Z',
    enteredAt: 0,
    status: 'submitted',
  };

  it('produces an attempt scored over the questions in the run', () => {
    const attempt = buildAttempt(
      state,
      [single, multi, boolQ],
      Date.parse('2026-09-06T14:20:00.000Z'),
    );
    expect(attempt.id).toBe('att_test');
    expect(attempt.setId).toBe('set-1');
    expect(attempt.setVersion).toBe('1.2.0');
    expect(attempt.finishedAt).toBe('2026-09-06T14:20:00.000Z');
    expect(attempt.score).toEqual({ correct: 1, total: 2, percent: 50, passed: false });
    expect(attempt.answers).toEqual([
      { questionId: 'q-single', response: ['a'], correct: true, timeMs: 12000 },
      { questionId: 'q-multi', response: ['a'], correct: false, timeMs: 0 },
    ]);
  });

  it('records an unanswered question as an empty response', () => {
    const attempt = buildAttempt(
      { ...state, answers: {} },
      [single, multi],
      Date.parse('2026-09-06T14:20:00.000Z'),
    );
    expect(attempt.answers[0]).toEqual({
      questionId: 'q-single',
      response: [],
      correct: false,
      timeMs: 12000,
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/core/scoring.test.ts`
Expected: FAIL — "Cannot find module './scoring'".

- [ ] **Step 3: Write the implementation**

Create `src/core/scoring.ts`:

```ts
import type { Question } from './schema';
import type { AnswerRecord, Attempt, Score, SessionState, TopicScore } from './types';

export const UNCATEGORIZED = 'uncategorized';

const sameSet = (a: string[], b: string[]): boolean =>
  a.length === b.length && [...a].sort().join(' ') === [...b].sort().join(' ');

const sameSequence = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value, i) => value === b[i]);

export function correctResponse(question: Question): string[] {
  switch (question.type) {
    case 'single':
    case 'multi':
      return question.options.filter((o) => o.correct).map((o) => o.id);
    case 'boolean':
      return [question.answer ? 'true' : 'false'];
    case 'ordering':
      return [...question.correctOrder];
    case 'matching':
      return question.pairs.map((p) => `${p.left}:${p.right}`);
  }
}

export function isCorrect(question: Question, response: string[]): boolean {
  if (response.length === 0) return false;
  const expected = correctResponse(question);
  // Ordering is the one type where the sequence itself is the answer.
  return question.type === 'ordering'
    ? sameSequence(response, expected)
    : sameSet(response, expected);
}

export function scoreAnswers(
  questions: Question[],
  answers: AnswerRecord[],
  passingScore: number,
): { score: Score; byTopic: TopicScore[] } {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const topics = new Map<string, TopicScore>();
  let correct = 0;

  questions.forEach((question) => {
    const answer = byId.get(question.id);
    const isRight = answer?.correct ?? false;
    if (isRight) correct += 1;

    const topicId = question.topicId ?? UNCATEGORIZED;
    const bucket = topics.get(topicId) ?? { topicId, correct: 0, total: 0 };
    bucket.total += 1;
    if (isRight) bucket.correct += 1;
    topics.set(topicId, bucket);
  });

  const total = questions.length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;

  return {
    score: { correct, total, percent, passed: percent >= passingScore },
    byTopic: [...topics.values()],
  };
}

export function buildAttempt(
  state: SessionState,
  questions: Question[],
  finishedAtMs: number,
): Attempt {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const inRun = state.questionIds
    .map((id) => byId.get(id))
    .filter((q): q is Question => q !== undefined);

  const answers: AnswerRecord[] = inRun.map((question) => {
    const response = state.answers[question.id] ?? [];
    return {
      questionId: question.id,
      response,
      correct: isCorrect(question, response),
      timeMs: state.timeMs[question.id] ?? 0,
    };
  });

  const { score, byTopic } = scoreAnswers(inRun, answers, state.config.passingScore);

  return {
    id: state.attemptId,
    setId: state.setId,
    setVersion: state.setVersion,
    mode: state.mode,
    startedAt: state.startedAt,
    finishedAt: new Date(finishedAtMs).toISOString(),
    config: state.config,
    score,
    byTopic,
    answers,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/core/scoring.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/scoring.ts src/core/scoring.test.ts
git commit -m "Add scoring, per-topic breakdown and attempt construction"
```

---

### Task 8: The session reducer

**Files:**
- Create: `src/core/session.ts`
- Test: `src/core/session.test.ts`

**Interfaces:**
- Consumes: `QuestionSet`, `Question` from `@/core/schema`; `deriveSeed`, `shuffle` from `@/core/shuffle`; `resolveRunConfig` from `@/core/config`; the session types from `@/core/types`.
- Produces:
  - `startSession(set: QuestionSet, mode: RunMode, config: RunConfig, nowMs: number): SessionState`
  - `sessionReducer(state: SessionState, action: SessionAction): SessionState`
  - `currentQuestionId(state: SessionState): string`
  - `isRevealed(state: SessionState, questionId: string): boolean`
  - `remainingMs(state: SessionState, nowMs: number): number | null`
  - `orderedOptionIds(question: Question, config: RunConfig): string[]`
  - `orderedItemIds(question: Question, config: RunConfig): string[]`

Spec §6.3, §6.4, §7. The mode differences live here and nowhere else: mock navigates freely and never reveals; practice reveals, then advances one way, and only after a reveal.

- [ ] **Step 1: Write the failing tests**

Create `src/core/session.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';
import { resolveRunConfig } from './config';
import type { QuestionSet } from './schema';
import {
  currentQuestionId,
  isRevealed,
  orderedOptionIds,
  remainingMs,
  sessionReducer,
  startSession,
} from './session';
import type { RunConfig, RunMode, SessionState } from './types';

const set: QuestionSet = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Set One',
  version: '1.0.0',
  questions: Array.from({ length: 6 }, (_, i) => ({
    id: `q-${i}`,
    type: 'single' as const,
    prompt: `Question ${i}`,
    options: [
      { id: 'a', text: 'A', correct: true },
      { id: 'b', text: 'B', correct: false },
      { id: 'c', text: 'C', correct: false },
    ],
  })),
};

const T0 = Date.parse('2026-09-06T14:00:00.000Z');

const mockConfig = (over: Partial<RunConfig> = {}): RunConfig => ({
  ...resolveRunConfig(set, 'mock', { questionCount: 4, timeLimitMinutes: 30 }, 42),
  ...over,
});

const practiceConfig = (): RunConfig => resolveRunConfig(set, 'practice', undefined, 42);

const start = (mode: RunMode = 'mock', config: RunConfig = mockConfig()): SessionState =>
  startSession(set, mode, config, T0);

describe('startSession', () => {
  it('takes exactly questionCount questions', () => {
    expect(start().questionIds).toHaveLength(4);
  });

  it('is deterministic for the same seed', () => {
    expect(start().questionIds).toEqual(start().questionIds);
  });

  it('keeps the authored order when shuffleQuestions is false', () => {
    const state = start('mock', mockConfig({ shuffleQuestions: false }));
    expect(state.questionIds).toEqual(['q-0', 'q-1', 'q-2', 'q-3']);
  });

  it('sets an absolute deadline from the time limit', () => {
    expect(start().deadlineAt).toBe('2026-09-06T14:30:00.000Z');
  });

  it('has no deadline in practice mode and walks the whole set', () => {
    const state = start('practice', practiceConfig());
    expect(state.deadlineAt).toBeNull();
    expect(state.questionIds).toHaveLength(6);
  });

  it('records the set version for later review warnings', () => {
    expect(start().setVersion).toBe('1.0.0');
  });
});

describe('mock mode navigation', () => {
  it('records an answer', () => {
    const initial = start();
    const state = sessionReducer(initial, {
      type: 'ANSWER',
      questionId: currentQuestionId(initial),
      response: ['a'],
    });
    expect(state.answers[currentQuestionId(state)]).toEqual(['a']);
  });

  it('moves forward and back, staying in bounds', () => {
    let state = start();
    state = sessionReducer(state, { type: 'PREV', nowMs: T0 + 1000 });
    expect(state.index).toBe(0);
    state = sessionReducer(state, { type: 'NEXT', nowMs: T0 + 2000 });
    expect(state.index).toBe(1);
    state = sessionReducer(state, { type: 'GOTO', index: 3, nowMs: T0 + 3000 });
    expect(state.index).toBe(3);
    state = sessionReducer(state, { type: 'NEXT', nowMs: T0 + 4000 });
    expect(state.index).toBe(3);
  });

  it('accumulates time on the question being left', () => {
    let state = start();
    const first = currentQuestionId(state);
    state = sessionReducer(state, { type: 'NEXT', nowMs: T0 + 5000 });
    expect(state.timeMs[first]).toBe(5000);
    state = sessionReducer(state, { type: 'PREV', nowMs: T0 + 8000 });
    expect(state.timeMs[currentQuestionId(state)]).toBe(5000);
  });

  it('never reveals', () => {
    const state = sessionReducer(start(), { type: 'REVEAL', questionId: 'q-0' });
    expect(state.revealed).toEqual([]);
  });
});

describe('practice mode', () => {
  it('will not advance before the current question is revealed', () => {
    const state = sessionReducer(start('practice', practiceConfig()), {
      type: 'NEXT',
      nowMs: T0 + 1000,
    });
    expect(state.index).toBe(0);
  });

  it('advances after a reveal', () => {
    let state = start('practice', practiceConfig());
    const first = currentQuestionId(state);
    state = sessionReducer(state, { type: 'REVEAL', questionId: first });
    expect(isRevealed(state, first)).toBe(true);
    state = sessionReducer(state, { type: 'NEXT', nowMs: T0 + 1000 });
    expect(state.index).toBe(1);
  });

  it('locks the answer once revealed', () => {
    let state = start('practice', practiceConfig());
    const first = currentQuestionId(state);
    state = sessionReducer(state, { type: 'ANSWER', questionId: first, response: ['b'] });
    state = sessionReducer(state, { type: 'REVEAL', questionId: first });
    state = sessionReducer(state, { type: 'ANSWER', questionId: first, response: ['a'] });
    expect(state.answers[first]).toEqual(['b']);
  });

  it('does not go back', () => {
    let state = start('practice', practiceConfig());
    state = sessionReducer(state, { type: 'REVEAL', questionId: currentQuestionId(state) });
    state = sessionReducer(state, { type: 'NEXT', nowMs: T0 + 1000 });
    state = sessionReducer(state, { type: 'PREV', nowMs: T0 + 2000 });
    expect(state.index).toBe(1);
  });
});

describe('the clock', () => {
  it('reports remaining time from the absolute deadline', () => {
    expect(remainingMs(start(), T0 + 60000)).toBe(29 * 60 * 1000);
  });

  it('returns null when there is no time limit', () => {
    expect(remainingMs(start('practice', practiceConfig()), T0 + 60000)).toBeNull();
  });

  it('leaves an active session alone before the deadline', () => {
    expect(sessionReducer(start(), { type: 'TICK', nowMs: T0 + 60000 }).status).toBe('active');
  });

  it('auto-submits once the deadline has passed', () => {
    const state = sessionReducer(start(), { type: 'TICK', nowMs: T0 + 31 * 60 * 1000 });
    expect(state.status).toBe('submitted');
  });

  it('clamps remaining time at zero', () => {
    expect(remainingMs(start(), T0 + 60 * 60 * 1000)).toBe(0);
  });
});

describe('submission', () => {
  it('marks the session submitted and banks the last question time', () => {
    const state = sessionReducer(start(), { type: 'SUBMIT', nowMs: T0 + 9000 });
    expect(state.status).toBe('submitted');
    expect(state.timeMs[state.questionIds[0]]).toBe(9000);
  });

  it('ignores every action after submission', () => {
    const submitted = sessionReducer(start(), { type: 'SUBMIT', nowMs: T0 + 9000 });
    const after = sessionReducer(submitted, {
      type: 'ANSWER',
      questionId: 'q-0',
      response: ['a'],
    });
    expect(after).toBe(submitted);
  });
});

describe('orderedOptionIds', () => {
  const question = set.questions[0];

  it('is deterministic for a seed and question', () => {
    const config = mockConfig();
    expect(orderedOptionIds(question, config)).toEqual(orderedOptionIds(question, config));
  });

  it('keeps the authored order when shuffleOptions is false', () => {
    expect(orderedOptionIds(question, mockConfig({ shuffleOptions: false }))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('gives different questions different orderings under the same seed', () => {
    const config = mockConfig();
    const orders = set.questions.map((q) => orderedOptionIds(q, config).join(''));
    expect(new Set(orders).size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/core/session.test.ts`
Expected: FAIL — "Cannot find module './session'".

- [ ] **Step 3: Write the reducer**

Create `src/core/session.ts`:

```ts
import type { Question, QuestionSet } from './schema';
import { deriveSeed, shuffle } from './shuffle';
import type { RunConfig, RunMode, SessionAction, SessionState } from './types';

export function currentQuestionId(state: SessionState): string {
  return state.questionIds[state.index];
}

export function isRevealed(state: SessionState, questionId: string): boolean {
  return state.revealed.includes(questionId);
}

export function remainingMs(state: SessionState, nowMs: number): number | null {
  if (!state.deadlineAt) return null;
  return Math.max(0, Date.parse(state.deadlineAt) - nowMs);
}

export function orderedOptionIds(question: Question, config: RunConfig): string[] {
  if (question.type !== 'single' && question.type !== 'multi') return [];
  const ids = question.options.map((o) => o.id);
  if (!config.shuffleOptions) return ids;
  return shuffle(ids, deriveSeed(config.seed, question.id));
}

/** Ordering items are always presented shuffled - the authored order is the answer. */
export function orderedItemIds(question: Question, config: RunConfig): string[] {
  if (question.type !== 'ordering') return [];
  return shuffle(
    question.items.map((i) => i.id),
    deriveSeed(config.seed, `${question.id}:items`),
  );
}

export function startSession(
  set: QuestionSet,
  mode: RunMode,
  config: RunConfig,
  nowMs: number,
): SessionState {
  const allIds = set.questions.map((q) => q.id);
  const ordered = config.shuffleQuestions ? shuffle(allIds, config.seed) : allIds;
  const questionIds = ordered.slice(0, config.questionCount);
  const startedAt = new Date(nowMs).toISOString();

  return {
    attemptId: `att_${startedAt}`,
    setId: set.id,
    setVersion: set.version ?? null,
    mode,
    config,
    questionIds,
    index: 0,
    answers: {},
    revealed: [],
    timeMs: {},
    startedAt,
    deadlineAt:
      config.timeLimitMinutes === null
        ? null
        : new Date(nowMs + config.timeLimitMinutes * 60000).toISOString(),
    enteredAt: nowMs,
    status: 'active',
  };
}

/** Banks the time spent on the question being left and restarts the clock. */
function bankTime(state: SessionState, nowMs: number): SessionState {
  const questionId = currentQuestionId(state);
  const elapsed = Math.max(0, nowMs - state.enteredAt);
  return {
    ...state,
    timeMs: { ...state.timeMs, [questionId]: (state.timeMs[questionId] ?? 0) + elapsed },
    enteredAt: nowMs,
  };
}

function moveTo(state: SessionState, index: number, nowMs: number): SessionState {
  const clamped = Math.min(Math.max(0, index), state.questionIds.length - 1);
  if (clamped === state.index) return state;
  return { ...bankTime(state, nowMs), index: clamped };
}

function submit(state: SessionState, nowMs: number): SessionState {
  return { ...bankTime(state, nowMs), status: 'submitted' };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  if (state.status === 'submitted') return state;

  switch (action.type) {
    case 'ANSWER': {
      // Practice locks an answer the moment it is revealed (spec 6.4).
      if (state.mode === 'practice' && isRevealed(state, action.questionId)) return state;
      return { ...state, answers: { ...state.answers, [action.questionId]: action.response } };
    }

    case 'REVEAL': {
      if (state.mode !== 'practice') return state;
      if (isRevealed(state, action.questionId)) return state;
      return { ...state, revealed: [...state.revealed, action.questionId] };
    }

    case 'NEXT': {
      // Practice advances only after the current question has been revealed.
      if (state.mode === 'practice' && !isRevealed(state, currentQuestionId(state))) return state;
      return moveTo(state, state.index + 1, action.nowMs);
    }

    case 'PREV': {
      if (state.mode === 'practice') return state;
      return moveTo(state, state.index - 1, action.nowMs);
    }

    case 'GOTO': {
      if (state.mode === 'practice') return state;
      return moveTo(state, action.index, action.nowMs);
    }

    case 'TICK': {
      const remaining = remainingMs(state, action.nowMs);
      if (remaining === null || remaining > 0) return state;
      return submit(state, action.nowMs);
    }

    case 'SUBMIT':
      return submit(state, action.nowMs);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/core/session.test.ts`
Expected: PASS, 21 tests.

- [ ] **Step 5: Run the whole core suite**

Run: `npm test`
Expected: PASS, every core test green. The engine is complete before a single screen has rendered - that is the point of the layering.

- [ ] **Step 6: Commit**

```bash
git add src/core/session.ts src/core/session.test.ts
git commit -m "Add session reducer for mock and practice modes"
```

---

### Task 9: Repository interface and the key/value implementation

**Files:**
- Create: `src/data/repository.ts`, `src/data/kv.ts`, `src/data/storage.ts`
- Test: `src/data/storage.test.ts`

**Interfaces:**
- Consumes: `QuestionSet` from `@/core/schema`; `Attempt`, `SessionState` from `@/core/types`.
- Produces:
  - From `@/data/kv`: `interface KVStore { getItem(key): Promise<string | null>; setItem(key, value): Promise<void>; removeItem(key): Promise<void> }`, `createMemoryKv(): KVStore`
  - From `@/data/repository`: `SetSource = 'bundled' | 'imported'`, `SetSummary`, `SaveMode = 'replace' | 'copy'`, `interface Repository`
  - From `@/data/storage`: `createStorageRepository(kv: KVStore): Repository`, `KEY_PREFIX = 'pt:'`

Spec §5.1–5.2. This task splits the table's `kv.ts` into `kv.ts` (interface + in-memory, no imports) and, in Task 10, `asyncStorageKv.ts` (the adapter), so the whole repository is testable in Node without touching AsyncStorage.

- [ ] **Step 1: Write the interfaces**

Create `src/data/kv.ts`:

```ts
export interface KVStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createMemoryKv(seed: Record<string, string> = {}): KVStore {
  const store = new Map<string, string>(Object.entries(seed));
  return {
    async getItem(key) {
      return store.get(key) ?? null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
  };
}
```

Create `src/data/repository.ts`:

```ts
import type { QuestionSet } from '@/core/schema';
import type { Attempt, SessionState } from '@/core/types';

export type SetSource = 'bundled' | 'imported';

export type SaveMode = 'replace' | 'copy';

export type SetSummary = {
  id: string;
  title: string;
  description: string | null;
  version: string | null;
  questionCount: number;
  topicCount: number;
  source: SetSource;
  attemptCount: number;
  bestPercent: number | null;
  lastAttemptAt: string | null;
};

export interface Repository {
  listSets(): Promise<SetSummary[]>;
  getSet(setId: string): Promise<QuestionSet | null>;
  /** Returns the id the set was stored under - a copy gets a new one. */
  saveSet(set: QuestionSet, source: SetSource, mode?: SaveMode): Promise<string>;
  deleteSet(setId: string): Promise<void>;
  listAttempts(setId?: string): Promise<Attempt[]>;
  getAttempt(attemptId: string): Promise<Attempt | null>;
  saveAttempt(attempt: Attempt): Promise<void>;
  getInProgress(): Promise<SessionState | null>;
  saveInProgress(state: SessionState | null): Promise<void>;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/data/storage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from '@jest/globals';
import type { QuestionSet } from '@/core/schema';
import type { Attempt, SessionState } from '@/core/types';
import { createMemoryKv } from './kv';
import type { Repository } from './repository';
import { createStorageRepository } from './storage';

const makeSet = (over: Partial<QuestionSet> = {}): QuestionSet =>
  ({
    schemaVersion: 1,
    id: 'set-1',
    title: 'Set One',
    description: 'A set',
    version: '1.0.0',
    topics: [{ id: 'vpc', name: 'Networking' }],
    questions: [
      {
        id: 'q-1',
        type: 'single',
        topicId: 'vpc',
        prompt: 'Which?',
        options: [
          { id: 'a', text: 'A', correct: true },
          { id: 'b', text: 'B', correct: false },
        ],
      },
    ],
    ...over,
  }) as QuestionSet;

const makeAttempt = (over: Partial<Attempt> = {}): Attempt => ({
  id: 'att_1',
  setId: 'set-1',
  setVersion: '1.0.0',
  mode: 'mock',
  startedAt: '2026-09-06T14:00:00.000Z',
  finishedAt: '2026-09-06T14:30:00.000Z',
  config: {
    questionCount: 1,
    timeLimitMinutes: null,
    passingScore: 70,
    shuffleQuestions: true,
    shuffleOptions: true,
    seed: 1,
  },
  score: { correct: 1, total: 1, percent: 100, passed: true },
  byTopic: [{ topicId: 'vpc', correct: 1, total: 1 }],
  answers: [{ questionId: 'q-1', response: ['a'], correct: true, timeMs: 1000 }],
  ...over,
});

describe('createStorageRepository', () => {
  let repo: Repository;

  beforeEach(() => {
    repo = createStorageRepository(createMemoryKv());
  });

  it('starts empty', async () => {
    expect(await repo.listSets()).toEqual([]);
    expect(await repo.getSet('nope')).toBeNull();
    expect(await repo.getInProgress()).toBeNull();
  });

  it('round-trips a set and summarises it', async () => {
    await repo.saveSet(makeSet(), 'imported');
    expect(await repo.getSet('set-1')).toEqual(makeSet());

    const [summary] = await repo.listSets();
    expect(summary).toEqual({
      id: 'set-1',
      title: 'Set One',
      description: 'A set',
      version: '1.0.0',
      questionCount: 1,
      topicCount: 1,
      source: 'imported',
      attemptCount: 0,
      bestPercent: null,
      lastAttemptAt: null,
    });
  });

  it('replaces a set with the same id by default, keeping its attempts', async () => {
    await repo.saveSet(makeSet(), 'imported');
    await repo.saveAttempt(makeAttempt());
    await repo.saveSet(makeSet({ title: 'Set One v2', version: '2.0.0' }), 'imported');

    const sets = await repo.listSets();
    expect(sets).toHaveLength(1);
    expect(sets[0].title).toBe('Set One v2');
    expect(sets[0].attemptCount).toBe(1);
  });

  it('stores a copy under a new id with its own history', async () => {
    await repo.saveSet(makeSet(), 'imported');
    await repo.saveAttempt(makeAttempt());
    const copyId = await repo.saveSet(makeSet(), 'imported', 'copy');

    expect(copyId).not.toBe('set-1');
    const copy = await repo.getSet(copyId);
    expect(copy?.id).toBe(copyId);
    expect(await repo.listAttempts(copyId)).toEqual([]);
    expect(await repo.listSets()).toHaveLength(2);
  });

  it('summarises best score and last attempt date', async () => {
    await repo.saveSet(makeSet(), 'imported');
    await repo.saveAttempt(makeAttempt({ id: 'att_1', score: { correct: 1, total: 2, percent: 50, passed: false } }));
    await repo.saveAttempt(
      makeAttempt({
        id: 'att_2',
        finishedAt: '2026-09-07T10:00:00.000Z',
        score: { correct: 2, total: 2, percent: 100, passed: true },
      }),
    );

    const [summary] = await repo.listSets();
    expect(summary.attemptCount).toBe(2);
    expect(summary.bestPercent).toBe(100);
    expect(summary.lastAttemptAt).toBe('2026-09-07T10:00:00.000Z');
  });

  it('lists attempts newest first, across all sets when no id is given', async () => {
    await repo.saveSet(makeSet(), 'imported');
    await repo.saveSet(makeSet({ id: 'set-2', title: 'Set Two' }), 'imported');
    await repo.saveAttempt(makeAttempt({ id: 'att_old', finishedAt: '2026-09-01T10:00:00.000Z' }));
    await repo.saveAttempt(
      makeAttempt({ id: 'att_new', setId: 'set-2', finishedAt: '2026-09-08T10:00:00.000Z' }),
    );

    expect((await repo.listAttempts()).map((a) => a.id)).toEqual(['att_new', 'att_old']);
    expect((await repo.listAttempts('set-1')).map((a) => a.id)).toEqual(['att_old']);
  });

  it('finds one attempt by id', async () => {
    await repo.saveSet(makeSet(), 'imported');
    await repo.saveAttempt(makeAttempt());
    expect((await repo.getAttempt('att_1'))?.setId).toBe('set-1');
    expect(await repo.getAttempt('missing')).toBeNull();
  });

  it('deletes an imported set together with its attempts', async () => {
    await repo.saveSet(makeSet(), 'imported');
    await repo.saveAttempt(makeAttempt());
    await repo.deleteSet('set-1');

    expect(await repo.listSets()).toEqual([]);
    expect(await repo.getSet('set-1')).toBeNull();
    expect(await repo.listAttempts('set-1')).toEqual([]);
  });

  it('refuses to delete a bundled set', async () => {
    await repo.saveSet(makeSet(), 'bundled');
    await expect(repo.deleteSet('set-1')).rejects.toThrow('bundled');
  });

  it('saves and clears the in-progress session', async () => {
    const snapshot = { attemptId: 'att_x', setId: 'set-1', index: 2 } as unknown as SessionState;
    await repo.saveInProgress(snapshot);
    expect(await repo.getInProgress()).toEqual(snapshot);
    await repo.saveInProgress(null);
    expect(await repo.getInProgress()).toBeNull();
  });

  it('survives corrupt stored JSON instead of throwing', async () => {
    const kv = createMemoryKv({ 'pt:index': '{{{ not json' });
    const corrupted = createStorageRepository(kv);
    expect(await corrupted.listSets()).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/data/storage.test.ts`
Expected: FAIL - "Cannot find module './storage'".

- [ ] **Step 4: Write the implementation**

Create `src/data/storage.ts`:

```ts
import type { QuestionSet } from '@/core/schema';
import type { Attempt, SessionState } from '@/core/types';
import type { KVStore } from './kv';
import type { Repository, SaveMode, SetSource, SetSummary } from './repository';

export const KEY_PREFIX = 'pt:';

const INDEX_KEY = `${KEY_PREFIX}index`;
const IN_PROGRESS_KEY = `${KEY_PREFIX}inprogress`;
const setKey = (id: string) => `${KEY_PREFIX}set:${id}`;
const attemptsKey = (setId: string) => `${KEY_PREFIX}attempts:${setId}`;

/** Metadata kept in the index so the library screen never loads full sets. */
type IndexEntry = {
  id: string;
  title: string;
  description: string | null;
  version: string | null;
  questionCount: number;
  topicCount: number;
  source: SetSource;
};

export function createStorageRepository(kv: KVStore): Repository {
  // A corrupt value must never take the whole library down (spec §7).
  async function read<T>(key: string, fallback: T): Promise<T> {
    const raw = await kv.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  const write = (key: string, value: unknown) => kv.setItem(key, JSON.stringify(value));

  const readIndex = () => read<IndexEntry[]>(INDEX_KEY, []);
  const readAttempts = (setId: string) => read<Attempt[]>(attemptsKey(setId), []);

  const toEntry = (set: QuestionSet, source: SetSource): IndexEntry => ({
    id: set.id,
    title: set.title,
    description: set.description ?? null,
    version: set.version ?? null,
    questionCount: set.questions.length,
    topicCount: set.topics?.length ?? 0,
    source,
  });

  /** Newest first. A free function rather than a method, so no call site depends on `this`. */
  async function listAll(setId?: string): Promise<Attempt[]> {
    const ids = setId ? [setId] : (await readIndex()).map((e) => e.id);
    const all: Attempt[] = [];
    for (const id of ids) all.push(...(await readAttempts(id)));
    return all.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  }

  async function nextCopyId(baseId: string): Promise<string> {
    const index = await readIndex();
    const taken = new Set(index.map((entry) => entry.id));
    let n = 2;
    while (taken.has(`${baseId}-copy-${n}`)) n += 1;
    return `${baseId}-copy-${n}`;
  }

  return {
    async listSets() {
      const index = await readIndex();
      const summaries: SetSummary[] = [];
      for (const entry of index) {
        const attempts = await readAttempts(entry.id);
        const best = attempts.reduce<number | null>(
          (max, a) => (max === null || a.score.percent > max ? a.score.percent : max),
          null,
        );
        const last = attempts.reduce<string | null>(
          (latest, a) => (latest === null || a.finishedAt > latest ? a.finishedAt : latest),
          null,
        );
        summaries.push({
          ...entry,
          attemptCount: attempts.length,
          bestPercent: best,
          lastAttemptAt: last,
        });
      }
      return summaries;
    },

    async getSet(setId) {
      return read<QuestionSet | null>(setKey(setId), null);
    },

    async saveSet(set, source, mode = 'replace') {
      const id = mode === 'copy' ? await nextCopyId(set.id) : set.id;
      const stored: QuestionSet = { ...set, id };
      await write(setKey(id), stored);

      const index = await readIndex();
      const entry = toEntry(stored, source);
      const existing = index.findIndex((e) => e.id === id);
      if (existing >= 0) index[existing] = entry;
      else index.push(entry);
      await write(INDEX_KEY, index);

      return id;
    },

    async deleteSet(setId) {
      const index = await readIndex();
      const entry = index.find((e) => e.id === setId);
      if (entry?.source === 'bundled') {
        throw new Error(`"${entry.title}" is a bundled set and cannot be deleted`);
      }
      await kv.removeItem(setKey(setId));
      await kv.removeItem(attemptsKey(setId));
      await write(
        INDEX_KEY,
        index.filter((e) => e.id !== setId),
      );
    },

    listAttempts(setId) {
      return listAll(setId);
    },

    async getAttempt(attemptId) {
      const all = await listAll();
      return all.find((a) => a.id === attemptId) ?? null;
    },

    async saveAttempt(attempt) {
      const attempts = await readAttempts(attempt.setId);
      const existing = attempts.findIndex((a) => a.id === attempt.id);
      if (existing >= 0) attempts[existing] = attempt;
      else attempts.push(attempt);
      await write(attemptsKey(attempt.setId), attempts);
    },

    async getInProgress() {
      return read<SessionState | null>(IN_PROGRESS_KEY, null);
    },

    async saveInProgress(state) {
      if (state === null) await kv.removeItem(IN_PROGRESS_KEY);
      else await write(IN_PROGRESS_KEY, state);
    },
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/data/storage.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 6: Commit**

```bash
git add src/data/kv.ts src/data/repository.ts src/data/storage.ts src/data/storage.test.ts
git commit -m "Add repository interface and key-value backed implementation"
```

---

### Task 10: AsyncStorage wiring, bundled sets, and the repository provider

**Files:**
- Create: `src/data/asyncStorageKv.ts`, `src/data/bundled.ts`, `src/data/RepositoryProvider.tsx`, `assets/sets/sample-cloud-basics.json`, `assets/sets/sample-all-types.json`
- Test: `src/data/bundled.test.ts`

**Interfaces:**
- Consumes: `createStorageRepository`, `KVStore`, `Repository`, `validateSet` from `@/core/validate`.
- Produces:
  - From `@/data/asyncStorageKv`: `asyncStorageKv: KVStore`
  - From `@/data/bundled`: `BUNDLED_SETS: unknown[]` (raw JSON), `seedBundledSets(repo: Repository): Promise<void>`
  - From `@/data/RepositoryProvider`: `RepositoryProvider` (props: `children`, optional `repository`), `useRepository(): Repository`, `useRepositoryReady(): boolean`

Spec §5.2 and §6.1. Bundled sets are validated with the same validator as imports - if a sample set is malformed, that is a bug the test suite must catch, not something users discover.

- [ ] **Step 1: Write the sample sets**

Create `assets/sets/sample-cloud-basics.json` - a small realistic set exercising `single`, `multi` and `boolean`:

```json
{
  "schemaVersion": 1,
  "id": "sample-cloud-basics",
  "title": "Cloud Basics — Sample Set",
  "description": "A short sample set showing single, multiple and true/false questions.",
  "version": "1.0.0",
  "author": "Practice Test App",
  "language": "en",
  "topics": [
    { "id": "storage", "name": "Storage" },
    { "id": "network", "name": "Networking" }
  ],
  "exam": {
    "questionCount": 3,
    "timeLimitMinutes": 5,
    "passingScore": 70,
    "shuffleQuestions": true,
    "shuffleOptions": true
  },
  "questions": [
    {
      "id": "cb-001",
      "type": "single",
      "topicId": "storage",
      "difficulty": "easy",
      "prompt": "Which storage type is best suited to serving static website files?",
      "explanation": "Object storage is designed for large numbers of independent files served over HTTP.",
      "options": [
        { "id": "a", "text": "Object storage", "correct": true,
          "explanation": "Correct — objects are addressed by key and served directly over HTTP." },
        { "id": "b", "text": "Block storage", "correct": false,
          "explanation": "Block storage attaches to one machine and has no HTTP interface of its own." },
        { "id": "c", "text": "Archive storage", "correct": false,
          "explanation": "Archive storage trades retrieval latency for cost — wrong for live pages." }
      ]
    },
    {
      "id": "cb-002",
      "type": "multi",
      "topicId": "network",
      "difficulty": "medium",
      "prompt": "Which two of these operate at the network layer?",
      "explanation": "Routers and subnets are layer-3 concepts; the others are not.",
      "options": [
        { "id": "a", "text": "Router", "correct": true, "explanation": "Correct — routers forward packets between networks." },
        { "id": "b", "text": "Subnet", "correct": true, "explanation": "Correct — a subnet is a layer-3 address range." },
        { "id": "c", "text": "TLS certificate", "correct": false, "explanation": "TLS lives far above the network layer." }
      ]
    },
    {
      "id": "cb-003",
      "type": "boolean",
      "topicId": "network",
      "prompt": "A public IP address is required for two machines in the same private subnet to talk to each other.",
      "answer": false,
      "explanation": "Machines in the same subnet reach each other on private addresses.",
      "reference": { "label": "Private address ranges (RFC 1918)", "url": "https://datatracker.ietf.org/doc/html/rfc1918" }
    }
  ]
}
```

Create `assets/sets/sample-all-types.json` - the fixture that proves every renderer works, including the two that ship last:

```json
{
  "schemaVersion": 1,
  "id": "sample-all-types",
  "title": "Every Question Type — Sample Set",
  "description": "One question of each supported type, for checking every renderer.",
  "version": "1.0.0",
  "questions": [
    {
      "id": "at-001",
      "type": "single",
      "prompt": "Pick the only correct answer.",
      "options": [
        { "id": "a", "text": "This one", "correct": true, "explanation": "Correct." },
        { "id": "b", "text": "Not this one", "correct": false, "explanation": "Incorrect." }
      ]
    },
    {
      "id": "at-002",
      "type": "multi",
      "prompt": "Pick both correct answers.",
      "options": [
        { "id": "a", "text": "First correct", "correct": true, "explanation": "Correct." },
        { "id": "b", "text": "Second correct", "correct": true, "explanation": "Correct." },
        { "id": "c", "text": "Distractor", "correct": false, "explanation": "Incorrect." }
      ]
    },
    {
      "id": "at-003",
      "type": "boolean",
      "prompt": "This statement is true.",
      "answer": true,
      "explanation": "It says so."
    },
    {
      "id": "at-004",
      "type": "ordering",
      "prompt": "Put these steps in order.",
      "explanation": "Plan, then build, then ship.",
      "items": [
        { "id": "i1", "text": "Plan" },
        { "id": "i2", "text": "Build" },
        { "id": "i3", "text": "Ship" }
      ],
      "correctOrder": ["i1", "i2", "i3"]
    },
    {
      "id": "at-005",
      "type": "matching",
      "prompt": "Match each term to its definition.",
      "explanation": "Each term has exactly one definition.",
      "left": [
        { "id": "l1", "text": "Latency" },
        { "id": "l2", "text": "Throughput" }
      ],
      "right": [
        { "id": "r1", "text": "Time for one request" },
        { "id": "r2", "text": "Requests per second" }
      ],
      "pairs": [
        { "left": "l1", "right": "r1" },
        { "left": "l2", "right": "r2" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Write the failing test**

Create `src/data/bundled.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';
import { validateSet } from '@/core/validate';
import { createMemoryKv } from './kv';
import { createStorageRepository } from './storage';
import { BUNDLED_SETS, seedBundledSets } from './bundled';

describe('bundled sets', () => {
  it('ships at least two sets', () => {
    expect(BUNDLED_SETS.length).toBeGreaterThanOrEqual(2);
  });

  it('every bundled set passes the same validation as an import', () => {
    BUNDLED_SETS.forEach((raw) => {
      const result = validateSet(raw);
      if (!result.ok) {
        throw new Error(`bundled set invalid: ${JSON.stringify(result.errors, null, 2)}`);
      }
      expect(result.ok).toBe(true);
    });
  });

  it('covers all five question types across the samples', () => {
    const types = new Set(
      BUNDLED_SETS.flatMap((raw) => {
        const result = validateSet(raw);
        return result.ok ? result.set.questions.map((q) => q.type) : [];
      }),
    );
    expect([...types].sort()).toEqual(['boolean', 'matching', 'multi', 'ordering', 'single']);
  });

  it('seeds sets into an empty repository', async () => {
    const repo = createStorageRepository(createMemoryKv());
    await seedBundledSets(repo);
    const sets = await repo.listSets();
    expect(sets).toHaveLength(BUNDLED_SETS.length);
    expect(sets.every((s) => s.source === 'bundled')).toBe(true);
  });

  it('is idempotent and keeps attempt history on re-seed', async () => {
    const repo = createStorageRepository(createMemoryKv());
    await seedBundledSets(repo);
    await seedBundledSets(repo);
    expect(await repo.listSets()).toHaveLength(BUNDLED_SETS.length);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest src/data/bundled.test.ts`
Expected: FAIL - "Cannot find module './bundled'".

- [ ] **Step 4: Write the wiring**

Create `src/data/asyncStorageKv.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KVStore } from './kv';

export const asyncStorageKv: KVStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
```

Create `src/data/bundled.ts`:

```ts
import { validateSet } from '@/core/validate';
import type { Repository } from './repository';
import cloudBasics from '../../assets/sets/sample-cloud-basics.json';
import allTypes from '../../assets/sets/sample-all-types.json';

export const BUNDLED_SETS: unknown[] = [cloudBasics, allTypes];

/**
 * Writes every bundled set into the repository. Re-running replaces the set
 * content in place, so attempt history survives an app update that ships new
 * sample content.
 */
export async function seedBundledSets(repo: Repository): Promise<void> {
  for (const raw of BUNDLED_SETS) {
    const result = validateSet(raw);
    if (!result.ok) {
      // A malformed bundled set is a build-time bug; fail loudly in development.
      throw new Error(`Bundled set is invalid: ${JSON.stringify(result.errors)}`);
    }
    await repo.saveSet(result.set, 'bundled', 'replace');
  }
}
```

If TypeScript complains about importing JSON, add `"resolveJsonModule": true` to `compilerOptions` in `tsconfig.json`.

Create `src/data/RepositoryProvider.tsx`:

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { asyncStorageKv } from './asyncStorageKv';
import { seedBundledSets } from './bundled';
import type { Repository } from './repository';
import { createStorageRepository } from './storage';

const RepositoryContext = createContext<{ repository: Repository; ready: boolean } | null>(null);

export function RepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode;
  /** Tests inject a repository over an in-memory KV; the app leaves this undefined. */
  repository?: Repository;
}) {
  const repo = useMemo(
    () => repository ?? createStorageRepository(asyncStorageKv),
    [repository],
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    seedBundledSets(repo)
      .catch((error) => console.error('Failed to seed bundled sets', error))
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const value = useMemo(() => ({ repository: repo, ready }), [repo, ready]);

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

export function useRepository(): Repository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useRepository must be used inside a RepositoryProvider');
  return context.repository;
}

export function useRepositoryReady(): boolean {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useRepositoryReady must be used inside a RepositoryProvider');
  return context.ready;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/data/bundled.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/data assets/sets tsconfig.json
git commit -m "Add bundled sample sets, AsyncStorage wiring and repository provider"
```

---

### Task 11: Design tokens, formatting helpers, and shared components

**Files:**
- Create: `src/ui/theme.ts`, `src/ui/format.ts`, `src/ui/Button.tsx`, `src/ui/Card.tsx`, `src/ui/ProgressBar.tsx`, `src/ui/Screen.tsx`
- Test: `src/ui/format.test.ts`, `src/ui/Button.test.tsx`

**Interfaces:**
- Consumes: nothing outside React Native.
- Produces:
  - From `@/ui/theme`: `spacing`, `radius`, `type`, `type Theme`, `lightTheme`, `darkTheme`, `useTheme(): Theme`
  - From `@/ui/format`: `formatDuration(ms: number): string`, `formatClock(ms: number): string`, `formatPercent(percent: number): string`, `formatDate(iso: string): string`
  - From components: `Button` (props `title`, `onPress`, `variant?: 'primary' | 'secondary' | 'danger'`, `disabled?`, `testID?`), `Card` (props `children`, `onPress?`, `testID?`), `ProgressBar` (props `fraction`, `tone?: 'accent' | 'positive' | 'negative'`), `Screen` (props `children`, `scroll?`)

Every colour, space, and radius in the app comes from these tokens - a hardcoded hex in a screen is a review rejection. `formatClock` is the mock timer's display; `formatDuration` is the human-readable elapsed time on results.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/format.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';
import { formatClock, formatDate, formatDuration, formatPercent } from './format';

describe('formatClock', () => {
  it('renders mm:ss under an hour', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(9000)).toBe('00:09');
    expect(formatClock(90 * 60 * 1000)).toBe('90:00');
  });

  it('never goes negative', () => {
    expect(formatClock(-5000)).toBe('00:00');
  });
});

describe('formatDuration', () => {
  it('renders a human-readable elapsed time', () => {
    expect(formatDuration(45 * 1000)).toBe('45s');
    expect(formatDuration(9 * 60 * 1000)).toBe('9m 0s');
    expect(formatDuration(69 * 60 * 1000 + 30 * 1000)).toBe('1h 9m');
  });
});

describe('formatPercent', () => {
  it('drops a trailing .0', () => {
    expect(formatPercent(75)).toBe('75%');
    expect(formatPercent(66.7)).toBe('66.7%');
  });
});

describe('formatDate', () => {
  it('renders a stable short date', () => {
    expect(formatDate('2026-09-06T14:02:11.000Z')).toMatch(/2026/);
  });

  it('returns a dash for an unparseable value', () => {
    expect(formatDate('not a date')).toBe('—');
  });
});
```

Create `src/ui/Button.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Button title="Start" onPress={onPress} testID="start" />);
    fireEvent.press(screen.getByTestId('start'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button title="Start" onPress={onPress} disabled testID="start" />);
    fireEvent.press(screen.getByTestId('start'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders its title', () => {
    render(<Button title="Submit answer" onPress={() => {}} />);
    expect(screen.getByText('Submit answer')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui`
Expected: FAIL - modules not found.

- [ ] **Step 3: Write the tokens**

Create `src/ui/theme.ts`:

```ts
import { useColorScheme } from 'react-native';

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const type = {
  title: { fontSize: 26, fontWeight: '700' as const, lineHeight: 32 },
  heading: { fontSize: 19, fontWeight: '600' as const, lineHeight: 25 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 23 },
  label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 19 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  mono: { fontSize: 18, fontWeight: '600' as const, fontVariant: ['tabular-nums'] as const },
};

export type Theme = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  positive: string;
  positiveSurface: string;
  negative: string;
  negativeSurface: string;
};

export const lightTheme: Theme = {
  background: '#f6f7f9',
  surface: '#ffffff',
  surfaceAlt: '#eef0f4',
  border: '#d9dde4',
  text: '#12161c',
  textMuted: '#5d6472',
  accent: '#2f5bd7',
  accentText: '#ffffff',
  positive: '#1c7a4a',
  positiveSurface: '#e4f4ea',
  negative: '#b3261e',
  negativeSurface: '#fbe6e4',
};

export const darkTheme: Theme = {
  background: '#0f1216',
  surface: '#181c22',
  surfaceAlt: '#22272f',
  border: '#2d333c',
  text: '#f2f4f7',
  textMuted: '#a2abb8',
  accent: '#6d92f5',
  accentText: '#0f1216',
  positive: '#5fd39b',
  positiveSurface: '#123526',
  negative: '#ff8a80',
  negativeSurface: '#3a1a17',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
```

- [ ] **Step 4: Write the formatters**

Create `src/ui/format.ts`:

```ts
const pad = (n: number) => String(n).padStart(2, '0');

/** mm:ss for the mock timer, clamped at zero. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatPercent(percent: number): string {
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
}

export function formatDate(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
```

- [ ] **Step 5: Write the components**

Create `src/ui/Button.tsx`:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native';
import { radius, spacing, type, useTheme, type Theme } from './theme';

type Variant = 'primary' | 'secondary' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const { background, text, border } = tone(theme, variant);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[type.label, { color: text }]}>{title}</Text>
    </Pressable>
  );
}

function tone(theme: Theme, variant: Variant) {
  if (variant === 'primary') {
    return { background: theme.accent, text: theme.accentText, border: theme.accent };
  }
  if (variant === 'danger') {
    return { background: theme.negativeSurface, text: theme.negative, border: theme.negative };
  }
  return { background: theme.surface, text: theme.text, border: theme.border };
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

Create `src/ui/Card.tsx`:

```tsx
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { radius, spacing, useTheme } from './theme';

export function Card({
  children,
  onPress,
  testID,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  testID?: string;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const base = [
    styles.card,
    { backgroundColor: theme.surface, borderColor: theme.border },
    style,
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={base}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [...base, { opacity: pressed ? 0.9 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
});
```

Create `src/ui/ProgressBar.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';
import { radius, useTheme } from './theme';

export function ProgressBar({
  fraction,
  tone = 'accent',
}: {
  fraction: number;
  tone?: 'accent' | 'positive' | 'negative';
}) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  const color =
    tone === 'positive' ? theme.positive : tone === 'negative' ? theme.negative : theme.accent;

  return (
    <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
```

Create `src/ui/Screen.tsx`:

```tsx
import { ScrollView, StyleSheet, View } from 'react-native';
import { spacing, useTheme } from './theme';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const theme = useTheme();
  if (!scroll) {
    return <View style={[styles.container, { backgroundColor: theme.background }]}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
});
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx jest src/ui`
Expected: PASS, 10 tests.

- [ ] **Step 7: Commit**

```bash
git add src/ui
git commit -m "Add design tokens, formatters and shared components"
```

---

### Task 12: Router shell and the library screen

**Files:**
- Create: `src/ui/LibraryView.tsx`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`
- Test: `src/ui/LibraryView.test.tsx`

**Interfaces:**
- Consumes: `SetSummary` from `@/data/repository`; `useRepository`, `useRepositoryReady`, `RepositoryProvider` from `@/data/RepositoryProvider`; the Task 11 components.
- Produces: `LibraryView` (props `sets: SetSummary[]`, `loading: boolean`, `onOpenSet(setId: string): void`, `onImport(): void`)

Spec §6.1. The pattern established here holds for every remaining screen: a `*View` component takes plain props and is unit-tested, and the route file does nothing but load data from the repository and wire the router. No route file contains display logic worth testing.

- [ ] **Step 1: Write the failing test**

Create `src/ui/LibraryView.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SetSummary } from '@/data/repository';
import { LibraryView } from './LibraryView';

const summary = (over: Partial<SetSummary> = {}): SetSummary => ({
  id: 'set-1',
  title: 'Cloud Basics',
  description: 'A sample set',
  version: '1.0.0',
  questionCount: 40,
  topicCount: 3,
  source: 'bundled',
  attemptCount: 0,
  bestPercent: null,
  lastAttemptAt: null,
  ...over,
});

describe('LibraryView', () => {
  it('lists each set with its question and topic counts', () => {
    render(
      <LibraryView sets={[summary()]} loading={false} onOpenSet={() => {}} onImport={() => {}} />,
    );
    expect(screen.getByText('Cloud Basics')).toBeTruthy();
    expect(screen.getByText('40 questions · 3 topics')).toBeTruthy();
  });

  it('shows the best score and last attempt when there is history', () => {
    render(
      <LibraryView
        sets={[summary({ attemptCount: 2, bestPercent: 82.5, lastAttemptAt: '2026-09-06T14:00:00.000Z' })]}
        loading={false}
        onOpenSet={() => {}}
        onImport={() => {}}
      />,
    );
    expect(screen.getByText(/Best 82.5%/)).toBeTruthy();
  });

  it('opens a set when its card is tapped', () => {
    const onOpenSet = jest.fn();
    render(
      <LibraryView sets={[summary()]} loading={false} onOpenSet={onOpenSet} onImport={() => {}} />,
    );
    fireEvent.press(screen.getByTestId('set-card-set-1'));
    expect(onOpenSet).toHaveBeenCalledWith('set-1');
  });

  it('shows an empty state pointing at import when there are no sets', () => {
    const onImport = jest.fn();
    render(<LibraryView sets={[]} loading={false} onOpenSet={() => {}} onImport={onImport} />);
    expect(screen.getByText(/No question sets yet/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('import-button'));
    expect(onImport).toHaveBeenCalled();
  });

  it('shows a loading state instead of the empty state while loading', () => {
    render(<LibraryView sets={[]} loading onOpenSet={() => {}} onImport={() => {}} />);
    expect(screen.queryByText(/No question sets yet/)).toBeNull();
    expect(screen.getByTestId('library-loading')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/ui/LibraryView.test.tsx`
Expected: FAIL - "Cannot find module './LibraryView'".

- [ ] **Step 3: Write the view**

Create `src/ui/LibraryView.tsx`:

```tsx
import { ActivityIndicator, Text, View } from 'react-native';
import type { SetSummary } from '@/data/repository';
import { Button } from './Button';
import { Card } from './Card';
import { formatDate, formatPercent } from './format';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function LibraryView({
  sets,
  loading,
  onOpenSet,
  onImport,
}: {
  sets: SetSummary[];
  loading: boolean;
  onOpenSet: (setId: string) => void;
  onImport: () => void;
}) {
  const theme = useTheme();

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <Text style={[type.title, { color: theme.text }]}>Question sets</Text>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          Pick a set to practise, or import your own JSON.
        </Text>
      </View>

      <Button title="Import a set" onPress={onImport} variant="secondary" testID="import-button" />

      {loading ? (
        <ActivityIndicator testID="library-loading" />
      ) : sets.length === 0 ? (
        <Card>
          <Text style={[type.body, { color: theme.text }]}>No question sets yet.</Text>
          <Text style={[type.caption, { color: theme.textMuted }]}>
            Import a JSON file to get started.
          </Text>
        </Card>
      ) : (
        sets.map((set) => (
          <Card key={set.id} testID={`set-card-${set.id}`} onPress={() => onOpenSet(set.id)}>
            <Text style={[type.heading, { color: theme.text }]}>{set.title}</Text>
            {set.description ? (
              <Text style={[type.caption, { color: theme.textMuted }]} numberOfLines={2}>
                {set.description}
              </Text>
            ) : null}
            <Text style={[type.caption, { color: theme.textMuted }]}>
              {`${set.questionCount} questions · ${set.topicCount} topics`}
            </Text>
            {set.attemptCount > 0 && set.bestPercent !== null ? (
              <Text style={[type.caption, { color: theme.textMuted }]}>
                {`Best ${formatPercent(set.bestPercent)} · last ${formatDate(set.lastAttemptAt ?? '')}`}
              </Text>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/ui/LibraryView.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Wire the routes**

Create `app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { RepositoryProvider } from '@/data/RepositoryProvider';

export default function RootLayout() {
  return (
    <RepositoryProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="set/[setId]" options={{ title: 'Set' }} />
        <Stack.Screen name="session/[attemptId]" options={{ title: 'Session', headerBackVisible: false }} />
        <Stack.Screen name="results/[attemptId]" options={{ title: 'Results' }} />
        <Stack.Screen name="import" options={{ title: 'Import a set', presentation: 'modal' }} />
      </Stack>
    </RepositoryProvider>
  );
}
```

Create `app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Library' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
    </Tabs>
  );
}
```

Create `app/(tabs)/index.tsx`:

```tsx
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useRepository, useRepositoryReady } from '@/data/RepositoryProvider';
import type { SetSummary } from '@/data/repository';
import { LibraryView } from '@/ui/LibraryView';

export default function LibraryScreen() {
  const repository = useRepository();
  const ready = useRepositoryReady();
  const router = useRouter();
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Refresh on focus so a new import or a finished attempt shows immediately.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!ready) return;
      setLoading(true);
      repository
        .listSets()
        .then((result) => {
          if (!cancelled) setSets(result);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [repository, ready]),
  );

  return (
    <LibraryView
      sets={sets}
      loading={loading || !ready}
      onOpenSet={(setId) => router.push(`/set/${setId}`)}
      onImport={() => router.push('/import')}
    />
  );
}
```

Create a placeholder `app/(tabs)/history.tsx` so the tab bar resolves; Task 17 fills it in:

```tsx
import { Text } from 'react-native';
import { Screen } from '@/ui/Screen';

export default function HistoryScreen() {
  return (
    <Screen>
      <Text>History</Text>
    </Screen>
  );
}
```

- [ ] **Step 6: Verify the app runs**

Run: `npx expo start --web`
Expected: the Library tab lists both bundled sample sets. Tapping one navigates to a "Set" screen that is still empty (Task 13). Stop the server.

- [ ] **Step 7: Commit**

```bash
git add app src/ui/LibraryView.tsx src/ui/LibraryView.test.tsx
git commit -m "Add router shell and library screen"
```

---

### Task 13: Set detail and the pre-test configuration

**Files:**
- Create: `src/ui/SetDetailView.tsx`, `app/set/[setId].tsx`
- Test: `src/ui/SetDetailView.test.tsx`

**Interfaces:**
- Consumes: `QuestionSet` from `@/core/schema`; `Attempt` from `@/core/types`; `resolveRunConfig`, `DEFAULT_EXAM` from `@/core/config`; `randomSeed` from `@/core/shuffle`; `startSession` from `@/core/session`.
- Produces: `SetDetailView` (props `set: QuestionSet`, `attempts: Attempt[]`, `onStart(mode: RunMode, overrides: RunOverrides): void`, `onDelete?: () => void`, `onOpenAttempt(attemptId: string): void`)

Spec §6.2. The mock panel prefills from `exam` and stays editable; asking for more questions than the set holds is stated, not blocked.

- [ ] **Step 1: Write the failing test**

Create `src/ui/SetDetailView.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { QuestionSet } from '@/core/schema';
import { SetDetailView } from './SetDetailView';

const set: QuestionSet = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Cloud Basics',
  description: 'A sample set',
  topics: [{ id: 'storage', name: 'Storage' }],
  exam: { questionCount: 2, timeLimitMinutes: 30, passingScore: 80 },
  questions: [
    { id: 'q-1', type: 'boolean', topicId: 'storage', prompt: 'True?', answer: true },
    { id: 'q-2', type: 'boolean', topicId: 'storage', prompt: 'Also true?', answer: true },
    { id: 'q-3', type: 'boolean', prompt: 'Still true?', answer: true },
  ],
};

describe('SetDetailView', () => {
  it('shows the title, description and topics', () => {
    render(<SetDetailView set={set} attempts={[]} onStart={() => {}} onOpenAttempt={() => {}} />);
    expect(screen.getByText('Cloud Basics')).toBeTruthy();
    expect(screen.getByText('A sample set')).toBeTruthy();
    expect(screen.getByText('Storage')).toBeTruthy();
  });

  it('prefills the mock configuration from the exam block', () => {
    render(<SetDetailView set={set} attempts={[]} onStart={() => {}} onOpenAttempt={() => {}} />);
    expect(screen.getByTestId('question-count-input').props.value).toBe('2');
    expect(screen.getByTestId('time-limit-input').props.value).toBe('30');
  });

  it('starts a mock run with the edited configuration', () => {
    const onStart = jest.fn();
    render(<SetDetailView set={set} attempts={[]} onStart={onStart} onOpenAttempt={() => {}} />);
    fireEvent.changeText(screen.getByTestId('question-count-input'), '3');
    fireEvent.press(screen.getByTestId('start-mock'));
    expect(onStart).toHaveBeenCalledWith('mock', expect.objectContaining({ questionCount: 3 }));
  });

  it('warns when the requested count exceeds the set size', () => {
    render(<SetDetailView set={set} attempts={[]} onStart={() => {}} onOpenAttempt={() => {}} />);
    fireEvent.changeText(screen.getByTestId('question-count-input'), '65');
    expect(screen.getByText(/only has 3 questions/)).toBeTruthy();
  });

  it('starts practice mode with no configuration', () => {
    const onStart = jest.fn();
    render(<SetDetailView set={set} attempts={[]} onStart={onStart} onOpenAttempt={() => {}} />);
    fireEvent.press(screen.getByTestId('start-practice'));
    expect(onStart).toHaveBeenCalledWith('practice', {});
  });

  it('hides the delete action for a set that cannot be deleted', () => {
    render(<SetDetailView set={set} attempts={[]} onStart={() => {}} onOpenAttempt={() => {}} />);
    expect(screen.queryByTestId('delete-set')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/ui/SetDetailView.test.tsx`
Expected: FAIL - "Cannot find module './SetDetailView'".

- [ ] **Step 3: Write the view**

Create `src/ui/SetDetailView.tsx`:

```tsx
import { useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import { DEFAULT_EXAM } from '@/core/config';
import type { QuestionSet } from '@/core/schema';
import type { Attempt, RunMode, RunOverrides } from '@/core/types';
import { Button } from './Button';
import { Card } from './Card';
import { formatDate, formatPercent } from './format';
import { Screen } from './Screen';
import { radius, spacing, type, useTheme } from './theme';

export function SetDetailView({
  set,
  attempts,
  onStart,
  onDelete,
  onOpenAttempt,
}: {
  set: QuestionSet;
  attempts: Attempt[];
  onStart: (mode: RunMode, overrides: RunOverrides) => void;
  onDelete?: () => void;
  onOpenAttempt: (attemptId: string) => void;
}) {
  const theme = useTheme();
  const total = set.questions.length;

  const [count, setCount] = useState(String(set.exam?.questionCount ?? total));
  const [limit, setLimit] = useState(
    set.exam?.timeLimitMinutes === undefined ? '' : String(set.exam.timeLimitMinutes),
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(
    set.exam?.shuffleQuestions ?? DEFAULT_EXAM.shuffleQuestions,
  );
  const [shuffleOptions, setShuffleOptions] = useState(
    set.exam?.shuffleOptions ?? DEFAULT_EXAM.shuffleOptions,
  );

  const requested = Number.parseInt(count, 10);
  const overCount = Number.isFinite(requested) && requested > total;

  const startMock = () => {
    const parsedLimit = Number.parseInt(limit, 10);
    onStart('mock', {
      questionCount: Number.isFinite(requested) ? requested : total,
      timeLimitMinutes: Number.isFinite(parsedLimit) ? parsedLimit : null,
      shuffleQuestions,
      shuffleOptions,
    });
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    color: theme.text,
    backgroundColor: theme.surface,
    padding: spacing.sm,
    minWidth: 80,
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <Text style={[type.title, { color: theme.text }]}>{set.title}</Text>
        {set.description ? (
          <Text style={[type.body, { color: theme.textMuted }]}>{set.description}</Text>
        ) : null}
        <Text style={[type.caption, { color: theme.textMuted }]}>
          {`${total} questions${set.version ? ` · version ${set.version}` : ''}`}
        </Text>
      </View>

      {set.topics?.length ? (
        <Card>
          <Text style={[type.label, { color: theme.text }]}>Topics</Text>
          {set.topics.map((topic) => (
            <Text key={topic.id} style={[type.caption, { color: theme.textMuted }]}>
              {topic.name}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text style={[type.heading, { color: theme.text }]}>Mock test</Text>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          Timed, no feedback until you submit.
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>Questions</Text>
          <TextInput
            testID="question-count-input"
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            style={inputStyle}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>Time limit (minutes)</Text>
          <TextInput
            testID="time-limit-input"
            value={limit}
            onChangeText={setLimit}
            placeholder="none"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            style={inputStyle}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>Shuffle questions</Text>
          <Switch testID="shuffle-questions" value={shuffleQuestions} onValueChange={setShuffleQuestions} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>Shuffle options</Text>
          <Switch testID="shuffle-options" value={shuffleOptions} onValueChange={setShuffleOptions} />
        </View>

        {overCount ? (
          <Text style={[type.caption, { color: theme.textMuted }]}>
            {`This set only has ${total} questions, so all ${total} will be used.`}
          </Text>
        ) : null}

        <Button title="Start mock test" onPress={startMock} testID="start-mock" />
      </Card>

      <Card>
        <Text style={[type.heading, { color: theme.text }]}>Practice</Text>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          Every question, one at a time, with the explanation after each answer.
        </Text>
        <Button
          title="Start practice"
          variant="secondary"
          onPress={() => onStart('practice', {})}
          testID="start-practice"
        />
      </Card>

      {attempts.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={[type.heading, { color: theme.text }]}>Past attempts</Text>
          {attempts.map((attempt) => (
            <Card
              key={attempt.id}
              testID={`attempt-${attempt.id}`}
              onPress={() => onOpenAttempt(attempt.id)}
            >
              <Text style={[type.body, { color: theme.text }]}>
                {`${attempt.mode === 'mock' ? 'Mock test' : 'Practice'} · ${formatPercent(attempt.score.percent)}`}
              </Text>
              <Text style={[type.caption, { color: theme.textMuted }]}>
                {formatDate(attempt.finishedAt)}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

      {onDelete ? (
        <Button title="Delete this set" variant="danger" onPress={onDelete} testID="delete-set" />
      ) : null}
    </Screen>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/ui/SetDetailView.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Wire the route**

Create `app/set/[setId].tsx`:

```tsx
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Text } from 'react-native';
import { resolveRunConfig } from '@/core/config';
import type { QuestionSet } from '@/core/schema';
import { startSession } from '@/core/session';
import { randomSeed } from '@/core/shuffle';
import type { Attempt, RunMode, RunOverrides } from '@/core/types';
import { useRepository } from '@/data/RepositoryProvider';
import { Screen } from '@/ui/Screen';
import { SetDetailView } from '@/ui/SetDetailView';

export default function SetDetailScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const repository = useRepository();
  const router = useRouter();
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [deletable, setDeletable] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        repository.getSet(setId),
        repository.listAttempts(setId),
        repository.listSets(),
      ]).then(([loadedSet, loadedAttempts, summaries]) => {
        if (cancelled) return;
        setSet(loadedSet);
        setAttempts(loadedAttempts);
        setDeletable(summaries.find((s) => s.id === setId)?.source === 'imported');
      });
      return () => {
        cancelled = true;
      };
    }, [repository, setId]),
  );

  if (!set) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }

  const start = async (mode: RunMode, overrides: RunOverrides) => {
    const config = resolveRunConfig(set, mode, overrides, randomSeed());
    const session = startSession(set, mode, config, Date.now());
    await repository.saveInProgress(session);
    router.push(`/session/${encodeURIComponent(session.attemptId)}`);
  };

  const remove = () => {
    Alert.alert(
      'Delete this set?',
      `"${set.title}" and its ${attempts.length} attempt(s) will be removed from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await repository.deleteSet(set.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <SetDetailView
      set={set}
      attempts={attempts}
      onStart={start}
      onDelete={deletable ? remove : undefined}
      onOpenAttempt={(attemptId) => router.push(`/results/${encodeURIComponent(attemptId)}`)}
    />
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/SetDetailView.tsx src/ui/SetDetailView.test.tsx app/set
git commit -m "Add set detail screen with pre-test configuration"
```

---

### Task 14: Question rendering and practice feedback

**Files:**
- Create: `src/ui/QuestionCard.tsx`, `src/ui/Feedback.tsx`
- Test: `src/ui/QuestionCard.test.tsx`, `src/ui/Feedback.test.tsx`

**Interfaces:**
- Consumes: `Question` from `@/core/schema`; `correctResponse`, `isCorrect` from `@/core/scoring`.
- Produces:
  - `QuestionCard` (props `question: Question`, `response: string[]`, `revealed: boolean`, `optionOrder: string[]`, `onChange(response: string[]): void`)
  - `Feedback` (props `question: Question`, `response: string[]`)

Spec §3.4, §6.4, §7. `QuestionCard` renders `single`, `multi` and `boolean` here; `ordering` and `matching` fall through to a clear "not yet supported" notice that Tasks 21 and 22 replace. `Feedback` composes the three explanation layers in the spec's order.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/QuestionCard.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Question } from '@/core/schema';
import { QuestionCard } from './QuestionCard';

const single: Question = {
  id: 'q-1',
  type: 'single',
  prompt: 'Which one?',
  options: [
    { id: 'a', text: 'Alpha', correct: true },
    { id: 'b', text: 'Beta', correct: false },
  ],
};

const multi: Question = { ...single, id: 'q-2', type: 'multi' } as Question;

const boolQ: Question = { id: 'q-3', type: 'boolean', prompt: 'Is it true?', answer: true };

const ordering: Question = {
  id: 'q-4',
  type: 'ordering',
  prompt: 'Order these',
  items: [
    { id: 'i1', text: 'One' },
    { id: 'i2', text: 'Two' },
  ],
  correctOrder: ['i1', 'i2'],
};

describe('QuestionCard', () => {
  it('renders the prompt', () => {
    render(
      <QuestionCard question={single} response={[]} revealed={false} optionOrder={['a', 'b']} onChange={() => {}} />,
    );
    expect(screen.getByText('Which one?')).toBeTruthy();
  });

  it('renders options in the given order', () => {
    render(
      <QuestionCard question={single} response={[]} revealed={false} optionOrder={['b', 'a']} onChange={() => {}} />,
    );
    const texts = screen.getAllByTestId(/^option-/).map((node) => node.props.testID);
    expect(texts).toEqual(['option-b', 'option-a']);
  });

  it('replaces the response for a single-choice question', () => {
    const onChange = jest.fn();
    render(
      <QuestionCard question={single} response={['a']} revealed={false} optionOrder={['a', 'b']} onChange={onChange} />,
    );
    fireEvent.press(screen.getByTestId('option-b'));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('toggles options for a multi-choice question', () => {
    const onChange = jest.fn();
    render(
      <QuestionCard question={multi} response={['a']} revealed={false} optionOrder={['a', 'b']} onChange={onChange} />,
    );
    fireEvent.press(screen.getByTestId('option-b'));
    expect(onChange).toHaveBeenCalledWith(['a', 'b']);
    fireEvent.press(screen.getByTestId('option-a'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('ignores taps once revealed', () => {
    const onChange = jest.fn();
    render(
      <QuestionCard question={single} response={['a']} revealed optionOrder={['a', 'b']} onChange={onChange} />,
    );
    fireEvent.press(screen.getByTestId('option-b'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders default True/False labels for a boolean question', () => {
    render(
      <QuestionCard question={boolQ} response={[]} revealed={false} optionOrder={[]} onChange={() => {}} />,
    );
    expect(screen.getByText('True')).toBeTruthy();
    expect(screen.getByText('False')).toBeTruthy();
  });

  it('uses custom boolean labels when the author supplies them', () => {
    const labelled = { ...boolQ, labels: { true: 'Yes', false: 'No' } } as Question;
    render(
      <QuestionCard question={labelled} response={[]} revealed={false} optionOrder={[]} onChange={() => {}} />,
    );
    expect(screen.getByText('Yes')).toBeTruthy();
  });

  it('answers a boolean question with the synthetic ids', () => {
    const onChange = jest.fn();
    render(
      <QuestionCard question={boolQ} response={[]} revealed={false} optionOrder={[]} onChange={onChange} />,
    );
    fireEvent.press(screen.getByTestId('option-false'));
    expect(onChange).toHaveBeenCalledWith(['false']);
  });

  it('states plainly when a type has no renderer yet', () => {
    render(
      <QuestionCard question={ordering} response={[]} revealed={false} optionOrder={[]} onChange={() => {}} />,
    );
    expect(screen.getByTestId('unsupported-question')).toBeTruthy();
  });
});
```

Create `src/ui/Feedback.test.tsx`:

```tsx
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { Question } from '@/core/schema';
import { Feedback } from './Feedback';

const question: Question = {
  id: 'q-1',
  type: 'single',
  prompt: 'Which one?',
  explanation: 'Alpha is the first letter.',
  reference: { label: 'Read more', url: 'https://example.com' },
  options: [
    { id: 'a', text: 'Alpha', correct: true, explanation: 'Correct — it is first.' },
    { id: 'b', text: 'Beta', correct: false, explanation: 'Beta is second, not first.' },
  ],
};

describe('Feedback', () => {
  it('says the answer was correct', () => {
    render(<Feedback question={question} response={['a']} />);
    expect(screen.getByText('Correct')).toBeTruthy();
  });

  it('shows the chosen wrong explanation and the correct one, in that order', () => {
    render(<Feedback question={question} response={['b']} />);
    expect(screen.getByText('Incorrect')).toBeTruthy();
    expect(screen.getByText(/Beta is second/)).toBeTruthy();
    expect(screen.getByText(/Correct — it is first/)).toBeTruthy();
    expect(screen.getByText('Alpha is the first letter.')).toBeTruthy();
  });

  it('treats an unanswered question as incorrect', () => {
    render(<Feedback question={question} response={[]} />);
    expect(screen.getByText('Incorrect')).toBeTruthy();
  });

  it('renders the reference link when present', () => {
    render(<Feedback question={question} response={['a']} />);
    expect(screen.getByTestId('reference-link')).toBeTruthy();
  });

  it('renders only the question explanation for a boolean question', () => {
    const boolQ: Question = {
      id: 'q-2',
      type: 'boolean',
      prompt: 'True?',
      answer: true,
      explanation: 'Because it is.',
    };
    render(<Feedback question={boolQ} response={['false']} />);
    expect(screen.getByText('Because it is.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/QuestionCard.test.tsx src/ui/Feedback.test.tsx`
Expected: FAIL - modules not found.

- [ ] **Step 3: Write QuestionCard**

Create `src/ui/QuestionCard.tsx`:

```tsx
import { Image, Pressable, Text, View } from 'react-native';
import type { Question } from '@/core/schema';
import { Card } from './Card';
import { radius, spacing, type, useTheme, type Theme } from './theme';

type Choice = { id: string; text: string; correct: boolean };

export function QuestionCard({
  question,
  response,
  revealed,
  optionOrder,
  onChange,
}: {
  question: Question;
  response: string[];
  revealed: boolean;
  optionOrder: string[];
  onChange: (response: string[]) => void;
}) {
  const theme = useTheme();

  return (
    <Card>
      <Text style={[type.body, { color: theme.text }]}>{question.prompt}</Text>

      {question.media ? (
        <Image
          accessibilityLabel={question.media.alt}
          source={{ uri: question.media.source }}
          style={{ width: '100%', height: 180, borderRadius: radius.md }}
          resizeMode="contain"
        />
      ) : null}

      <ChoiceList
        question={question}
        response={response}
        revealed={revealed}
        optionOrder={optionOrder}
        onChange={onChange}
        theme={theme}
      />
    </Card>
  );
}

function ChoiceList({
  question,
  response,
  revealed,
  optionOrder,
  onChange,
  theme,
}: {
  question: Question;
  response: string[];
  revealed: boolean;
  optionOrder: string[];
  onChange: (response: string[]) => void;
  theme: Theme;
}) {
  const choices = toChoices(question, optionOrder);

  if (choices === null) {
    return (
      <View testID="unsupported-question" style={{ paddingVertical: spacing.sm }}>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          This question type is not supported in this version of the app, and is scored as skipped.
        </Text>
      </View>
    );
  }

  const press = (id: string) => {
    if (revealed) return;
    if (question.type === 'multi') {
      onChange(response.includes(id) ? response.filter((r) => r !== id) : [...response, id]);
      return;
    }
    onChange([id]);
  };

  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
      {choices.map((choice) => {
        const selected = response.includes(choice.id);
        const border = revealed
          ? choice.correct
            ? theme.positive
            : selected
              ? theme.negative
              : theme.border
          : selected
            ? theme.accent
            : theme.border;
        const background = revealed
          ? choice.correct
            ? theme.positiveSurface
            : selected
              ? theme.negativeSurface
              : theme.surface
          : theme.surface;

        return (
          <Pressable
            key={choice.id}
            testID={`option-${choice.id}`}
            accessibilityRole={question.type === 'multi' ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: selected, disabled: revealed }}
            disabled={revealed}
            onPress={() => press(choice.id)}
            style={{
              borderWidth: selected || revealed ? 2 : 1,
              borderColor: border,
              backgroundColor: background,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            <Text style={[type.body, { color: theme.text }]}>{choice.text}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Returns null for types this version cannot render yet. */
function toChoices(question: Question, optionOrder: string[]): Choice[] | null {
  if (question.type === 'single' || question.type === 'multi') {
    const byId = new Map(question.options.map((o) => [o.id, o]));
    const ids = optionOrder.length > 0 ? optionOrder : question.options.map((o) => o.id);
    return ids
      .map((id) => byId.get(id))
      .filter((o): o is NonNullable<typeof o> => o !== undefined)
      .map((o) => ({ id: o.id, text: o.text, correct: o.correct }));
  }

  if (question.type === 'boolean') {
    return [
      { id: 'true', text: question.labels?.true ?? 'True', correct: question.answer },
      { id: 'false', text: question.labels?.false ?? 'False', correct: !question.answer },
    ];
  }

  return null;
}
```

- [ ] **Step 4: Write Feedback**

Create `src/ui/Feedback.tsx`:

```tsx
import { Linking, Pressable, Text, View } from 'react-native';
import type { Question } from '@/core/schema';
import { isCorrect } from '@/core/scoring';
import { radius, spacing, type, useTheme } from './theme';

export function Feedback({ question, response }: { question: Question; response: string[] }) {
  const theme = useTheme();
  const correct = isCorrect(question, response);

  // Spec §3.4: chosen-wrong explanation, then the correct one, then the question's own.
  const chosenWrong =
    question.type === 'single' || question.type === 'multi'
      ? question.options.filter((o) => response.includes(o.id) && !o.correct)
      : [];
  const correctOptions =
    question.type === 'single' || question.type === 'multi'
      ? question.options.filter((o) => o.correct)
      : [];

  return (
    <View
      testID="feedback"
      style={{
        backgroundColor: correct ? theme.positiveSurface : theme.negativeSurface,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <Text style={[type.label, { color: correct ? theme.positive : theme.negative }]}>
        {correct ? 'Correct' : 'Incorrect'}
      </Text>

      {chosenWrong.map((option) =>
        option.explanation ? (
          <Text key={`wrong-${option.id}`} style={[type.body, { color: theme.text }]}>
            {`${option.text}: ${option.explanation}`}
          </Text>
        ) : null,
      )}

      {!correct
        ? correctOptions.map((option) =>
            option.explanation ? (
              <Text key={`right-${option.id}`} style={[type.body, { color: theme.text }]}>
                {`${option.text}: ${option.explanation}`}
              </Text>
            ) : null,
          )
        : null}

      {question.explanation ? (
        <Text style={[type.body, { color: theme.text }]}>{question.explanation}</Text>
      ) : null}

      {question.reference ? (
        <Pressable
          testID="reference-link"
          accessibilityRole="link"
          onPress={() => Linking.openURL(question.reference!.url)}
        >
          <Text style={[type.caption, { color: theme.accent }]}>{question.reference.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/ui/QuestionCard.test.tsx src/ui/Feedback.test.tsx`
Expected: PASS, 14 tests.

- [ ] **Step 6: Commit**

```bash
git add src/ui/QuestionCard.tsx src/ui/QuestionCard.test.tsx src/ui/Feedback.tsx src/ui/Feedback.test.tsx
git commit -m "Add question rendering and practice feedback"
```

---

### Task 15: The session runner and practice mode

**Files:**
- Create: `src/ui/useSessionRunner.ts`, `src/ui/RunnerView.tsx`, `app/session/[attemptId].tsx`
- Test: `src/ui/RunnerView.test.tsx`, `src/ui/useSessionRunner.test.tsx`

**Interfaces:**
- Consumes: `sessionReducer`, `startSession`, `currentQuestionId`, `isRevealed`, `orderedOptionIds`, `remainingMs` from `@/core/session`; `buildAttempt` from `@/core/scoring`; `useRepository` from `@/data/RepositoryProvider`; `QuestionCard`, `Feedback` from Task 14.
- Produces:
  - `useSessionRunner(): { state, set, question, dispatch, answer, reveal, next, submit, loading }`
  - `RunnerView` (props `state: SessionState`, `question: Question`, `optionOrder: string[]`, `remaining: number | null`, `onAnswer(response): void`, `onReveal(): void`, `onNext(): void`, `onPrev(): void`, `onSubmit(): void`)

Spec §6.3–6.4. This task delivers practice mode end to end; Task 16 adds the mock chrome to the same `RunnerView`.

- [ ] **Step 1: Write the failing view test**

Create `src/ui/RunnerView.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Question } from '@/core/schema';
import type { SessionState } from '@/core/types';
import { RunnerView } from './RunnerView';

const question: Question = {
  id: 'q-1',
  type: 'single',
  prompt: 'Which one?',
  explanation: 'Alpha is first.',
  options: [
    { id: 'a', text: 'Alpha', correct: true, explanation: 'Correct.' },
    { id: 'b', text: 'Beta', correct: false, explanation: 'Wrong.' },
  ],
};

const baseState: SessionState = {
  attemptId: 'att_1',
  setId: 'set-1',
  setVersion: null,
  mode: 'practice',
  config: {
    questionCount: 3,
    timeLimitMinutes: null,
    passingScore: 70,
    shuffleQuestions: false,
    shuffleOptions: false,
    seed: 1,
  },
  questionIds: ['q-1', 'q-2', 'q-3'],
  index: 0,
  answers: {},
  revealed: [],
  timeMs: {},
  startedAt: '2026-09-06T14:00:00.000Z',
  deadlineAt: null,
  enteredAt: 0,
  status: 'active',
};

const props = (over: Partial<React.ComponentProps<typeof RunnerView>> = {}) => ({
  state: baseState,
  question,
  optionOrder: ['a', 'b'],
  remaining: null,
  onAnswer: jest.fn(),
  onReveal: jest.fn(),
  onNext: jest.fn(),
  onPrev: jest.fn(),
  onSubmit: jest.fn(),
  ...over,
});

describe('RunnerView in practice mode', () => {
  it('shows progress as question x of y', () => {
    render(<RunnerView {...props()} />);
    expect(screen.getByText('Question 1 of 3')).toBeTruthy();
  });

  it('disables submit until something is selected', () => {
    render(<RunnerView {...props()} />);
    expect(screen.getByTestId('reveal').props.accessibilityState.disabled).toBe(true);
  });

  it('reveals the answer when submit is pressed', () => {
    const onReveal = jest.fn();
    render(<RunnerView {...props({ state: { ...baseState, answers: { 'q-1': ['b'] } }, onReveal })} />);
    fireEvent.press(screen.getByTestId('reveal'));
    expect(onReveal).toHaveBeenCalled();
  });

  it('shows feedback and a Next button once revealed, and no auto-advance', () => {
    const onNext = jest.fn();
    render(
      <RunnerView
        {...props({
          state: { ...baseState, answers: { 'q-1': ['b'] }, revealed: ['q-1'] },
          onNext,
        })}
      />,
    );
    expect(screen.getByTestId('feedback')).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('offers Finish instead of Next on the last question', () => {
    const onSubmit = jest.fn();
    render(
      <RunnerView
        {...props({
          state: { ...baseState, index: 2, answers: { 'q-1': ['a'] }, revealed: ['q-1'] },
          onSubmit,
        })}
      />,
    );
    fireEvent.press(screen.getByTestId('finish'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('shows no timer and no back button in practice mode', () => {
    render(<RunnerView {...props()} />);
    expect(screen.queryByTestId('timer')).toBeNull();
    expect(screen.queryByTestId('prev')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/ui/RunnerView.test.tsx`
Expected: FAIL - "Cannot find module './RunnerView'".

- [ ] **Step 3: Write the view**

Create `src/ui/RunnerView.tsx`:

```tsx
import { Text, View } from 'react-native';
import type { Question } from '@/core/schema';
import { isRevealed } from '@/core/session';
import type { SessionState } from '@/core/types';
import { Button } from './Button';
import { Feedback } from './Feedback';
import { formatClock } from './format';
import { ProgressBar } from './ProgressBar';
import { QuestionCard } from './QuestionCard';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function RunnerView({
  state,
  question,
  optionOrder,
  remaining,
  onAnswer,
  onReveal,
  onNext,
  onPrev,
  onSubmit,
}: {
  state: SessionState;
  question: Question;
  optionOrder: string[];
  remaining: number | null;
  onAnswer: (response: string[]) => void;
  onReveal: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
}) {
  const theme = useTheme();
  const total = state.questionIds.length;
  const position = state.index + 1;
  const response = state.answers[question.id] ?? [];
  const revealed = isRevealed(state, question.id);
  const isLast = state.index === total - 1;
  const practice = state.mode === 'practice';

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[type.label, { color: theme.textMuted, flex: 1 }]}>
            {`Question ${position} of ${total}`}
          </Text>
          {remaining !== null ? (
            <Text
              testID="timer"
              style={[
                type.mono,
                { color: remaining <= 60_000 ? theme.negative : theme.text },
              ]}
            >
              {formatClock(remaining)}
            </Text>
          ) : null}
        </View>
        <ProgressBar fraction={position / total} />
      </View>

      <QuestionCard
        question={question}
        response={response}
        revealed={revealed}
        optionOrder={optionOrder}
        onChange={onAnswer}
      />

      {revealed ? <Feedback question={question} response={response} /> : null}

      {practice ? (
        revealed ? (
          isLast ? (
            <Button title="Finish" onPress={onSubmit} testID="finish" />
          ) : (
            <Button title="Next" onPress={onNext} testID="next" />
          )
        ) : (
          <Button
            title="Submit answer"
            onPress={onReveal}
            disabled={response.length === 0}
            testID="reveal"
          />
        )
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Back"
              variant="secondary"
              onPress={onPrev}
              disabled={state.index === 0}
              testID="prev"
            />
          </View>
          <View style={{ flex: 1 }}>
            {isLast ? (
              <Button title="Submit test" onPress={onSubmit} testID="submit" />
            ) : (
              <Button title="Next" onPress={onNext} testID="next" />
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}
```

- [ ] **Step 4: Run the view test to verify it passes**

Run: `npx jest src/ui/RunnerView.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the failing hook test**

Create `src/ui/useSessionRunner.test.tsx`:

```tsx
import { describe, expect, it } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { resolveRunConfig } from '@/core/config';
import type { QuestionSet } from '@/core/schema';
import { startSession } from '@/core/session';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { createMemoryKv } from '@/data/kv';
import { createStorageRepository } from '@/data/storage';
import { useSessionRunner } from './useSessionRunner';

const set: QuestionSet = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Set One',
  questions: [
    { id: 'q-1', type: 'boolean', prompt: 'True?', answer: true, explanation: 'Yes.' },
    { id: 'q-2', type: 'boolean', prompt: 'Also true?', answer: true, explanation: 'Yes.' },
  ],
};

async function harness() {
  const repository = createStorageRepository(createMemoryKv());
  await repository.saveSet(set, 'imported');
  const config = resolveRunConfig(set, 'practice', undefined, 7);
  const session = startSession(set, 'practice', config, Date.now());
  await repository.saveInProgress(session);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <RepositoryProvider repository={repository}>{children}</RepositoryProvider>
  );
  return { repository, session, wrapper };
}

describe('useSessionRunner', () => {
  it('loads the in-progress session and its set', async () => {
    const { wrapper } = await harness();
    const { result } = renderHook(() => useSessionRunner(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state?.setId).toBe('set-1');
    expect(result.current.question?.id).toBeDefined();
  });

  it('persists every answer so the session survives a relaunch', async () => {
    const { repository, wrapper } = await harness();
    const { result } = renderHook(() => useSessionRunner(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const questionId = result.current.question!.id;
    await act(async () => result.current.answer(['true']));

    await waitFor(async () => {
      const saved = await repository.getInProgress();
      expect(saved?.answers[questionId]).toEqual(['true']);
    });
  });

  it('saves an attempt and clears the in-progress session on submit', async () => {
    const { repository, wrapper } = await harness();
    const { result } = renderHook(() => useSessionRunner(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.answer(['true']));
    await act(async () => result.current.submit());

    await waitFor(async () => {
      expect(await repository.getInProgress()).toBeNull();
    });
    const attempts = await repository.listAttempts('set-1');
    expect(attempts).toHaveLength(1);
    expect(attempts[0].answers).toHaveLength(2);
  });
});
```

- [ ] **Step 6: Run the hook test to verify it fails**

Run: `npx jest src/ui/useSessionRunner.test.tsx`
Expected: FAIL - "Cannot find module './useSessionRunner'".

- [ ] **Step 7: Write the hook**

Create `src/ui/useSessionRunner.ts`:

```ts
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Question, QuestionSet } from '@/core/schema';
import { buildAttempt } from '@/core/scoring';
import {
  currentQuestionId,
  orderedOptionIds,
  remainingMs,
  sessionReducer,
} from '@/core/session';
import type { SessionAction, SessionState } from '@/core/types';
import { useRepository } from '@/data/RepositoryProvider';

type Loaded = { state: SessionState; set: QuestionSet };

function reducer(loaded: Loaded | null, action: SessionAction | { type: 'LOAD'; loaded: Loaded }) {
  if (action.type === 'LOAD') return action.loaded;
  if (!loaded) return loaded;
  return { ...loaded, state: sessionReducer(loaded.state, action) };
}

export function useSessionRunner() {
  const repository = useRepository();
  const [loaded, dispatch] = useReducer(reducer, null);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await repository.getInProgress();
      const set = state ? await repository.getSet(state.setId) : null;
      if (!cancelled && state && set) dispatch({ type: 'LOAD', loaded: { state, set } });
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [repository]);

  // Every state change is written through, so a crash costs at most the current tap.
  useEffect(() => {
    if (!loaded || loaded.state.status !== 'active') return;
    repository.saveInProgress(loaded.state).catch((error) => {
      console.error('Failed to save session progress', error);
    });
  }, [loaded, repository]);

  // The clock is derived from the absolute deadline, never from a counter.
  useEffect(() => {
    if (!loaded?.state.deadlineAt || loaded.state.status !== 'active') {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const now = Date.now();
      setRemaining(remainingMs(loaded.state, now));
      dispatch({ type: 'TICK', nowMs: now });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [loaded]);

  const finish = useCallback(
    async (state: SessionState, set: QuestionSet) => {
      if (finished.current) return;
      finished.current = true;
      const attempt = buildAttempt(state, set.questions, Date.now());
      await repository.saveAttempt(attempt);
      await repository.saveInProgress(null);
    },
    [repository],
  );

  // Covers both the explicit submit and the timer's auto-submit.
  useEffect(() => {
    if (loaded?.state.status === 'submitted') void finish(loaded.state, loaded.set);
  }, [loaded, finish]);

  const question: Question | null = useMemo(() => {
    if (!loaded) return null;
    const id = currentQuestionId(loaded.state);
    return loaded.set.questions.find((q) => q.id === id) ?? null;
  }, [loaded]);

  const optionOrder = useMemo(
    () => (loaded && question ? orderedOptionIds(question, loaded.state.config) : []),
    [loaded, question],
  );

  return {
    loading,
    state: loaded?.state ?? null,
    set: loaded?.set ?? null,
    question,
    optionOrder,
    remaining,
    answer: (response: string[]) => {
      if (question) dispatch({ type: 'ANSWER', questionId: question.id, response });
    },
    reveal: () => {
      if (question) dispatch({ type: 'REVEAL', questionId: question.id });
    },
    next: () => dispatch({ type: 'NEXT', nowMs: Date.now() }),
    prev: () => dispatch({ type: 'PREV', nowMs: Date.now() }),
    goto: (index: number) => dispatch({ type: 'GOTO', index, nowMs: Date.now() }),
    submit: () => dispatch({ type: 'SUBMIT', nowMs: Date.now() }),
  };
}
```

- [ ] **Step 8: Run the hook test to verify it passes**

Run: `npx jest src/ui/useSessionRunner.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 9: Wire the route**

Create `app/session/[attemptId].tsx`:

```tsx
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { Screen } from '@/ui/Screen';
import { RunnerView } from '@/ui/RunnerView';
import { useSessionRunner } from '@/ui/useSessionRunner';

export default function SessionScreen() {
  const router = useRouter();
  const runner = useSessionRunner();

  // When the session submits, the attempt has been written - go read it.
  useEffect(() => {
    if (runner.state?.status === 'submitted') {
      router.replace(`/results/${encodeURIComponent(runner.state.attemptId)}`);
    }
  }, [runner.state?.status, runner.state?.attemptId, router]);

  if (runner.loading || !runner.state || !runner.question) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }

  return (
    <RunnerView
      state={runner.state}
      question={runner.question}
      optionOrder={runner.optionOrder}
      remaining={runner.remaining}
      onAnswer={runner.answer}
      onReveal={runner.reveal}
      onNext={runner.next}
      onPrev={runner.prev}
      onSubmit={runner.submit}
    />
  );
}
```

- [ ] **Step 10: Verify practice mode end to end**

Run: `npx expo start --web`
Expected: opening a sample set, tapping "Start practice", answering, and pressing "Submit answer" shows the explanations without advancing; "Next" moves on. The results route is still empty (Task 17). Stop the server.

- [ ] **Step 11: Commit**

```bash
git add src/ui/useSessionRunner.ts src/ui/useSessionRunner.test.tsx src/ui/RunnerView.tsx src/ui/RunnerView.test.tsx app/session
git commit -m "Add session runner and practice mode"
```

---

### Task 16: Mock mode chrome — grid navigation and submit confirmation

**Files:**
- Create: `src/ui/QuestionGrid.tsx`
- Modify: `src/ui/RunnerView.tsx`, `app/session/[attemptId].tsx`
- Test: `src/ui/QuestionGrid.test.tsx`, `src/ui/RunnerView.test.tsx` (append a mock-mode describe block)

**Interfaces:**
- Consumes: `SessionState` from `@/core/types`.
- Produces: `QuestionGrid` (props `state: SessionState`, `onGoto(index: number): void`); `RunnerView` gains `onGoto(index: number): void` and `unansweredCount` is derived internally.

Spec §6.3. Mock mode navigates freely, shows a grid of answered/unanswered, and confirms submission naming the number of unanswered questions.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/QuestionGrid.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SessionState } from '@/core/types';
import { QuestionGrid } from './QuestionGrid';

const state = {
  questionIds: ['q-1', 'q-2', 'q-3'],
  index: 1,
  answers: { 'q-1': ['a'], 'q-3': [] },
} as unknown as SessionState;

describe('QuestionGrid', () => {
  it('renders one cell per question', () => {
    render(<QuestionGrid state={state} onGoto={() => {}} />);
    expect(screen.getAllByTestId(/^grid-cell-/)).toHaveLength(3);
  });

  it('marks answered, unanswered and current cells', () => {
    render(<QuestionGrid state={state} onGoto={() => {}} />);
    expect(screen.getByTestId('grid-cell-0').props.accessibilityLabel).toBe('Question 1, answered');
    expect(screen.getByTestId('grid-cell-1').props.accessibilityLabel).toBe(
      'Question 2, unanswered, current',
    );
    expect(screen.getByTestId('grid-cell-2').props.accessibilityLabel).toBe(
      'Question 3, unanswered',
    );
  });

  it('jumps to a question when a cell is tapped', () => {
    const onGoto = jest.fn();
    render(<QuestionGrid state={state} onGoto={onGoto} />);
    fireEvent.press(screen.getByTestId('grid-cell-2'));
    expect(onGoto).toHaveBeenCalledWith(2);
  });
});
```

First add `onGoto: jest.fn(),` to the `props` helper already defined in that file - the mock-mode
branch calls it, and the Task 15 helper predates the prop. Then append (reusing the `question`,
`baseState` and `props` helpers there):

```tsx
describe('RunnerView in mock mode', () => {
  const mockState = { ...baseState, mode: 'mock' as const, deadlineAt: '2026-09-06T14:30:00.000Z' };

  it('shows the timer and the question grid', () => {
    render(<RunnerView {...props({ state: mockState, remaining: 125000 })} />);
    expect(screen.getByText('02:05')).toBeTruthy();
    expect(screen.getAllByTestId(/^grid-cell-/)).toHaveLength(3);
  });

  it('shows no feedback even when a question is answered', () => {
    render(
      <RunnerView {...props({ state: { ...mockState, answers: { 'q-1': ['b'] } }, remaining: 60000 })} />,
    );
    expect(screen.queryByTestId('feedback')).toBeNull();
  });

  it('allows navigating back and forward', () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    render(<RunnerView {...props({ state: { ...mockState, index: 1 }, remaining: 60000, onPrev, onNext })} />);
    fireEvent.press(screen.getByTestId('prev'));
    fireEvent.press(screen.getByTestId('next'));
    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
  });

  it('offers submit from any question, not only the last', () => {
    const onSubmit = jest.fn();
    render(<RunnerView {...props({ state: mockState, remaining: 60000, onSubmit })} />);
    fireEvent.press(screen.getByTestId('submit-test'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('names the number of unanswered questions on the submit control', () => {
    render(
      <RunnerView {...props({ state: { ...mockState, answers: { 'q-1': ['a'] } }, remaining: 60000 })} />,
    );
    expect(screen.getByText('Submit test (2 unanswered)')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/QuestionGrid.test.tsx src/ui/RunnerView.test.tsx`
Expected: FAIL - `QuestionGrid` missing; the mock-mode expectations fail against the Task 15 view.

- [ ] **Step 3: Write the grid**

Create `src/ui/QuestionGrid.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native';
import type { SessionState } from '@/core/types';
import { radius, spacing, type, useTheme } from './theme';

export function QuestionGrid({
  state,
  onGoto,
}: {
  state: SessionState;
  onGoto: (index: number) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {state.questionIds.map((questionId, index) => {
        const answered = (state.answers[questionId] ?? []).length > 0;
        const current = index === state.index;
        const label = [
          `Question ${index + 1}`,
          answered ? 'answered' : 'unanswered',
          current ? 'current' : null,
        ]
          .filter(Boolean)
          .join(', ');

        return (
          <Pressable
            key={questionId}
            testID={`grid-cell-${index}`}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onGoto(index)}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              borderWidth: current ? 2 : 1,
              borderColor: current ? theme.accent : theme.border,
              backgroundColor: answered ? theme.surfaceAlt : theme.surface,
            }}
          >
            <Text style={[type.caption, { color: theme.text }]}>{index + 1}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 4: Extend RunnerView**

In `src/ui/RunnerView.tsx`: add `onGoto: (index: number) => void` to the props type and destructuring, import `QuestionGrid`, and replace the mock-mode branch of the footer with:

```tsx
      ) : (
        <View style={{ gap: spacing.md }}>
          <QuestionGrid state={state} onGoto={onGoto} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Back"
                variant="secondary"
                onPress={onPrev}
                disabled={state.index === 0}
                testID="prev"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Next"
                variant="secondary"
                onPress={onNext}
                disabled={isLast}
                testID="next"
              />
            </View>
          </View>
          <Button
            title={
              unanswered > 0 ? `Submit test (${unanswered} unanswered)` : 'Submit test'
            }
            onPress={onSubmit}
            testID="submit-test"
          />
        </View>
      )}
```

Add the derivation above the `return`:

```tsx
  const unanswered = state.questionIds.filter(
    (id) => (state.answers[id] ?? []).length === 0,
  ).length;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/ui/QuestionGrid.test.tsx src/ui/RunnerView.test.tsx`
Expected: PASS, 3 + 11 tests.

- [ ] **Step 6: Add the submit confirmation to the route**

In `app/session/[attemptId].tsx`, import `Alert` from `react-native`, pass `onGoto={runner.goto}`, and replace `onSubmit={runner.submit}` with a confirming handler:

```tsx
  const confirmSubmit = () => {
    if (!runner.state) return;
    if (runner.state.mode === 'practice') {
      runner.submit();
      return;
    }
    const unanswered = runner.state.questionIds.filter(
      (id) => (runner.state!.answers[id] ?? []).length === 0,
    ).length;
    Alert.alert(
      'Submit the test?',
      unanswered > 0
        ? `${unanswered} question(s) are unanswered and will be marked incorrect.`
        : 'You have answered every question.',
      [
        { text: 'Keep working', style: 'cancel' },
        { text: 'Submit', style: 'destructive', onPress: runner.submit },
      ],
    );
  };
```

- [ ] **Step 7: Verify the timer on device**

Run: `npx expo start --web`
Expected: start a mock test with a 1-minute limit; the header counts down, turns red in the final minute, and the run auto-submits at zero. Reload the page mid-run and confirm the countdown resumes from the wall clock rather than restarting. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/ui/QuestionGrid.tsx src/ui/QuestionGrid.test.tsx src/ui/RunnerView.tsx src/ui/RunnerView.test.tsx app/session
git commit -m "Add mock mode grid navigation and submit confirmation"
```

---

### Task 17: Results and review

**Files:**
- Create: `src/ui/ResultsView.tsx`, `app/results/[attemptId].tsx`
- Test: `src/ui/ResultsView.test.tsx`

**Interfaces:**
- Consumes: `Attempt` from `@/core/types`; `QuestionSet` from `@/core/schema`; `Feedback` from Task 14; `UNCATEGORIZED` from `@/core/scoring`.
- Produces: `ResultsView` (props `attempt: Attempt`, `set: QuestionSet`, `onDone(): void`)

Spec §6.5. Weakest topic first, because that is the actionable row. The review reuses `Feedback` so a past attempt reads exactly like practice-mode feedback did.

- [ ] **Step 1: Write the failing test**

Create `src/ui/ResultsView.test.tsx`:

```tsx
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { QuestionSet } from '@/core/schema';
import type { Attempt } from '@/core/types';
import { ResultsView } from './ResultsView';

const set: QuestionSet = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Cloud Basics',
  version: '1.0.0',
  topics: [
    { id: 'storage', name: 'Storage' },
    { id: 'network', name: 'Networking' },
  ],
  questions: [
    {
      id: 'q-1',
      type: 'single',
      topicId: 'storage',
      prompt: 'Which storage?',
      options: [
        { id: 'a', text: 'Object', correct: true, explanation: 'Correct.' },
        { id: 'b', text: 'Block', correct: false, explanation: 'Wrong.' },
      ],
    },
    {
      id: 'q-2',
      type: 'boolean',
      topicId: 'network',
      prompt: 'Public IP required?',
      answer: false,
      explanation: 'No, private addresses work.',
    },
  ],
};

const attempt: Attempt = {
  id: 'att_1',
  setId: 'set-1',
  setVersion: '1.0.0',
  mode: 'mock',
  startedAt: '2026-09-06T14:00:00.000Z',
  finishedAt: '2026-09-06T14:20:00.000Z',
  config: {
    questionCount: 2,
    timeLimitMinutes: 30,
    passingScore: 70,
    shuffleQuestions: true,
    shuffleOptions: true,
    seed: 1,
  },
  score: { correct: 1, total: 2, percent: 50, passed: false },
  byTopic: [
    { topicId: 'storage', correct: 1, total: 1 },
    { topicId: 'network', correct: 0, total: 1 },
  ],
  answers: [
    { questionId: 'q-1', response: ['a'], correct: true, timeMs: 12000 },
    { questionId: 'q-2', response: ['true'], correct: false, timeMs: 8000 },
  ],
};

describe('ResultsView', () => {
  it('shows the score and the pass verdict', () => {
    render(<ResultsView attempt={attempt} set={set} onDone={() => {}} />);
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText(/Did not pass/)).toBeTruthy();
    expect(screen.getByText('1 of 2 correct')).toBeTruthy();
  });

  it('shows a pass verdict when the score clears the bar', () => {
    const passed = {
      ...attempt,
      score: { correct: 2, total: 2, percent: 100, passed: true },
    };
    render(<ResultsView attempt={passed} set={set} onDone={() => {}} />);
    expect(screen.getByText(/Passed/)).toBeTruthy();
  });

  it('shows elapsed time', () => {
    render(<ResultsView attempt={attempt} set={set} onDone={() => {}} />);
    expect(screen.getByText('20m 0s')).toBeTruthy();
  });

  it('lists topics weakest first, using their display names', () => {
    render(<ResultsView attempt={attempt} set={set} onDone={() => {}} />);
    const rows = screen.getAllByTestId(/^topic-row-/).map((node) => node.props.testID);
    expect(rows).toEqual(['topic-row-network', 'topic-row-storage']);
    expect(screen.getByText('Networking')).toBeTruthy();
  });

  it('reviews every question in the attempt', () => {
    render(<ResultsView attempt={attempt} set={set} onDone={() => {}} />);
    expect(screen.getAllByTestId('feedback')).toHaveLength(2);
    expect(screen.getByText('Which storage?')).toBeTruthy();
  });

  it('hides the pass verdict for a practice run', () => {
    render(<ResultsView attempt={{ ...attempt, mode: 'practice' }} set={set} onDone={() => {}} />);
    expect(screen.queryByText(/Did not pass/)).toBeNull();
  });

  it('warns when the set has changed since the attempt', () => {
    render(
      <ResultsView attempt={{ ...attempt, setVersion: '0.9.0' }} set={set} onDone={() => {}} />,
    );
    expect(screen.getByTestId('version-warning')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/ui/ResultsView.test.tsx`
Expected: FAIL - "Cannot find module './ResultsView'".

- [ ] **Step 3: Write the view**

Create `src/ui/ResultsView.tsx`:

```tsx
import { Text, View } from 'react-native';
import type { QuestionSet } from '@/core/schema';
import { UNCATEGORIZED } from '@/core/scoring';
import type { Attempt } from '@/core/types';
import { Button } from './Button';
import { Card } from './Card';
import { Feedback } from './Feedback';
import { formatDuration, formatPercent } from './format';
import { ProgressBar } from './ProgressBar';
import { QuestionCard } from './QuestionCard';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function ResultsView({
  attempt,
  set,
  onDone,
}: {
  attempt: Attempt;
  set: QuestionSet;
  onDone: () => void;
}) {
  const theme = useTheme();
  const elapsed = Date.parse(attempt.finishedAt) - Date.parse(attempt.startedAt);
  const topicName = (topicId: string) =>
    topicId === UNCATEGORIZED
      ? 'Uncategorized'
      : (set.topics?.find((t) => t.id === topicId)?.name ?? topicId);

  // Weakest first - that is the row worth acting on.
  const topics = [...attempt.byTopic].sort(
    (a, b) => a.correct / a.total - b.correct / b.total,
  );

  const byId = new Map(set.questions.map((q) => [q.id, q]));
  const stale = attempt.setVersion !== null && attempt.setVersion !== (set.version ?? null);

  return (
    <Screen>
      <Card>
        <Text style={[type.title, { color: theme.text }]}>{formatPercent(attempt.score.percent)}</Text>
        <Text style={[type.body, { color: theme.textMuted }]}>
          {`${attempt.score.correct} of ${attempt.score.total} correct`}
        </Text>
        {attempt.mode === 'mock' ? (
          <Text
            style={[
              type.label,
              { color: attempt.score.passed ? theme.positive : theme.negative },
            ]}
          >
            {attempt.score.passed
              ? `Passed (needed ${formatPercent(attempt.config.passingScore)})`
              : `Did not pass (needed ${formatPercent(attempt.config.passingScore)})`}
          </Text>
        ) : null}
        <Text style={[type.caption, { color: theme.textMuted }]}>{formatDuration(elapsed)}</Text>
      </Card>

      {stale ? (
        <Card testID="version-warning">
          <Text style={[type.caption, { color: theme.textMuted }]}>
            This set has been updated since this attempt, so the questions below may differ from
            the ones you answered.
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={[type.heading, { color: theme.text }]}>By topic</Text>
        {topics.map((topic) => (
          <View key={topic.topicId} testID={`topic-row-${topic.topicId}`} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row' }}>
              <Text style={[type.body, { color: theme.text, flex: 1 }]}>
                {topicName(topic.topicId)}
              </Text>
              <Text style={[type.caption, { color: theme.textMuted }]}>
                {`${topic.correct}/${topic.total}`}
              </Text>
            </View>
            <ProgressBar
              fraction={topic.correct / topic.total}
              tone={topic.correct === topic.total ? 'positive' : 'negative'}
            />
          </View>
        ))}
      </Card>

      <Text style={[type.heading, { color: theme.text }]}>Review</Text>
      {attempt.answers.map((answer) => {
        const question = byId.get(answer.questionId);
        if (!question) return null;
        return (
          <View key={answer.questionId} style={{ gap: spacing.sm }}>
            <QuestionCard
              question={question}
              response={answer.response}
              revealed
              optionOrder={[]}
              onChange={() => {}}
            />
            <Feedback question={question} response={answer.response} />
          </View>
        );
      })}

      <Button title="Done" onPress={onDone} testID="results-done" />
    </Screen>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/ui/ResultsView.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Wire the route**

Create `app/results/[attemptId].tsx`:

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import type { QuestionSet } from '@/core/schema';
import type { Attempt } from '@/core/types';
import { useRepository } from '@/data/RepositoryProvider';
import { ResultsView } from '@/ui/ResultsView';
import { Screen } from '@/ui/Screen';

export default function ResultsScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const repository = useRepository();
  const router = useRouter();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [set, setSet] = useState<QuestionSet | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loadedAttempt = await repository.getAttempt(attemptId);
      const loadedSet = loadedAttempt ? await repository.getSet(loadedAttempt.setId) : null;
      if (cancelled) return;
      setAttempt(loadedAttempt);
      setSet(loadedSet);
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, attemptId]);

  if (!attempt || !set) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }

  return <ResultsView attempt={attempt} set={set} onDone={() => router.dismissAll()} />;
}
```

If `router.dismissAll` is unavailable in the SDK the project pinned, use `router.replace('/')` instead - the goal is that "Done" returns to the library rather than back into the finished session.

- [ ] **Step 6: Commit**

```bash
git add src/ui/ResultsView.tsx src/ui/ResultsView.test.tsx app/results
git commit -m "Add results screen with topic breakdown and full review"
```

---

### Task 18: History tab

**Files:**
- Create: `src/ui/HistoryView.tsx`
- Modify: `app/(tabs)/history.tsx`
- Test: `src/ui/HistoryView.test.tsx`

**Interfaces:**
- Consumes: `Attempt` from `@/core/types`; `SetSummary` from `@/data/repository`.
- Produces: `HistoryView` (props `attempts: Attempt[]`, `setTitles: Record<string, string>`, `loading: boolean`, `onOpenAttempt(attemptId: string): void`)

Spec §6.7. Newest first across every set; each row opens its results screen.

- [ ] **Step 1: Write the failing test**

Create `src/ui/HistoryView.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Attempt } from '@/core/types';
import { HistoryView } from './HistoryView';

const attempt = (over: Partial<Attempt> = {}): Attempt => ({
  id: 'att_1',
  setId: 'set-1',
  setVersion: null,
  mode: 'mock',
  startedAt: '2026-09-06T14:00:00.000Z',
  finishedAt: '2026-09-06T14:20:00.000Z',
  config: {
    questionCount: 2,
    timeLimitMinutes: null,
    passingScore: 70,
    shuffleQuestions: true,
    shuffleOptions: true,
    seed: 1,
  },
  score: { correct: 1, total: 2, percent: 50, passed: false },
  byTopic: [],
  answers: [],
  ...over,
});

const titles = { 'set-1': 'Cloud Basics' };

describe('HistoryView', () => {
  it('shows each attempt with its set title, mode and score', () => {
    render(
      <HistoryView attempts={[attempt()]} setTitles={titles} loading={false} onOpenAttempt={() => {}} />,
    );
    expect(screen.getByText('Cloud Basics')).toBeTruthy();
    expect(screen.getByText(/Mock test/)).toBeTruthy();
    expect(screen.getByText(/50%/)).toBeTruthy();
  });

  it('falls back to the set id when the set has been deleted', () => {
    render(
      <HistoryView attempts={[attempt({ setId: 'gone' })]} setTitles={titles} loading={false} onOpenAttempt={() => {}} />,
    );
    expect(screen.getByText('gone')).toBeTruthy();
  });

  it('opens an attempt when its row is tapped', () => {
    const onOpenAttempt = jest.fn();
    render(
      <HistoryView attempts={[attempt()]} setTitles={titles} loading={false} onOpenAttempt={onOpenAttempt} />,
    );
    fireEvent.press(screen.getByTestId('history-att_1'));
    expect(onOpenAttempt).toHaveBeenCalledWith('att_1');
  });

  it('shows an empty state when nothing has been attempted', () => {
    render(<HistoryView attempts={[]} setTitles={{}} loading={false} onOpenAttempt={() => {}} />);
    expect(screen.getByText(/No attempts yet/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/ui/HistoryView.test.tsx`
Expected: FAIL - "Cannot find module './HistoryView'".

- [ ] **Step 3: Write the view**

Create `src/ui/HistoryView.tsx`:

```tsx
import { ActivityIndicator, Text, View } from 'react-native';
import type { Attempt } from '@/core/types';
import { Card } from './Card';
import { formatDate, formatPercent } from './format';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function HistoryView({
  attempts,
  setTitles,
  loading,
  onOpenAttempt,
}: {
  attempts: Attempt[];
  setTitles: Record<string, string>;
  loading: boolean;
  onOpenAttempt: (attemptId: string) => void;
}) {
  const theme = useTheme();

  return (
    <Screen>
      <Text style={[type.title, { color: theme.text }]}>History</Text>

      {loading ? (
        <ActivityIndicator testID="history-loading" />
      ) : attempts.length === 0 ? (
        <Card>
          <Text style={[type.body, { color: theme.text }]}>No attempts yet.</Text>
          <Text style={[type.caption, { color: theme.textMuted }]}>
            Finish a mock test or a practice run and it will show up here.
          </Text>
        </Card>
      ) : (
        attempts.map((item) => (
          <Card key={item.id} testID={`history-${item.id}`} onPress={() => onOpenAttempt(item.id)}>
            <Text style={[type.heading, { color: theme.text }]}>
              {setTitles[item.setId] ?? item.setId}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Text style={[type.caption, { color: theme.textMuted, flex: 1 }]}>
                {`${item.mode === 'mock' ? 'Mock test' : 'Practice'} · ${formatDate(item.finishedAt)}`}
              </Text>
              <Text
                style={[
                  type.label,
                  { color: item.mode === 'mock' && !item.score.passed ? theme.negative : theme.text },
                ]}
              >
                {formatPercent(item.score.percent)}
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/ui/HistoryView.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Replace the placeholder route**

Rewrite `app/(tabs)/history.tsx`:

```tsx
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import type { Attempt } from '@/core/types';
import { useRepository, useRepositoryReady } from '@/data/RepositoryProvider';
import { HistoryView } from '@/ui/HistoryView';

export default function HistoryScreen() {
  const repository = useRepository();
  const ready = useRepositoryReady();
  const router = useRouter();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [setTitles, setSetTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!ready) return;
      setLoading(true);
      Promise.all([repository.listAttempts(), repository.listSets()])
        .then(([loadedAttempts, sets]) => {
          if (cancelled) return;
          setAttempts(loadedAttempts);
          setSetTitles(Object.fromEntries(sets.map((s) => [s.id, s.title])));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [repository, ready]),
  );

  return (
    <HistoryView
      attempts={attempts}
      setTitles={setTitles}
      loading={loading || !ready}
      onOpenAttempt={(attemptId) => router.push(`/results/${encodeURIComponent(attemptId)}`)}
    />
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/HistoryView.tsx src/ui/HistoryView.test.tsx "app/(tabs)/history.tsx"
git commit -m "Add history tab listing every attempt"
```

---

### Task 19: Import a set from a file

**Files:**
- Create: `src/ui/ImportView.tsx`, `app/import.tsx`
- Test: `src/ui/ImportView.test.tsx`
- Modify: `package.json` (adds `expo-file-system`)

**Interfaces:**
- Consumes: `parseSetFile`, `ValidationError` from `@/core/validate`; `useRepository` from `@/data/RepositoryProvider`.
- Produces: `ImportView` (props `busy: boolean`, `errors: ValidationError[] | null`, `importedTitle: string | null`, `onPick(): void`, `onDone(): void`)

Spec §6.6. Strict and all-or-nothing: on any failure nothing is written and the report lists every problem with its location.

- [ ] **Step 1: Install the file reader**

```bash
npx expo install expo-file-system
```

`expo-document-picker` returns a URI, not the file's contents. On web that URI is a `blob:` URL readable with `fetch`; on native it is a `file://` URI that `expo-file-system` reads.

- [ ] **Step 2: Write the failing test**

Create `src/ui/ImportView.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ImportView } from './ImportView';

describe('ImportView', () => {
  it('offers a file picker', () => {
    const onPick = jest.fn();
    render(<ImportView busy={false} errors={null} importedTitle={null} onPick={onPick} onDone={() => {}} />);
    fireEvent.press(screen.getByTestId('pick-file'));
    expect(onPick).toHaveBeenCalled();
  });

  it('disables the picker while a file is being read', () => {
    render(<ImportView busy errors={null} importedTitle={null} onPick={() => {}} onDone={() => {}} />);
    expect(screen.getByTestId('pick-file').props.accessibilityState.disabled).toBe(true);
  });

  it('lists every problem with its location and a count', () => {
    render(
      <ImportView
        busy={false}
        errors={[
          { location: 'Question 12 ("q-012")', message: 'no option is marked "correct"' },
          { location: 'Question 31 ("q-031")', message: 'topicId "vpc " is not declared in topics' },
        ]}
        importedTitle={null}
        onPick={() => {}}
        onDone={() => {}}
      />,
    );
    expect(screen.getByText('2 problems found')).toBeTruthy();
    expect(screen.getByText('Question 12 ("q-012")')).toBeTruthy();
    expect(screen.getByText('no option is marked "correct"')).toBeTruthy();
  });

  it('says nothing was imported when validation failed', () => {
    render(
      <ImportView
        busy={false}
        errors={[{ location: 'File', message: 'the file is not valid JSON' }]}
        importedTitle={null}
        onPick={() => {}}
        onDone={() => {}}
      />,
    );
    expect(screen.getByText(/Nothing was imported/)).toBeTruthy();
  });

  it('confirms a successful import by name', () => {
    const onDone = jest.fn();
    render(
      <ImportView busy={false} errors={null} importedTitle="Cloud Basics" onPick={() => {}} onDone={onDone} />,
    );
    expect(screen.getByText(/Imported "Cloud Basics"/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('import-done'));
    expect(onDone).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest src/ui/ImportView.test.tsx`
Expected: FAIL - "Cannot find module './ImportView'".

- [ ] **Step 4: Write the view**

Create `src/ui/ImportView.tsx`:

```tsx
import { Text, View } from 'react-native';
import type { ValidationError } from '@/core/validate';
import { Button } from './Button';
import { Card } from './Card';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function ImportView({
  busy,
  errors,
  importedTitle,
  onPick,
  onDone,
}: {
  busy: boolean;
  errors: ValidationError[] | null;
  importedTitle: string | null;
  onPick: () => void;
  onDone: () => void;
}) {
  const theme = useTheme();

  return (
    <Screen>
      <Text style={[type.title, { color: theme.text }]}>Import a question set</Text>
      <Text style={[type.caption, { color: theme.textMuted }]}>
        Choose a .json file that follows the question set format. The whole file is checked
        before anything is saved.
      </Text>

      <Button
        title={busy ? 'Reading…' : 'Choose a file'}
        onPress={onPick}
        disabled={busy}
        testID="pick-file"
      />

      {errors && errors.length > 0 ? (
        <Card testID="import-errors">
          <Text style={[type.heading, { color: theme.negative }]}>
            {`${errors.length} problem${errors.length === 1 ? '' : 's'} found`}
          </Text>
          <Text style={[type.caption, { color: theme.textMuted }]}>
            Nothing was imported. Fix the file and try again.
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {errors.map((error, index) => (
              <View key={`${error.location}-${index}`}>
                <Text style={[type.label, { color: theme.text }]}>{error.location}</Text>
                <Text style={[type.caption, { color: theme.textMuted }]}>{error.message}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {importedTitle ? (
        <Card testID="import-success">
          <Text style={[type.body, { color: theme.positive }]}>{`Imported "${importedTitle}".`}</Text>
          <Button title="Done" onPress={onDone} testID="import-done" />
        </Card>
      ) : null}
    </Screen>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/ui/ImportView.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Wire the route**

Create `app/import.tsx`:

```tsx
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { parseSetFile, type ValidationError } from '@/core/validate';
import { useRepository } from '@/data/RepositoryProvider';
import { ImportView } from '@/ui/ImportView';

async function readFile(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return response.text();
  }
  return FileSystem.readAsStringAsync(uri);
}

export default function ImportScreen() {
  const repository = useRepository();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [importedTitle, setImportedTitle] = useState<string | null>(null);

  const pick = async () => {
    setBusy(true);
    setErrors(null);
    setImportedTitle(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;

      const text = await readFile(picked.assets[0].uri);
      const result = parseSetFile(text);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }

      const existing = await repository.getSet(result.set.id);
      if (!existing) {
        await repository.saveSet(result.set, 'imported');
        setImportedTitle(result.set.title);
        return;
      }

      Alert.alert(
        'You already have this set',
        `"${existing.title}" is already in your library.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            onPress: async () => {
              await repository.saveSet(result.set, 'imported', 'replace');
              setImportedTitle(result.set.title);
            },
          },
          {
            text: 'Import as copy',
            onPress: async () => {
              await repository.saveSet(result.set, 'imported', 'copy');
              setImportedTitle(result.set.title);
            },
          },
        ],
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setErrors([{ location: 'File', message: `could not read the file (${detail})` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ImportView
      busy={busy}
      errors={errors}
      importedTitle={importedTitle}
      onPick={pick}
      onDone={() => router.back()}
    />
  );
}
```

- [ ] **Step 7: Verify with a real file**

Run: `npx expo start --web`, then import `assets/sets/sample-all-types.json`.
Expected: the replace-or-copy prompt appears (that set is already bundled). Then hand-edit a copy of the file to remove a `correct: true` flag and import it: the error report names the question and nothing is added to the library. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/ui/ImportView.tsx src/ui/ImportView.test.tsx app/import.tsx package.json
git commit -m "Add JSON set import with strict validation reporting"
```

---

### Task 20: Resume an interrupted session

**Files:**
- Modify: `src/ui/LibraryView.tsx`, `src/ui/LibraryView.test.tsx`, `app/(tabs)/index.tsx`, `app/set/[setId].tsx`
- Test: `src/ui/LibraryView.test.tsx` (append a describe block)

**Interfaces:**
- Consumes: `getInProgress`, `saveInProgress` from the repository.
- Produces: `LibraryView` gains `inProgress: { attemptId: string; setTitle: string; mode: RunMode } | null`, `onResume(): void`, `onDiscard(): void`.

Spec §7. Losing a 90-minute run is the worst thing this app could do to someone, so the resume path gets its own task and its own tests.

- [ ] **Step 1: Write the failing tests**

Append to `src/ui/LibraryView.test.tsx`:

```tsx
describe('LibraryView resume banner', () => {
  const inProgress = { attemptId: 'att_1', setTitle: 'Cloud Basics', mode: 'mock' as const };

  const base = {
    sets: [summary()],
    loading: false,
    onOpenSet: () => {},
    onImport: () => {},
  };

  it('shows nothing when there is no in-progress session', () => {
    render(<LibraryView {...base} inProgress={null} onResume={() => {}} onDiscard={() => {}} />);
    expect(screen.queryByTestId('resume-banner')).toBeNull();
  });

  it('offers to resume an interrupted attempt by set name', () => {
    const onResume = jest.fn();
    render(
      <LibraryView {...base} inProgress={inProgress} onResume={onResume} onDiscard={() => {}} />,
    );
    expect(screen.getByText(/Cloud Basics/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('resume-session'));
    expect(onResume).toHaveBeenCalled();
  });

  it('offers to discard it', () => {
    const onDiscard = jest.fn();
    render(
      <LibraryView {...base} inProgress={inProgress} onResume={() => {}} onDiscard={onDiscard} />,
    );
    fireEvent.press(screen.getByTestId('discard-session'));
    expect(onDiscard).toHaveBeenCalled();
  });
});
```

The existing `LibraryView` tests must keep passing, so the three new props are optional with `inProgress` defaulting to `null`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/LibraryView.test.tsx`
Expected: FAIL - no `resume-banner`.

- [ ] **Step 3: Extend the view**

In `src/ui/LibraryView.tsx`, add to the props type:

```tsx
  inProgress?: { attemptId: string; setTitle: string; mode: RunMode } | null;
  onResume?: () => void;
  onDiscard?: () => void;
```

Destructure with `inProgress = null, onResume = () => {}, onDiscard = () => {}`, import `RunMode` from `@/core/types`, and render directly under the header:

```tsx
      {inProgress ? (
        <Card testID="resume-banner">
          <Text style={[type.heading, { color: theme.text }]}>Unfinished attempt</Text>
          <Text style={[type.caption, { color: theme.textMuted }]}>
            {`You have a ${inProgress.mode === 'mock' ? 'mock test' : 'practice run'} in progress on "${inProgress.setTitle}".`}
          </Text>
          <Button title="Resume" onPress={onResume} testID="resume-session" />
          <Button
            title="Discard it"
            variant="secondary"
            onPress={onDiscard}
            testID="discard-session"
          />
        </Card>
      ) : null}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/ui/LibraryView.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Wire the library route**

In `app/(tabs)/index.tsx`, load the in-progress session alongside the sets:

```tsx
  const [inProgress, setInProgress] = useState<{
    attemptId: string;
    setTitle: string;
    mode: RunMode;
  } | null>(null);
```

Inside the focus effect, after `listSets()` resolves:

```tsx
      repository.getInProgress().then(async (session) => {
        if (cancelled || !session) {
          if (!cancelled) setInProgress(null);
          return;
        }
        const set = await repository.getSet(session.setId);
        if (cancelled) return;
        setInProgress({
          attemptId: session.attemptId,
          setTitle: set?.title ?? session.setId,
          mode: session.mode,
        });
      });
```

And pass the handlers:

```tsx
      inProgress={inProgress}
      onResume={() => router.push(`/session/${encodeURIComponent(inProgress!.attemptId)}`)}
      onDiscard={() => {
        Alert.alert('Discard this attempt?', 'Your progress will be lost.', [
          { text: 'Keep it', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await repository.saveInProgress(null);
              setInProgress(null);
            },
          },
        ]);
      }}
```

- [ ] **Step 6: Guard starting a second session**

In `app/set/[setId].tsx`, wrap the body of `start` so an existing in-progress session is confirmed away first:

```tsx
  const start = async (mode: RunMode, overrides: RunOverrides) => {
    const existing = await repository.getInProgress();
    if (existing) {
      Alert.alert(
        'Discard your unfinished attempt?',
        'You can only have one attempt in progress at a time.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard and start', style: 'destructive', onPress: () => void begin(mode, overrides) },
        ],
      );
      return;
    }
    await begin(mode, overrides);
  };

  const begin = async (mode: RunMode, overrides: RunOverrides) => {
    const config = resolveRunConfig(set!, mode, overrides, randomSeed());
    const session = startSession(set!, mode, config, Date.now());
    await repository.saveInProgress(session);
    router.push(`/session/${encodeURIComponent(session.attemptId)}`);
  };
```

- [ ] **Step 7: Verify resume by hand**

Run: `npx expo start --web`. Start a mock test with a 10-minute limit, answer one question, then reload the browser.
Expected: the Library shows the resume banner; resuming restores the same question order, the recorded answer, and a countdown reduced by the wall-clock time that passed. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/ui/LibraryView.tsx src/ui/LibraryView.test.tsx "app/(tabs)/index.tsx" app/set
git commit -m "Add resume for an interrupted session"
```

---

### Task 21: Ordering questions

**Files:**
- Create: `src/ui/OrderingInput.tsx`
- Modify: `src/ui/QuestionCard.tsx`, `src/ui/QuestionCard.test.tsx`
- Test: `src/ui/OrderingInput.test.tsx`

**Interfaces:**
- Consumes: `OrderingQuestion` from `@/core/schema`; `orderedItemIds` from `@/core/session`.
- Produces: `OrderingInput` (props `question: OrderingQuestion`, `response: string[]`, `revealed: boolean`, `initialOrder: string[]`, `onChange(order: string[]): void`); `QuestionCard` gains an `itemOrder: string[]` prop.

Spec §3.3 and the phasing note in §2. **Interaction decision:** reordering uses explicit "move up / move down" controls rather than drag-and-drop. It is keyboard- and screen-reader-accessible, behaves identically on web and touch, needs no gesture library, and is testable without simulating drags. Drag can replace it later behind the same props.

- [ ] **Step 1: Write the failing test**

Create `src/ui/OrderingInput.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { OrderingQuestion } from '@/core/schema';
import { OrderingInput } from './OrderingInput';

const question: OrderingQuestion = {
  id: 'q-ord',
  type: 'ordering',
  prompt: 'Order these',
  items: [
    { id: 'i1', text: 'Plan' },
    { id: 'i2', text: 'Build' },
    { id: 'i3', text: 'Ship' },
  ],
  correctOrder: ['i1', 'i2', 'i3'],
};

describe('OrderingInput', () => {
  it('starts from the presented order when there is no response yet', () => {
    render(
      <OrderingInput
        question={question}
        response={[]}
        revealed={false}
        initialOrder={['i3', 'i1', 'i2']}
        onChange={() => {}}
      />,
    );
    const rows = screen.getAllByTestId(/^order-row-/).map((n) => n.props.testID);
    expect(rows).toEqual(['order-row-i3', 'order-row-i1', 'order-row-i2']);
  });

  it('renders the response order once the user has moved something', () => {
    render(
      <OrderingInput
        question={question}
        response={['i2', 'i1', 'i3']}
        revealed={false}
        initialOrder={['i3', 'i1', 'i2']}
        onChange={() => {}}
      />,
    );
    const rows = screen.getAllByTestId(/^order-row-/).map((n) => n.props.testID);
    expect(rows).toEqual(['order-row-i2', 'order-row-i1', 'order-row-i3']);
  });

  it('moves an item down', () => {
    const onChange = jest.fn();
    render(
      <OrderingInput
        question={question}
        response={['i1', 'i2', 'i3']}
        revealed={false}
        initialOrder={['i1', 'i2', 'i3']}
        onChange={onChange}
      />,
    );
    fireEvent.press(screen.getByTestId('move-down-i1'));
    expect(onChange).toHaveBeenCalledWith(['i2', 'i1', 'i3']);
  });

  it('moves an item up', () => {
    const onChange = jest.fn();
    render(
      <OrderingInput
        question={question}
        response={['i1', 'i2', 'i3']}
        revealed={false}
        initialOrder={['i1', 'i2', 'i3']}
        onChange={onChange}
      />,
    );
    fireEvent.press(screen.getByTestId('move-up-i3'));
    expect(onChange).toHaveBeenCalledWith(['i1', 'i3', 'i2']);
  });

  it('disables moving past either end', () => {
    render(
      <OrderingInput
        question={question}
        response={['i1', 'i2', 'i3']}
        revealed={false}
        initialOrder={['i1', 'i2', 'i3']}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('move-up-i1').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('move-down-i3').props.accessibilityState.disabled).toBe(true);
  });

  it('locks the controls and marks correct positions once revealed', () => {
    const onChange = jest.fn();
    render(
      <OrderingInput
        question={question}
        response={['i2', 'i1', 'i3']}
        revealed
        initialOrder={['i1', 'i2', 'i3']}
        onChange={onChange}
      />,
    );
    fireEvent.press(screen.getByTestId('move-down-i2'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('order-row-i3').props.accessibilityLabel).toContain('correct position');
  });
});
```

Append to `src/ui/QuestionCard.test.tsx`, replacing the "no renderer yet" expectation for ordering:

```tsx
describe('QuestionCard with an ordering question', () => {
  it('renders the ordering controls instead of the unsupported notice', () => {
    render(
      <QuestionCard
        question={ordering}
        response={[]}
        revealed={false}
        optionOrder={[]}
        itemOrder={['i2', 'i1']}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByTestId('unsupported-question')).toBeNull();
    expect(screen.getAllByTestId(/^order-row-/)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/OrderingInput.test.tsx src/ui/QuestionCard.test.tsx`
Expected: FAIL - `OrderingInput` missing; the ordering question still renders the unsupported notice.

- [ ] **Step 3: Write the input**

Create `src/ui/OrderingInput.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native';
import type { OrderingQuestion } from '@/core/schema';
import { radius, spacing, type, useTheme } from './theme';

export function OrderingInput({
  question,
  response,
  revealed,
  initialOrder,
  onChange,
}: {
  question: OrderingQuestion;
  response: string[];
  revealed: boolean;
  initialOrder: string[];
  onChange: (order: string[]) => void;
}) {
  const theme = useTheme();
  const itemText = new Map(question.items.map((item) => [item.id, item.text]));
  const order = response.length === question.items.length ? response : initialOrder;

  const move = (index: number, delta: number) => {
    if (revealed) return;
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
      {order.map((itemId, index) => {
        const rightPlace = revealed && question.correctOrder[index] === itemId;
        const label = [
          `${index + 1}. ${itemText.get(itemId) ?? itemId}`,
          revealed ? (rightPlace ? 'correct position' : 'wrong position') : null,
        ]
          .filter(Boolean)
          .join(', ');

        return (
          <View
            key={itemId}
            testID={`order-row-${itemId}`}
            accessibilityLabel={label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: revealed ? 2 : 1,
              borderColor: revealed
                ? rightPlace
                  ? theme.positive
                  : theme.negative
                : theme.border,
              backgroundColor: revealed
                ? rightPlace
                  ? theme.positiveSurface
                  : theme.negativeSurface
                : theme.surface,
            }}
          >
            <Text style={[type.label, { color: theme.textMuted }]}>{index + 1}</Text>
            <Text style={[type.body, { color: theme.text, flex: 1 }]}>
              {itemText.get(itemId) ?? itemId}
            </Text>
            <MoveButton
              testID={`move-up-${itemId}`}
              label="Move up"
              glyph="▲"
              disabled={revealed || index === 0}
              onPress={() => move(index, -1)}
            />
            <MoveButton
              testID={`move-down-${itemId}`}
              label="Move down"
              glyph="▼"
              disabled={revealed || index === order.length - 1}
              onPress={() => move(index, 1)}
            />
          </View>
        );
      })}
    </View>
  );
}

function MoveButton({
  testID,
  label,
  glyph,
  disabled,
  onPress,
}: {
  testID: string;
  label: string;
  glyph: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        padding: spacing.sm,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: theme.border,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Text style={{ color: theme.text }}>{glyph}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 4: Hook it into QuestionCard**

In `src/ui/QuestionCard.tsx`: add `itemOrder?: string[]` to the props (default `[]`), import `OrderingInput`, and before the `ChoiceList` fallback branch:

```tsx
  if (question.type === 'ordering') {
    return (
      <Card>
        <Text style={[type.body, { color: theme.text }]}>{question.prompt}</Text>
        <OrderingInput
          question={question}
          response={response}
          revealed={revealed}
          initialOrder={itemOrder.length > 0 ? itemOrder : question.items.map((i) => i.id)}
          onChange={onChange}
        />
      </Card>
    );
  }
```

Then thread the order through: in `src/ui/useSessionRunner.ts` add

```ts
  const itemOrder = useMemo(
    () => (loaded && question ? orderedItemIds(question, loaded.state.config) : []),
    [loaded, question],
  );
```

(importing `orderedItemIds` from `@/core/session`), return it, pass it from `app/session/[attemptId].tsx` into `RunnerView`, and from `RunnerView` into `QuestionCard`. `ResultsView` passes `itemOrder={answer.response}` so a review shows the order the user submitted.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/ui`
Expected: PASS, including the 6 new `OrderingInput` tests.

- [ ] **Step 6: Commit**

```bash
git add src/ui/OrderingInput.tsx src/ui/OrderingInput.test.tsx src/ui/QuestionCard.tsx src/ui/QuestionCard.test.tsx src/ui/useSessionRunner.ts src/ui/RunnerView.tsx src/ui/ResultsView.tsx app/session
git commit -m "Add ordering question renderer"
```

---

### Task 22: Matching questions

**Files:**
- Create: `src/ui/MatchingInput.tsx`
- Modify: `src/ui/QuestionCard.tsx`, `src/ui/QuestionCard.test.tsx`
- Test: `src/ui/MatchingInput.test.tsx`

**Interfaces:**
- Consumes: `MatchingQuestion` from `@/core/schema`.
- Produces: `MatchingInput` (props `question: MatchingQuestion`, `response: string[]`, `revealed: boolean`, `onChange(pairs: string[]): void`)

Spec §3.3. **Interaction decision:** tap a left item to select it, then tap a right item to pair them; tapping a paired left item clears its pair. Same reasoning as Task 21 - accessible, identical on web and touch, testable without gesture simulation. The response format is the `"leftId:rightId"` list the scorer already expects.

- [ ] **Step 1: Write the failing test**

Create `src/ui/MatchingInput.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { MatchingQuestion } from '@/core/schema';
import { MatchingInput } from './MatchingInput';

const question: MatchingQuestion = {
  id: 'q-mat',
  type: 'matching',
  prompt: 'Match these',
  left: [
    { id: 'l1', text: 'Latency' },
    { id: 'l2', text: 'Throughput' },
  ],
  right: [
    { id: 'r1', text: 'Time for one request' },
    { id: 'r2', text: 'Requests per second' },
  ],
  pairs: [
    { left: 'l1', right: 'r1' },
    { left: 'l2', right: 'r2' },
  ],
};

describe('MatchingInput', () => {
  it('renders every left and right item', () => {
    render(<MatchingInput question={question} response={[]} revealed={false} onChange={() => {}} />);
    expect(screen.getByTestId('left-l1')).toBeTruthy();
    expect(screen.getByTestId('right-r2')).toBeTruthy();
  });

  it('pairs a left item with the next right item tapped', () => {
    const onChange = jest.fn();
    render(<MatchingInput question={question} response={[]} revealed={false} onChange={onChange} />);
    fireEvent.press(screen.getByTestId('left-l1'));
    fireEvent.press(screen.getByTestId('right-r1'));
    expect(onChange).toHaveBeenCalledWith(['l1:r1']);
  });

  it('replaces an existing pair for the same left item', () => {
    const onChange = jest.fn();
    render(
      <MatchingInput question={question} response={['l1:r1']} revealed={false} onChange={onChange} />,
    );
    fireEvent.press(screen.getByTestId('left-l1'));
    fireEvent.press(screen.getByTestId('right-r2'));
    expect(onChange).toHaveBeenCalledWith(['l1:r2']);
  });

  it('clears a pair when its left item is tapped while already paired', () => {
    const onChange = jest.fn();
    render(
      <MatchingInput question={question} response={['l1:r1']} revealed={false} onChange={onChange} />,
    );
    fireEvent.press(screen.getByTestId('left-l1'));
    fireEvent.press(screen.getByTestId('left-l1'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows the current pairing on the left item', () => {
    render(
      <MatchingInput question={question} response={['l1:r1']} revealed={false} onChange={() => {}} />,
    );
    expect(screen.getByTestId('left-l1').props.accessibilityLabel).toContain(
      'Time for one request',
    );
  });

  it('marks right and wrong pairs and locks input once revealed', () => {
    const onChange = jest.fn();
    render(
      <MatchingInput question={question} response={['l1:r2', 'l2:r1']} revealed onChange={onChange} />,
    );
    fireEvent.press(screen.getByTestId('left-l1'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('left-l1').props.accessibilityLabel).toContain('incorrect');
  });
});
```

Append to `src/ui/QuestionCard.test.tsx`:

```tsx
describe('QuestionCard with a matching question', () => {
  const matching = {
    id: 'q-5',
    type: 'matching',
    prompt: 'Match these',
    left: [{ id: 'l1', text: 'Latency' }],
    right: [{ id: 'r1', text: 'Time for one request' }],
    pairs: [{ left: 'l1', right: 'r1' }],
  } as Question;

  it('renders the matching controls instead of the unsupported notice', () => {
    render(
      <QuestionCard question={matching} response={[]} revealed={false} optionOrder={[]} onChange={() => {}} />,
    );
    expect(screen.queryByTestId('unsupported-question')).toBeNull();
    expect(screen.getByTestId('left-l1')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/MatchingInput.test.tsx src/ui/QuestionCard.test.tsx`
Expected: FAIL - `MatchingInput` missing.

- [ ] **Step 3: Write the input**

Create `src/ui/MatchingInput.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { MatchingQuestion } from '@/core/schema';
import { radius, spacing, type, useTheme } from './theme';

const parse = (response: string[]) =>
  new Map(
    response
      .map((entry) => entry.split(':'))
      .filter((parts) => parts.length === 2)
      .map(([left, right]) => [left, right] as const),
  );

const serialise = (pairs: Map<string, string>) =>
  [...pairs.entries()].map(([left, right]) => `${left}:${right}`);

export function MatchingInput({
  question,
  response,
  revealed,
  onChange,
}: {
  question: MatchingQuestion;
  response: string[];
  revealed: boolean;
  onChange: (pairs: string[]) => void;
}) {
  const theme = useTheme();
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const pairs = parse(response);
  const expected = parse(question.pairs.map((p) => `${p.left}:${p.right}`));
  const rightText = new Map(question.right.map((item) => [item.id, item.text]));

  const pressLeft = (leftId: string) => {
    if (revealed) return;
    if (pairs.has(leftId) && selectedLeft !== leftId) {
      setSelectedLeft(leftId);
      return;
    }
    if (pairs.has(leftId)) {
      const next = new Map(pairs);
      next.delete(leftId);
      setSelectedLeft(null);
      onChange(serialise(next));
      return;
    }
    setSelectedLeft(selectedLeft === leftId ? null : leftId);
  };

  const pressRight = (rightId: string) => {
    if (revealed || !selectedLeft) return;
    const next = new Map(pairs);
    next.set(selectedLeft, rightId);
    setSelectedLeft(null);
    onChange(serialise(next));
  };

  return (
    <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
      <View style={{ gap: spacing.sm }}>
        {question.left.map((item) => {
          const pairedTo = pairs.get(item.id);
          const right = pairedTo ? (rightText.get(pairedTo) ?? pairedTo) : null;
          const correct = revealed && pairedTo === expected.get(item.id);
          const label = [
            item.text,
            right ? `paired with ${right}` : 'not paired',
            revealed ? (correct ? 'correct' : 'incorrect') : null,
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <Pressable
              key={item.id}
              testID={`left-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: selectedLeft === item.id, disabled: revealed }}
              disabled={revealed}
              onPress={() => pressLeft(item.id)}
              style={{
                padding: spacing.md,
                borderRadius: radius.md,
                borderWidth: selectedLeft === item.id || revealed ? 2 : 1,
                borderColor: revealed
                  ? correct
                    ? theme.positive
                    : theme.negative
                  : selectedLeft === item.id
                    ? theme.accent
                    : theme.border,
                backgroundColor: revealed
                  ? correct
                    ? theme.positiveSurface
                    : theme.negativeSurface
                  : theme.surface,
              }}
            >
              <Text style={[type.body, { color: theme.text }]}>{item.text}</Text>
              <Text style={[type.caption, { color: theme.textMuted }]}>
                {right ?? 'Tap, then choose a match below'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: spacing.sm }}>
        {question.right.map((item) => (
          <Pressable
            key={item.id}
            testID={`right-${item.id}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: revealed || selectedLeft === null }}
            disabled={revealed || selectedLeft === null}
            onPress={() => pressRight(item.id)}
            style={{
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surfaceAlt,
              opacity: revealed || selectedLeft === null ? 0.6 : 1,
            }}
          >
            <Text style={[type.body, { color: theme.text }]}>{item.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Hook it into QuestionCard**

In `src/ui/QuestionCard.tsx`, alongside the ordering branch from Task 21:

```tsx
  if (question.type === 'matching') {
    return (
      <Card>
        <Text style={[type.body, { color: theme.text }]}>{question.prompt}</Text>
        <MatchingInput
          question={question}
          response={response}
          revealed={revealed}
          onChange={onChange}
        />
      </Card>
    );
  }
```

The `unsupported-question` branch in `toChoices` is now unreachable for the five shipped types. Leave it in place - it is the guard for a future schema version, and its test in `QuestionCard.test.tsx` should be updated to use a deliberately bogus type cast rather than deleted.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, every test green across `src/core`, `src/data` and `src/ui`.

- [ ] **Step 6: Verify every type on device**

Run: `npx expo start --web`. Run "Every Question Type — Sample Set" in practice mode and answer all five questions.
Expected: each type renders, accepts an answer, and shows correct feedback. Repeat on iOS or Android with `npx expo start` if a device or simulator is available.

- [ ] **Step 7: Commit**

```bash
git add src/ui/MatchingInput.tsx src/ui/MatchingInput.test.tsx src/ui/QuestionCard.tsx src/ui/QuestionCard.test.tsx
git commit -m "Add matching question renderer"
```

---

## Definition of done

The plan is complete when all of the following hold:

- `npm test` passes with no skipped tests.
- Every spec section §3–§7 has a task that implements it (see the coverage table below).
- `npx expo start --web` runs the full loop: pick a set → configure → mock test → submit → results → history → reopen that attempt's review.
- Practice mode never auto-advances, and mock mode never reveals an answer before submission.
- A malformed import adds nothing to the library and names every problem.
- Reloading mid-mock offers a resume whose countdown reflects wall-clock time.
- No file under `src/core/` imports React, React Native, or Expo.

### Spec coverage

| Spec section | Task(s) |
|---|---|
| §3.1 Root envelope | 2 |
| §3.2 Common question fields | 2 |
| §3.3 Type-specific fields | 2, 3 |
| §3.4 Explanations | 14 |
| §3.5 Identity and versioning | 3, 9, 19 |
| §3.6 Media | 2, 14 |
| §4.1 Stack | 1 |
| §4.2 Layout | 1, and enforced throughout |
| §4.3 Scoring | 7 |
| §4.4 Seeded shuffle | 5, 8 |
| §5.1 Repository interface | 9 |
| §5.2 v1 implementation | 9, 10 |
| §5.3 Attempt record | 6, 7 |
| §6.1 Library | 12, 20 |
| §6.2 Set detail and pre-test | 13 |
| §6.3 Mock mode | 8, 15, 16 |
| §6.4 Practice mode | 8, 14, 15 |
| §6.5 Results | 17 |
| §6.6 Import | 4, 19 |
| §6.7 History | 18 |
| §7 Error handling and edge cases | 4, 8, 9, 13, 14, 16, 19, 20 |
| §8 Testing | every task |
| §9 Open items | 1 (SDK version), 11 (tokens, dark mode), 10 (sample sets) |

### Decisions this plan makes that the spec left open

1. **Ordering and matching use explicit controls, not drag-and-drop** (Tasks 21, 22). Accessible, identical across web and touch, no gesture library, and testable without simulating drags. Drag can be added later behind the same component props.
2. **The `Repository` is built over a `KVStore` seam** (Task 9) rather than calling AsyncStorage directly, so the entire persistence layer is tested in Node.
3. **Screens are split into a tested `*View` component and a thin route file** (from Task 12 onward), so no display logic hides inside a route.
4. **Bundled sets are validated by the same validator as imports** (Task 10) — a malformed sample set fails the test suite instead of reaching a user.
