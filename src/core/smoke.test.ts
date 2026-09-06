import { describe, expect, it } from '@jest/globals';

describe('test harness', () => {
  it('runs TypeScript tests from src/core', () => {
    const doubled = [1, 2, 3].map((n) => n * 2);
    expect(doubled).toEqual([2, 4, 6]);
  });
});
