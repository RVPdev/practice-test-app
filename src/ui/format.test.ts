import { describe, expect, it } from '@jest/globals';
import { formatClock, formatDate, formatDuration, formatPercent } from './format';

describe('formatClock', () => {
  it('renders mm:ss under an hour', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(9000)).toBe('00:09');
    expect(formatClock(90 * 60 * 1000)).toBe('90:00');
  });

  it('never goes negative', () => {
    expect(formatClock(-5000)).toBe('00:00');
  });
});

describe('formatDuration', () => {
  it('renders a human-readable elapsed time', () => {
    expect(formatDuration(45 * 1000)).toBe('45s');
    expect(formatDuration(9 * 60 * 1000)).toBe('9m 0s');
    expect(formatDuration(69 * 60 * 1000 + 30 * 1000)).toBe('1h 9m');
  });
});

describe('formatPercent', () => {
  it('drops a trailing .0', () => {
    expect(formatPercent(75)).toBe('75%');
    expect(formatPercent(66.7)).toBe('66.7%');
  });
});

describe('formatDate', () => {
  it('renders a stable short date', () => {
    expect(formatDate('2026-09-06T14:02:11.000Z')).toMatch(/2026/);
  });

  it('returns a dash for an unparseable value', () => {
    expect(formatDate('not a date')).toBe('—');
  });
});
