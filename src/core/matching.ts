export const parsePairs = (response: string[]): Map<string, string> =>
  new Map(
    response
      .map((entry) => entry.split(':'))
      .filter((parts): parts is [string, string] => parts.length === 2)
      .map(([left, right]) => [left, right] as const),
  );

export const serialisePairs = (pairs: Map<string, string>): string[] =>
  [...pairs.entries()].map(([left, right]) => `${left}:${right}`);

// A right item can only be matched to one left item at a time, so if it was already
// assigned elsewhere that pair is dropped first - this is what makes moving a placed chip
// straight to a different slot behave like a single move instead of leaving a duplicate.
export function setPair(
  pairs: Map<string, string>,
  leftId: string,
  rightId: string,
): Map<string, string> {
  const next = new Map(pairs);
  for (const [existingLeft, existingRight] of next) {
    if (existingRight === rightId) next.delete(existingLeft);
  }
  next.set(leftId, rightId);
  return next;
}

export function clearPair(pairs: Map<string, string>, leftId: string): Map<string, string> {
  const next = new Map(pairs);
  next.delete(leftId);
  return next;
}

export type Rect = { pageX: number; pageY: number; width: number; height: number };

export function findSlotAt(layout: Record<string, Rect>, x: number, y: number): string | null {
  'worklet';
  for (const id in layout) {
    const box = layout[id];
    if (x >= box.pageX && x <= box.pageX + box.width && y >= box.pageY && y <= box.pageY + box.height) {
      return id;
    }
  }
  return null;
}
