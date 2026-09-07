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
