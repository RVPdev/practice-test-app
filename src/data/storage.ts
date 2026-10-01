import type { QuestionSet } from '@/core/schema';
import type { Attempt, SessionState } from '@/core/types';
import type { KVStore } from './kv';
import type { Repository, SetSource, SetSummary } from './repository';

export const KEY_PREFIX = 'pt:';

const INDEX_KEY = `${KEY_PREFIX}index`;
const IN_PROGRESS_KEY = `${KEY_PREFIX}inprogress`;
const TERMS_ACCEPTED_KEY = `${KEY_PREFIX}termsAccepted`;
const HIDDEN_BUNDLED_KEY = `${KEY_PREFIX}hiddenBundled`;
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
  const readHiddenIds = () => read<string[]>(HIDDEN_BUNDLED_KEY, []);

  const toEntry = (set: QuestionSet, source: SetSource): IndexEntry => ({
    id: set.id,
    title: set.title,
    description: set.description ?? null,
    version: set.version ?? null,
    questionCount: set.questions.length,
    topicCount: set.topics?.length ?? 0,
    source,
  });

  async function summarize(entry: IndexEntry): Promise<SetSummary> {
    const attempts = await readAttempts(entry.id);
    const best = attempts.reduce<number | null>(
      (max, a) => (max === null || a.score.percent > max ? a.score.percent : max),
      null,
    );
    const last = attempts.reduce<string | null>(
      (latest, a) => (latest === null || a.finishedAt > latest ? a.finishedAt : latest),
      null,
    );
    return { ...entry, attemptCount: attempts.length, bestPercent: best, lastAttemptAt: last };
  }

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
      const hidden = new Set(await readHiddenIds());
      const visible = index.filter((entry) => !hidden.has(entry.id));
      return Promise.all(visible.map(summarize));
    },

    async listHiddenSets() {
      const index = await readIndex();
      const hidden = new Set(await readHiddenIds());
      const hiddenEntries = index.filter((entry) => hidden.has(entry.id));
      return Promise.all(hiddenEntries.map(summarize));
    },

    async getSet(setId) {
      return read<QuestionSet | null>(setKey(setId), null);
    },

    async saveSet(set, source, mode = 'replace') {
      const id = mode === 'copy' ? await nextCopyId(set.id) : set.id;
      const index = await readIndex();
      const existingEntry = index.find((e) => e.id === id);
      if (existingEntry?.source === 'bundled' && source === 'imported') {
        throw new Error(`"${existingEntry.title}" is a bundled set and cannot be overwritten`);
      }

      const stored: QuestionSet = { ...set, id };
      await write(setKey(id), stored);

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

    async hideBundledSet(setId) {
      const index = await readIndex();
      const entry = index.find((e) => e.id === setId);
      if (!entry || entry.source !== 'bundled') {
        throw new Error(`"${setId}" is not a bundled set and cannot be hidden`);
      }
      const hidden = new Set(await readHiddenIds());
      hidden.add(setId);
      await write(HIDDEN_BUNDLED_KEY, [...hidden]);
    },

    async restoreBundledSet(setId) {
      const hidden = new Set(await readHiddenIds());
      hidden.delete(setId);
      await write(HIDDEN_BUNDLED_KEY, [...hidden]);
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

    async getTermsAccepted() {
      return read<boolean>(TERMS_ACCEPTED_KEY, false);
    },

    async acceptTerms() {
      await write(TERMS_ACCEPTED_KEY, true);
    },
  };
}
