import { describe, expect, it } from '@jest/globals';
import { reorder } from './ordering';

describe('reorder', () => {
  it('moves an item forward in the list', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item backward in the list', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('is a no-op when the index does not change', () => {
    const order = ['a', 'b', 'c'];
    expect(reorder(order, 1, 1)).toEqual(order);
  });

  it('is a no-op when the target index is out of range', () => {
    const order = ['a', 'b', 'c'];
    expect(reorder(order, 0, 5)).toEqual(order);
    expect(reorder(order, 0, -1)).toEqual(order);
  });

  it('does not mutate the input array', () => {
    const order = ['a', 'b', 'c'];
    reorder(order, 0, 2);
    expect(order).toEqual(['a', 'b', 'c']);
  });
});
