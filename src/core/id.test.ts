import { describe, expect, it } from '@jest/globals';
import { makeSetId, nextSequentialId, randomSuffix, slugify, uniqueSlug } from './id';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('CompTIA A+ Core 1')).toBe('comptia-a-core-1');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  --Hello World!--  ')).toBe('hello-world');
  });

  it('falls back to "item" for a string with no alphanumerics', () => {
    expect(slugify('***')).toBe('item');
  });
});

describe('randomSuffix', () => {
  it('defaults to 6 lowercase alphanumeric characters', () => {
    const suffix = randomSuffix();
    expect(suffix).toHaveLength(6);
    expect(suffix).toMatch(/^[a-z0-9]{6}$/);
  });

  it('honors a custom length', () => {
    expect(randomSuffix(10)).toHaveLength(10);
  });

  it('is not the same value every call', () => {
    const values = new Set(Array.from({ length: 20 }, () => randomSuffix()));
    expect(values.size).toBeGreaterThan(1);
  });
});

describe('makeSetId', () => {
  it('combines a slugified title with a random suffix', () => {
    const id = makeSetId('My New Set');
    expect(id).toMatch(/^my-new-set-[a-z0-9]{6}$/);
  });
});

describe('nextSequentialId', () => {
  it('starts at 1 for an empty list', () => {
    expect(nextSequentialId([], 'q')).toBe('q1');
  });

  it('continues after the highest existing number', () => {
    expect(nextSequentialId(['q1', 'q2', 'q5'], 'q')).toBe('q6');
  });

  it('ignores ids with a different prefix', () => {
    expect(nextSequentialId(['o1', 'o2'], 'q')).toBe('q1');
  });

  it('ignores a non-numeric suffix on an id sharing the prefix', () => {
    expect(nextSequentialId(['qx', 'q3'], 'q')).toBe('q4');
  });
});

describe('uniqueSlug', () => {
  it('returns the plain slug when it is not taken', () => {
    expect(uniqueSlug('Networking', [])).toBe('networking');
  });

  it('appends -2, -3, ... when the slug collides', () => {
    expect(uniqueSlug('Networking', ['networking'])).toBe('networking-2');
    expect(uniqueSlug('Networking', ['networking', 'networking-2'])).toBe('networking-3');
  });
});
