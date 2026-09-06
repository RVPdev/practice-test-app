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
