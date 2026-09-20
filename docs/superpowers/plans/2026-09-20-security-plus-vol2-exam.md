# Security+ SY0-701 Practice Exam — Volume 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author a brand-new, original 90-question full-length CompTIA Security+ (SY0-701) practice exam as a second, independent content file — distinct from the existing `content/comptia-security-plus-sy0-701.json` (88 questions, held back from the shipped app for a possible future paid tier). This new file is content-only: it must pass schema validation and sit in `content/`, but it is **not** added to `src/data/bundled.ts` — the user explicitly chose to hold it back rather than ship it now.

**Architecture:** No code changes. Five tasks each author one CompTIA domain's worth of questions as a standalone JSON array fragment (list of question objects only, no wrapper), written to a tracked scratch path under `content/.drafts/security-plus-vol2-fragments/` (NOT the gitignored `.superpowers/` SDD workspace — fragments must be committed so each task has a reviewable diff). A sixth task merges the five fragments into one `QuestionSet` JSON document at `content/comptia-security-plus-sy0-701-vol2.json`, deletes the draft fragments directory, wires nothing into `bundled.ts`, and verifies the file passes the repo's existing schema tests.

**Tech Stack:** Plain JSON authored by hand against the existing Zod schema in `src/core/schema.ts`; validated by the existing Jest suite (`src/core/content.test.ts`, `src/core/schema.test.ts`).

**Spec:** No separate spec doc. This is a bounded content-authoring task; the Architecture section above and the Global Constraints below are the complete, binding design, agreed with the user in conversation on 2026-09-20 (brand-new second exam, held back from `bundled.ts`).

## Global Constraints

- **Final filename:** `content/comptia-security-plus-sy0-701-vol2.json`. **Final `id` field:** `"comptia-security-plus-sy0-701-vol2"` (must be unique among all files in `content/` — verified unique against the current four files at plan-writing time).
- **Do not touch `src/data/bundled.ts`.** This exam stays unwired/held-back by explicit user decision — do not add an import or a `BUNDLED_SETS` entry for it.
- **Schema authority:** every question object must satisfy the Zod schema in `src/core/schema.ts` (`questionSchema` / `questionSetSchema`). The exact shapes are reproduced in each task below — do not deviate from them. In particular:
  - Every question needs a unique `id` (unique across the *entire final file*, not just within one domain — each task's brief gives it a distinct id prefix to guarantee this).
  - `single` questions need **exactly one** `correct: true` option; `multi` questions need **at least one**.
  - `matching` question item ids must never contain `:` (they're packed as `left:right` strings elsewhere in the app).
  - `ordering` question `correctOrder` must be a permutation of `items`' ids (every id exactly once).
  - `matching` question `pairs` must reference declared `left`/`right` ids, and each `left` id appears in at most one pair.
- **Originality:** all 90 questions must be original — freshly written scenarios/wording, not copied or lightly reworded from `content/comptia-security-plus-sy0-701.json` (the existing Volume 1 exam). Skimming Volume 1 for tone/difficulty calibration is fine; duplicating its scenarios is not.
- **No official CompTIA material** — write original questions inspired by publicly known Security+ SY0-701 exam objectives (the same five domains, same official weighting), never copied text from CompTIA's copyrighted materials or brain-dump sites.
- **Explanations required:** every question needs a top-level `explanation` (why the correct answer is correct) AND every `single`/`multi` option needs its own `explanation` (why that specific option is right or wrong) — this matches Volume 1's style and the app's review-mode UI, which shows per-option explanations.
- **Difficulty tag every question** (`easy` | `medium` | `hard`) per the per-domain targets below — targets are approximate (±1 is fine), the point is a realistic spread, not a rigid quota.
- **Topic ids** (reuse Volume 1's five domain ids verbatim so both exams group under the same topic filter in the app):
  - `general-security-concepts` — "General Security Concepts"
  - `threats-vulnerabilities-mitigations` — "Threats, Vulnerabilities, and Mitigations"
  - `security-architecture` — "Security Architecture"
  - `security-operations` — "Security Operations"
  - `governance-risk-compliance` — "Security Program Management and Oversight"
- Push to origin after every commit (every task ends with a push, not just the last one).
- Work happens on an isolated git worktree/branch, merged via `superpowers:finishing-a-development-branch` after the final task.

## Question object shapes (copy exactly — from `src/core/schema.ts`)

Every question has these common fields plus its type-specific fields:

```
id: string                    // unique, non-empty
topicId: string                // one of the five domain ids above
difficulty: "easy" | "medium" | "hard"
prompt: string                 // non-empty
explanation: string            // why the correct answer is correct
```

**`single` / `multi` choice:**
```json
{
  "id": "...", "type": "single", "topicId": "...", "difficulty": "...",
  "prompt": "...", "explanation": "...",
  "options": [
    { "id": "a", "text": "...", "correct": true,  "explanation": "..." },
    { "id": "b", "text": "...", "correct": false, "explanation": "..." },
    { "id": "c", "text": "...", "correct": false, "explanation": "..." },
    { "id": "d", "text": "...", "correct": false, "explanation": "..." }
  ]
}
```
`type: "multi"` is identical but 2+ options have `"correct": true` and the prompt should say "Select all that apply" or similar. Every question needs 2+ options with unique `id`s (conventionally `a`, `b`, `c`, `d`).

**`boolean`:**
```json
{
  "id": "...", "type": "boolean", "topicId": "...", "difficulty": "...",
  "prompt": "...", "explanation": "...", "answer": true
}
```

**`ordering`** (items must be placed in the correct sequence):
```json
{
  "id": "...", "type": "ordering", "topicId": "...", "difficulty": "...",
  "prompt": "...", "explanation": "...",
  "items": [
    { "id": "step1", "text": "..." },
    { "id": "step2", "text": "..." },
    { "id": "step3", "text": "..." },
    { "id": "step4", "text": "..." }
  ],
  "correctOrder": ["step1", "step2", "step3", "step4"]
}
```
`correctOrder` lists every `items` id exactly once, in the correct sequence.

**`matching`** (pair up two columns; item ids must NOT contain `:`):
```json
{
  "id": "...", "type": "matching", "topicId": "...", "difficulty": "...",
  "prompt": "...", "explanation": "...",
  "left":  [ { "id": "l1", "text": "..." }, { "id": "l2", "text": "..." }, { "id": "l3", "text": "..." } ],
  "right": [ { "id": "r1", "text": "..." }, { "id": "r2", "text": "..." }, { "id": "r3", "text": "..." } ],
  "pairs": [ { "left": "l1", "right": "r2" }, { "left": "l2", "right": "r1" }, { "left": "l3", "right": "r3" } ]
}
```
Every `left` id appears in exactly one pair.

---

### Task 1: Author "General Security Concepts" domain questions

**Files:**
- Create: `content/.drafts/security-plus-vol2-fragments/general-security-concepts.json`

**Interfaces:**
- Consumes: nothing.
- Produces: a JSON file containing a bare JSON array of exactly **11** question objects, `topicId: "general-security-concepts"`, ids prefixed `v2-gsc-001` through `v2-gsc-011` (zero-padded, sequential). Task 6 concatenates this array verbatim into the final file's `questions` array.

**Step 1: Write 11 original questions covering the "General Security Concepts" domain**

Cover a broad, realistic mix of this domain's real Security+ SY0-701 subtopics: CIA triad (confidentiality/integrity/availability), non-repudiation, AAA (authentication/authorization/accounting), zero trust concepts, physical security controls, deception/honeypot techniques, change management, cryptographic concepts (symmetric vs asymmetric, hashing, PKI basics, certificates), and security control types/categories (preventive/detective/corrective, managerial/operational/technical/physical).

Type mix (exactly): **8 `single`, 2 `multi`, 1 `boolean`, 0 `matching`, 0 `ordering`.**
Difficulty target: **4 easy, 5 medium, 2 hard** (±1 fine).

Follow the object shapes above exactly. Write the 11-element JSON array to the file path above (create the `fragments/` directory if it doesn't exist).

**Step 2: Validate the fragment**

Run: `node -e "const a = require('./content/.drafts/security-plus-vol2-fragments/general-security-concepts.json'); console.log(a.length, a.map(q=>q.id))"` from the repo root and confirm it prints `11` and 11 unique, correctly-prefixed ids. Also spot-check by eye that every `single` question has exactly one `correct: true` option and every `multi` question has at least one.

**Step 3: Commit and push**

There's no app code change — commit just the fragment file with a message like `Add General Security Concepts questions for Security+ vol2 exam`, then push to origin.

---

### Task 2: Author "Threats, Vulnerabilities, and Mitigations" domain questions

**Files:**
- Create: `content/.drafts/security-plus-vol2-fragments/threats-vulnerabilities-mitigations.json`

**Interfaces:**
- Consumes: nothing.
- Produces: a bare JSON array of exactly **20** question objects, `topicId: "threats-vulnerabilities-mitigations"`, ids prefixed `v2-tvm-001` through `v2-tvm-020`.

**Step 1: Write 20 original questions covering the "Threats, Vulnerabilities, and Mitigations" domain**

Cover: threat actors and motivations (nation-state, organized crime, hacktivist, insider threat), attack surface/vectors, social engineering (phishing variants, pretexting, vishing, business email compromise), malware types (ransomware, worm, trojan, rootkit, spyware, keylogger, logic bomb, botnet/C2), application vulnerabilities (injection, buffer overflow, XSS, race conditions, memory leaks), network attacks (DDoS, DNS attacks, on-path/MITM, ARP poisoning), password attacks (brute force, spraying, credential stuffing, rainbow tables), physical/supply-chain attacks, indicators of compromise, and mitigation techniques (segmentation, hardening, patching, least privilege, EDR).

Type mix (exactly): **14 `single`, 3 `multi`, 2 `boolean`, 1 `matching`, 0 `ordering`.**
Difficulty target: **6 easy, 9 medium, 5 hard** (±1 fine).

For the `matching` question: build a realistic "match the attack/technique to its description or category" pairing with 4-6 pairs. Follow the object shapes above exactly.

**Step 2: Validate the fragment**

Run: `node -e "const a = require('./content/.drafts/security-plus-vol2-fragments/threats-vulnerabilities-mitigations.json'); console.log(a.length, a.map(q=>q.id))"` and confirm it prints `20` and 20 unique, correctly-prefixed ids. Spot-check the `matching` question: every `left` id appears in exactly one `pairs` entry, and no id (left, right, or question id) contains a `:` character.

**Step 3: Commit and push**

Commit message like `Add Threats/Vulnerabilities/Mitigations questions for Security+ vol2 exam`, then push to origin.

---

### Task 3: Author "Security Architecture" domain questions

**Files:**
- Create: `content/.drafts/security-plus-vol2-fragments/security-architecture.json`

**Interfaces:**
- Consumes: nothing.
- Produces: a bare JSON array of exactly **16** question objects, `topicId: "security-architecture"`, ids prefixed `v2-sa-001` through `v2-sa-016`.

**Step 1: Write 16 original questions covering the "Security Architecture" domain**

Cover: cloud vs on-prem vs hybrid architecture and shared responsibility, IaC, microservices/serverless considerations, network infrastructure concepts (VLANs, segmentation, SD-WAN, zero trust architecture, SASE), on-prem vs cloud data considerations, resilience and recovery concepts (RTO/RPO, high availability, backups, redundancy, geographic dispersion), securing enterprise infrastructure (firewalls, IDS/IPS, load balancers, NAC, secure protocols vs insecure equivalents), and data protection concepts (data classification, data states — at rest/in transit/in use, data sovereignty, encryption/tokenization/masking).

Type mix (exactly): **11 `single`, 2 `multi`, 1 `boolean`, 1 `matching`, 1 `ordering`.**
Difficulty target: **5 easy, 7 medium, 4 hard** (±1 fine).

For the `ordering` question: a realistic sequenced process from this domain (e.g. an incident recovery sequence, a secure deployment pipeline step order, or backup/restore sequencing) with 4-5 steps. For the `matching` question: pair concepts (e.g. secure protocol to its insecure legacy equivalent, or data state to its protection method) with 4-6 pairs. Follow the object shapes above exactly.

**Step 2: Validate the fragment**

Run: `node -e "const a = require('./content/.drafts/security-plus-vol2-fragments/security-architecture.json'); console.log(a.length, a.map(q=>q.id))"` and confirm it prints `16` and 16 unique, correctly-prefixed ids. Spot-check the `ordering` question's `correctOrder` is a permutation of its `items` ids, and the `matching` question's pairs reference declared ids with no id containing `:`.

**Step 3: Commit and push**

Commit message like `Add Security Architecture questions for Security+ vol2 exam`, then push to origin.

---

### Task 4: Author "Security Operations" domain questions

**Files:**
- Create: `content/.drafts/security-plus-vol2-fragments/security-operations.json`

**Interfaces:**
- Consumes: nothing.
- Produces: a bare JSON array of exactly **25** question objects, `topicId: "security-operations"`, ids prefixed `v2-so-001` through `v2-so-025`.

**Step 1: Write 25 original questions covering the "Security Operations" domain**

Cover: secure baselines and hardening, wireless security settings, mobile device management, application security (input validation, secure coding, code signing, sandboxing), asset management, vulnerability management (scanning, CVE/CVSS, penetration testing, patch management), monitoring/alerting/SIEM concepts, firewall rules and ACLs, identity and access management (SSO, MFA, federation, PAM, conditional access, provisioning/deprovisioning), automation/orchestration concepts, and incident response (IR process/phases, digital forensics, chain of custody, e-discovery, root cause analysis).

Type mix (exactly): **17 `single`, 4 `multi`, 2 `boolean`, 1 `matching`, 1 `ordering`.**
Difficulty target: **7 easy, 11 medium, 7 hard** (±1 fine).

For the `ordering` question: the incident response process phase order (or a similarly well-known sequenced SecOps process) with 4-6 steps. For the `matching` question: pair concepts (e.g. IR phase to its activity, or MFA factor type to an example) with 4-6 pairs. Follow the object shapes above exactly.

**Step 2: Validate the fragment**

Run: `node -e "const a = require('./content/.drafts/security-plus-vol2-fragments/security-operations.json'); console.log(a.length, a.map(q=>q.id))"` and confirm it prints `25` and 25 unique, correctly-prefixed ids. Spot-check the `ordering` and `matching` questions as in prior tasks.

**Step 3: Commit and push**

Commit message like `Add Security Operations questions for Security+ vol2 exam`, then push to origin.

---

### Task 5: Author "Security Program Management and Oversight" domain questions

**Files:**
- Create: `content/.drafts/security-plus-vol2-fragments/governance-risk-compliance.json`

**Interfaces:**
- Consumes: nothing.
- Produces: a bare JSON array of exactly **18** question objects, `topicId: "governance-risk-compliance"`, ids prefixed `v2-grc-001` through `v2-grc-018`.

**Step 1: Write 18 original questions covering the "Security Program Management and Oversight" domain**

Cover: security governance (policies, standards, procedures, guidelines), regulations/frameworks/legal considerations (GDPR, PCI DSS, SOC 2, ISO 27001, NIST), third-party/vendor risk management, risk management concepts (risk identification/assessment/register, qualitative vs quantitative analysis, risk appetite/tolerance, risk treatment — avoid/transfer/mitigate/accept), business continuity/disaster recovery planning, data protection/privacy roles (data owner, controller, processor, DPO), security awareness training, and audits/assessments (internal/external, attestation, penetration testing scope, compliance monitoring).

Type mix (exactly): **12 `single`, 3 `multi`, 1 `boolean`, 1 `matching`, 1 `ordering`.**
Difficulty target: **5 easy, 8 medium, 5 hard** (±1 fine).

For the `ordering` question: a realistic sequenced GRC process (e.g. risk management process steps: identify → assess → treat → monitor) with 4-5 steps. For the `matching` question: pair concepts (e.g. regulation/framework to what it governs, or risk treatment strategy to a scenario) with 4-6 pairs. Follow the object shapes above exactly.

**Step 2: Validate the fragment**

Run: `node -e "const a = require('./content/.drafts/security-plus-vol2-fragments/governance-risk-compliance.json'); console.log(a.length, a.map(q=>q.id))"` and confirm it prints `18` and 18 unique, correctly-prefixed ids. Spot-check the `ordering` and `matching` questions as in prior tasks.

**Step 3: Commit and push**

Commit message like `Add Security Program Management and Oversight questions for Security+ vol2 exam`, then push to origin.

---

### Task 6: Assemble, wire nothing, and validate the final exam file

**Files:**
- Create: `content/comptia-security-plus-sy0-701-vol2.json`
- Do NOT modify: `src/data/bundled.ts` (explicitly held back — see Global Constraints)

**Interfaces:**
- Consumes: the five fragment files produced by Tasks 1-5 (all already committed on this branch, under `content/.drafts/security-plus-vol2-fragments/`).
- Produces: the final, complete `QuestionSet` JSON document that the repo's existing Jest suite (`src/core/content.test.ts`) will automatically pick up and schema-validate, because that test globs every `*.json` file in `content/`.

**Step 1: Build the final document**

Concatenate the five fragment arrays, in this exact order (General Security Concepts, Threats/Vulnerabilities/Mitigations, Security Architecture, Security Operations, Governance/Risk/Compliance), into one `questions` array of 90 items. Wrap it in this envelope:

```json
{
  "schemaVersion": 1,
  "id": "comptia-security-plus-sy0-701-vol2",
  "title": "CompTIA Security+ (SY0-701) — Practice Exam, Volume 2",
  "description": "A second, independently-authored original practice exam aligned to the official CompTIA Security+ (SY0-701) exam objectives (Version 7). This is an independently authored study aid, not official CompTIA content, and is not affiliated with or endorsed by CompTIA. Questions are proportioned across the five official domains by their published exam weight: General Security Concepts (12%), Threats, Vulnerabilities, and Mitigations (22%), Security Architecture (18%), Security Operations (28%), and Security Program Management and Oversight (20%).",
  "version": "1.0.0",
  "author": "Practice Test App",
  "language": "en",
  "topics": [
    { "id": "general-security-concepts", "name": "General Security Concepts" },
    { "id": "threats-vulnerabilities-mitigations", "name": "Threats, Vulnerabilities, and Mitigations" },
    { "id": "security-architecture", "name": "Security Architecture" },
    { "id": "security-operations", "name": "Security Operations" },
    { "id": "governance-risk-compliance", "name": "Security Program Management and Oversight" }
  ],
  "exam": {
    "timeLimitMinutes": 90,
    "shuffleQuestions": true,
    "shuffleOptions": true
  },
  "questions": [ /* the 90 concatenated question objects */ ]
}
```

Write this to `content/comptia-security-plus-sy0-701-vol2.json`.

**Step 2: Verify no id collisions and correct counts**

Run: `node -e "
const d = require('./content/comptia-security-plus-sy0-701-vol2.json');
console.log('total', d.questions.length);
const ids = d.questions.map(q => q.id);
console.log('unique ids', new Set(ids).size === ids.length);
const byTopic = {};
d.questions.forEach(q => byTopic[q.topicId] = (byTopic[q.topicId]||0)+1);
console.log(byTopic);
const byType = {};
d.questions.forEach(q => byType[q.type] = (byType[q.type]||0)+1);
console.log(byType);
"` and confirm: `total 90`, `unique ids true`, the per-topic counts are `{general-security-concepts: 11, threats-vulnerabilities-mitigations: 20, security-architecture: 16, security-operations: 25, governance-risk-compliance: 18}`, and the per-type counts are `{single: 62, multi: 14, boolean: 7, matching: 4, ordering: 3}`. If any count is off, fix the assembled file directly (do not go back and re-dispatch a fragment task for an off-by-one — just correct the merged file) and re-run this check until it passes.

**Step 3: Run the repo's real schema validation**

Run: `npm test -- content.test.ts schema.test.ts` (or `npx jest content.test.ts schema.test.ts` if that alias doesn't exist — check `package.json`'s `test` script first) from the repo root. Every test must pass, including the new `comptia-security-plus-sy0-701-vol2.json passes schema validation` case that `content.test.ts` generates automatically for the new file, and the "every file has a unique set id" test. If validation fails, read the Zod error path it prints, fix the specific question object in `content/comptia-security-plus-sy0-701-vol2.json`, and re-run until green.

**Step 4: Confirm `bundled.ts` is untouched**

Run: `git diff --stat -- src/data/bundled.ts` and confirm it prints nothing (no changes). This file must not be touched by this plan.

**Step 5: Clean up fragment scratch files, commit, and push**

The fragment files under `content/.drafts/security-plus-vol2-fragments/` were committed in Tasks 1-5 purely as an implementation convenience; they are not part of the shipped content and should not remain in git history going forward from this point. Delete the `content/.drafts/` directory (`git rm -r content/.drafts`) in the same commit that adds the final `content/comptia-security-plus-sy0-701-vol2.json`. Commit message like `Assemble Security+ vol2 practice exam from domain fragments`. Push to origin.
