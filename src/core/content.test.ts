import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { validateSet } from './validate';

const CONTENT_DIR = join(__dirname, '../../content');
const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));

describe('content/*.json practice exams', () => {
  it('has at least one exam file', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  files.forEach((file) => {
    it(`${file} passes schema validation`, () => {
      const raw = JSON.parse(readFileSync(join(CONTENT_DIR, file), 'utf8'));
      const result = validateSet(raw);
      if (!result.ok) {
        throw new Error(`${file} is invalid: ${JSON.stringify(result.errors, null, 2)}`);
      }
      expect(result.ok).toBe(true);
    });
  });

  it('every file has a unique set id', () => {
    const ids = files.map((file) => {
      const raw = JSON.parse(readFileSync(join(CONTENT_DIR, file), 'utf8'));
      return raw.id as string;
    });
    expect(new Set(ids).size).toBe(ids.length);
  });
});
