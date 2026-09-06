# Practice Test App — Design Spec

**Date:** 2026-09-06
**Status:** Approved for implementation planning

## 1. Purpose

A generic practice-test app. The engine is content-agnostic: a question set is a JSON
file, and the app runs any set the user brings. Ships with sample sets bundled and
imports more from the device.

Two study modes:

- **Mock Test** — timed, fixed question count, no feedback until submission.
- **Practice** — one question at a time with immediate correction and explanations.

Runs on web, iOS, and Android from one Expo codebase. Web is the first target; store
distribution follows without a stack change. No accounts, no network dependency, no
monetization in v1.

## 2. Scope

### In scope (v1)

- JSON schema v1 with five question types: `single`, `multi`, `boolean`, `ordering`,
  `matching`.
- Bundled sample sets plus import of a `.json` file from the device.
- Strict import validation with a readable, per-question error report.
- Both study modes, with mock parameters prefilled from the set and editable per run.
- On-device attempt history with full per-question answer detail.
- Results screen with score, pass/fail, per-topic breakdown, and full review.
- Resume of an interrupted session.

### Out of scope (v1, deferred deliberately)

- Accounts, sync, any server component.
- Monetization / IAP.
- Branding and final app name.
- Flagging or bookmarking questions.
- "Retry only missed questions" (the attempt record is designed to make this cheap later).
- Import by URL or pasted text.
- Fill-in-the-blank / free-text answers.
- Partial credit for multi-select.
- Per-question lifetime statistics across attempts.

### Phasing note

`ordering` and `matching` are part of schema v1 so authored content is future-proof, but
their drag-and-drop renderers are the last implementation phase. The core loop
(`single` / `multi` / `boolean`) ships first. The validator accepts all five types from
day one; the runner reports an unsupported-type question clearly until its renderer lands.

## 3. Question set schema (v1)

One set per file. Unknown fields are rejected by the validator, so typos surface at
import instead of being silently ignored.

### 3.1 Root envelope

```json
{
  "schemaVersion": 1,
  "id": "aws-saa-c03-set-1",
  "title": "AWS Solutions Architect Associate — Set 1",
  "description": "65 practice questions across the five exam domains.",
  "version": "1.2.0",
  "author": "rvp",
  "language": "en",
  "topics": [
    { "id": "iam", "name": "Identity & Access" },
    { "id": "vpc", "name": "Networking" }
  ],
  "exam": {
    "questionCount": 65,
    "timeLimitMinutes": 90,
    "passingScore": 72,
    "shuffleQuestions": true,
    "shuffleOptions": true
  },
  "questions": [ ... ]
}
```

| Field | Required | Notes |
|---|---|---|
| `schemaVersion` | yes | Integer. Checked before any other validation. |
| `id` | yes | Stable, unique. Identity for re-import and for attempt records. |
| `title` | yes | Display name in the library. |
| `description` | no | Shown on the set detail screen. |
| `version` | no | Content version (semver string). Recorded on each attempt. |
| `author` | no | Display only. |
| `language` | no | BCP-47 tag. Display only in v1. |
| `topics` | no | Declares topic ids and display names once. |
| `exam` | no | Defaults for mock mode; every field individually optional. |
| `questions` | yes | Non-empty array. |

`exam.passingScore` is a percentage (0–100). Absent `exam` fields fall back to app
defaults: all questions, no time limit, 70% pass mark, shuffles on.

### 3.2 Common question fields

```json
{
  "id": "q-001",
  "type": "single",
  "topicId": "vpc",
  "difficulty": "medium",
  "prompt": "Which service provides a private connection between a VPC and S3?",
  "media": { "type": "image", "source": "https://…/diagram.png", "alt": "VPC layout" },
  "explanation": "Gateway endpoints keep S3 traffic on the AWS network.",
  "reference": { "label": "AWS docs — VPC endpoints", "url": "https://…" }
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique within the set. Never auto-generated (see §3.5). |
| `type` | yes | `single` \| `multi` \| `boolean` \| `ordering` \| `matching`. |
| `topicId` | no | Must match a declared `topics[].id` when `topics` is present. |
| `difficulty` | no | `easy` \| `medium` \| `hard`. Display only in v1. |
| `prompt` | yes | Plain text. No markdown rendering in v1. |
| `media` | no | `type` is `image` in v1. See §3.6. |
| `explanation` | no | Question-level; always shown after answering. |
| `reference` | no | `{ label, url }`. Rendered as an external link. |

### 3.3 Type-specific fields

**`single` / `multi`**

```json
"options": [
  { "id": "a", "text": "Gateway VPC endpoint", "correct": true,
    "explanation": "Correct — routes S3 traffic via the route table, no NAT needed." },
  { "id": "b", "text": "NAT Gateway", "correct": false,
    "explanation": "A NAT Gateway sends traffic over the public internet path." }
]
```

- `id`, `text`, `correct` required; `explanation` optional but strongly encouraged.
- Option ids unique within the question. At least two options.
- `single`: exactly one option with `correct: true`.
- `multi`: at least one; all-or-nothing scoring (§4.3).

**`boolean`**

```json
"answer": true,
"labels": { "true": "True", "false": "False" }
```

The engine normalizes this into a two-option single-choice question with synthetic
option ids `"true"` and `"false"`, so one renderer serves it. `labels` is optional and
lets an author write "Yes / No" or a translated pair.

**`ordering`**

```json
"items": [
  { "id": "i1", "text": "Create the VPC" },
  { "id": "i2", "text": "Attach an internet gateway" }
],
"correctOrder": ["i1", "i2"]
```

- Item ids unique; `correctOrder` is a permutation of exactly the item ids.
- Items are presented shuffled (seeded, §4.4). Correct only if the full order matches.

**`matching`**

```json
"left":  [ { "id": "l1", "text": "S3" } ],
"right": [ { "id": "r1", "text": "Object storage" } ],
"pairs": [ { "left": "l1", "right": "r1" } ]
```

- Ids unique within their own list; every `pairs` entry references declared ids.
- A left item appears in at most one pair. Right items may be reused (distractors on
  the right are allowed and are not required to appear in `pairs`).
- Correct only if every pair matches.

### 3.4 Explanations

Practice-mode feedback composes up to three pieces, in this order:

1. The explanation on the option the user chose (when wrong and present).
2. The explanation on the correct option(s).
3. The question-level `explanation`.

`boolean`, `ordering`, and `matching` carry only the question-level explanation.

### 3.5 Identity and versioning rules

- **Question ids are required and authored, never generated.** Attempt history stores
  question ids; positional numbering would corrupt past attempts the moment a question
  is inserted mid-file.
- **Set identity is `id`.** Re-importing an existing `id` prompts: replace (attempt
  history preserved) or import as a copy (new internal id, fresh history).
- **`schemaVersion` mismatch fails fast** with "this file needs a newer version of the
  app", not a validation dump.

### 3.6 Media

`media.source` is an `https://` URL, or a bundled asset path for sets compiled into the
app. An imported file travels alone, so it cannot reference local disk paths; the
validator rejects non-https, non-bundled sources. Images load lazily and a failed load
degrades to the `alt` text — a broken image never blocks answering.

## 4. Architecture

### 4.1 Stack

- Expo + TypeScript + Expo Router. SDK version read from `create-expo-app@latest` at
  scaffold time and pinned; version-specific docs consulted for that SDK.
- Zod for schema definition and validation; TS types inferred from the schemas so there
  is exactly one source of truth.
- Jest for `core/` unit tests (plain Node, no simulator).
- State: React `useReducer` inside a session provider. No external state library.
- Styling: React Native primitives plus a design-token theme. `@expo/ui` is deliberately
  not used in v1 — it has no web renderer, and web is the first target. Native polish
  with `@expo/ui` is a later pass.

### 4.2 Layout

```
app/                          # Expo Router — routes only, thin
  (tabs)/index.tsx            # Library
  (tabs)/history.tsx          # Attempts across all sets
  set/[setId].tsx             # Set detail → mode choice + pre-test config
  session/[attemptId].tsx     # The runner (both modes)
  results/[attemptId].tsx     # Score + full review
  import.tsx                  # File picker + validation report
src/
  core/                       # zero React, zero Expo imports
    schema.ts                 # Zod schemas + inferred types
    validate.ts               # import validation → readable error list
    session.ts                # reducer: START, ANSWER, NEXT, PREV, TICK, SUBMIT
    scoring.ts                # score, per-topic breakdown, pass/fail
    shuffle.ts                # seeded RNG
  data/
    repository.ts             # interface
    storage.ts                # AsyncStorage implementation
    bundled.ts                # sets compiled into the app
  ui/                         # shared components + theme tokens
assets/sets/                  # bundled sample sets (.json)
```

The rule that keeps this honest: **nothing in `core/` imports React, Expo, or any
storage API.** Screens render engine state and dispatch actions; they hold no scoring,
timing, or correctness logic.

### 4.3 Scoring

- `single` — correct when the chosen option id is the correct one.
- `multi` — all-or-nothing: the chosen set must equal the correct set exactly.
- `boolean` — correct when the chosen synthetic id matches `answer`.
- `ordering` — correct when the submitted id sequence equals `correctOrder`.
- `matching` — correct when the submitted pair set equals `pairs` exactly.
- Unanswered counts as incorrect.
- Percent = correct / total questions in the run (unanswered included in the denominator),
  rounded to one decimal.
- Pass = percent ≥ `passingScore`.
- Per-topic breakdown groups by `topicId`; questions without one group under
  "Uncategorized".

### 4.4 Seeded shuffle

A run stores the RNG seed, not the shuffled arrays. Question order is derived from the seed; per-question option, item, and pair order is
derived from `(seed, questionId)`, so any later screen reconstructs the
exact order the user saw for a few bytes. The shuffle function is pure and unit-tested
for stability: the same seed always yields the same order.

## 5. Persistence

### 5.1 Repository interface

```ts
interface Repository {
  listSets(): Promise<SetSummary[]>;
  getSet(setId: string): Promise<QuestionSet | null>;
  saveSet(set: QuestionSet): Promise<void>;
  deleteSet(setId: string): Promise<void>;          // imported sets only
  listAttempts(setId?: string): Promise<Attempt[]>;
  saveAttempt(attempt: Attempt): Promise<void>;
  getInProgress(): Promise<SessionSnapshot | null>;
  saveInProgress(s: SessionSnapshot | null): Promise<void>;
}
```

### 5.2 v1 implementation

AsyncStorage, identical on all three platforms: one key per set, one library index key,
attempts keyed by set id, one in-progress session key.

**Known limit, accepted for v1:** AsyncStorage is `localStorage` on web (~5MB) and has a
default ~6MB budget on Android — roughly 30–50 exam-sized sets. The repository interface
confines a future swap to `expo-file-system` (native) and IndexedDB (web), or to SQLite,
to a single file. Storage failures surface as a clear message, never as silent data loss.

### 5.3 Attempt record

```json
{
  "id": "att_2026-09-06T14:02:11Z",
  "setId": "aws-saa-c03-set-1",
  "setVersion": "1.2.0",
  "mode": "mock",
  "startedAt": "2026-09-06T14:02:11Z",
  "finishedAt": "2026-09-06T15:11:44Z",
  "config": {
    "questionCount": 65, "timeLimitMinutes": 90,
    "shuffleQuestions": true, "shuffleOptions": true, "seed": 918273
  },
  "score": { "correct": 48, "total": 65, "percent": 73.8, "passed": true },
  "byTopic": [ { "topicId": "vpc", "correct": 12, "total": 15 } ],
  "answers": [
    { "questionId": "q-001", "response": ["a"], "correct": true, "timeMs": 24100 }
  ]
}
```

`response` is a string array for every question type — option ids for `single`/`multi`,
`["true"]`/`["false"]` for `boolean`, the ordered id list for `ordering`, and
`"leftId:rightId"` entries for `matching` — so one shape serves all types. An empty
array means unanswered.

`setVersion` lets a later review warn "this set has changed since this attempt" instead
of rendering mismatched content.

## 6. Screens and flows

### 6.1 Library (home)

Cards for every set, bundled and imported: title, question count, topic count, best
score and last-attempt date when history exists. Bundled sets cannot be deleted;
imported sets can, with confirmation that names how many attempts will be removed.
Empty state points at the bundled samples and the import action.

### 6.2 Set detail and pre-test

Description, topic list, this set's attempt history, and the two mode buttons.

**Mock** opens a config sheet prefilled from `exam`: question count, time limit,
shuffles — all editable. Requesting more questions than the set holds runs the whole set
and says so before starting, rather than erroring.

**Practice** starts immediately: no timer, no count limit, walks the whole set.

### 6.3 Mock mode

- Countdown in the header, driven by an absolute deadline timestamp so backgrounding the
  app cannot buy time.
- Free navigation: forward, back, and a question grid showing answered / unanswered.
- No feedback of any kind before submission.
- Submit asks for confirmation and names the number of unanswered questions.
- Timer expiry auto-submits whatever exists.

### 6.4 Practice mode

One question, a Submit button, then locked feedback (§3.4) plus the reference link when
present. Advancing is a manual "Next" tap — never automatic. Progress is tracked; the run
produces no pass/fail.

### 6.5 Results

Score, pass/fail against `passingScore`, elapsed time, per-topic breakdown ordered
weakest-first, then the full question-by-question review showing the same explanation
content practice mode shows. Reachable later from history, with order reconstructed from
the stored seed.

### 6.6 Import

Pick a `.json` file (`expo-document-picker` on native, file input on web) → validate →
import, or show a report. Validation is **strict and all-or-nothing**: nothing is
imported when anything fails. Errors are plain language with a location, e.g.

```
12 problems found
  Question 12 — no option is marked "correct"
  Question 31 — topicId "vpc " is not declared in topics
  Question 44 — correctOrder is missing item "i3"
```

Same-`id` import prompts replace-or-copy (§3.5).

### 6.7 History tab

All attempts across all sets, newest first, each opening its results screen.

## 7. Error handling and edge cases

| Case | Behavior |
|---|---|
| Interrupted session | Session state written on every answer; relaunch offers "Resume your in-progress attempt?". One in-progress session at a time; starting another discards it with confirmation. |
| Mock timer and backgrounding | Absolute deadline; on resume, remaining time is recomputed and may already be zero → auto-submit. |
| Requested count > set size | Runs the whole set, stated on the pre-test screen. |
| No `topicId` anywhere | Breakdown renders one "Uncategorized" row, not a broken chart. |
| Unsupported question type in the runner | The question is shown with a clear "not yet supported" note and scored as skipped. |
| Malformed JSON file | Nothing imported; readable error report. |
| `schemaVersion` too new | "This file needs a newer version of the app." |
| Broken `media` URL | Falls back to `alt` text; never blocks answering. |
| Storage write failure | Explicit error to the user; never a silent loss. |
| Empty library | Empty state pointing at bundled samples and import. |

## 8. Testing

**`core/` — unit tests in Node, no simulator.** This is where correctness lives and
where coverage should be highest:

- Schema validation: each rule in §3 has a passing and a failing fixture, and each
  failure asserts the human-readable message, not just that it threw.
- Scoring: every type, including all-or-nothing multi-select, unanswered questions, and
  the empty-topic case.
- Session reducer: mode differences, navigation bounds, timer expiry mid-run, submit
  with unanswered questions, resume from a snapshot.
- Shuffle: same seed → same order; different seeds → different orders; every element
  preserved.

**Data layer.** Repository round-trips against an in-memory implementation, plus
save/reload of an in-progress session.

**UI.** Smoke-level component tests for the runner and results screens. The thin-screen
rule keeps this small on purpose.

## 9. Open items for the implementation plan

- Exact Expo SDK version and the matching `expo-document-picker` API.
- Design-token set (color, spacing, typography) and dark mode.
- Content of the bundled sample sets — at least one exercising every supported type.
