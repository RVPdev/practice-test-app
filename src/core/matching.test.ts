import { describe, expect, it } from '@jest/globals';
import { clearPair, findSlotAt, parsePairs, serialisePairs, setPair } from './matching';

describe('parsePairs / serialisePairs', () => {
  it('round-trips left:right entries', () => {
    const pairs = parsePairs(['l1:r1', 'l2:r2']);
    expect(pairs.get('l1')).toBe('r1');
    expect(serialisePairs(pairs).sort()).toEqual(['l1:r1', 'l2:r2']);
  });

  it('ignores malformed entries', () => {
    expect(parsePairs(['not-a-pair', 'l1:r1']).size).toBe(1);
  });
});

describe('setPair', () => {
  it('assigns a right item to an empty slot', () => {
    const pairs = setPair(new Map(), 'l1', 'r1');
    expect(pairs.get('l1')).toBe('r1');
  });

  it('replaces whatever was already in the slot', () => {
    const pairs = setPair(new Map([['l1', 'r1']]), 'l1', 'r2');
    expect(pairs.get('l1')).toBe('r2');
  });

  it('moves a right item out of its previous slot when placed in a new one', () => {
    const pairs = setPair(new Map([['l1', 'r1']]), 'l2', 'r1');
    expect(pairs.has('l1')).toBe(false);
    expect(pairs.get('l2')).toBe('r1');
  });

  it('does not mutate the input map', () => {
    const original = new Map([['l1', 'r1']]);
    setPair(original, 'l2', 'r2');
    expect(original.size).toBe(1);
  });
});

describe('clearPair', () => {
  it('removes the pairing for a left item', () => {
    const pairs = clearPair(new Map([['l1', 'r1']]), 'l1');
    expect(pairs.has('l1')).toBe(false);
  });

  it('is a no-op when the left item has no pairing', () => {
    const pairs = clearPair(new Map(), 'l1');
    expect(pairs.size).toBe(0);
  });
});

describe('findSlotAt', () => {
  const layout = {
    l1: { pageX: 0, pageY: 0, width: 100, height: 50 },
    l2: { pageX: 0, pageY: 50, width: 100, height: 50 },
  };

  it('finds the slot containing the point', () => {
    expect(findSlotAt(layout, 10, 60)).toBe('l2');
  });

  it('returns null when no slot contains the point', () => {
    expect(findSlotAt(layout, 500, 500)).toBeNull();
  });

  it('treats the box edges as inclusive', () => {
    expect(findSlotAt(layout, 100, 50)).toBe('l1');
  });
});
