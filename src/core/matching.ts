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

// A matching answer bank has to hold one chip per placement, so a question whose answer is
// reused ("Physical" for two rows) lists that answer several times under different ids. Chips
// with the same text are the same answer, so they are scored as interchangeable: this maps
// each right item to the first right item sharing its text.
export function canonicalRightIds(right: { id: string; text: string }[]): Map<string, string> {
  const firstByText = new Map<string, string>();
  return new Map(
    right.map((item) => {
      const key = item.text.trim();
      if (!firstByText.has(key)) firstByText.set(key, item.id);
      return [item.id, firstByText.get(key) as string] as const;
    }),
  );
}

/** Rewrites a `left:right` entry so its right id is the canonical one for that answer text. */
export function canonicalPair(canonical: Map<string, string>, entry: string): string {
  const parts = entry.split(':');
  if (parts.length !== 2) return entry;
  return `${parts[0]}:${canonical.get(parts[1]) ?? parts[1]}`;
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
