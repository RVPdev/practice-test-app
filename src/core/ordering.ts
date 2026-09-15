export function reorder(order: string[], fromIndex: number, toIndex: number): string[] {
  'worklet';
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    fromIndex >= order.length ||
    toIndex < 0 ||
    toIndex >= order.length
  ) {
    return order;
  }
  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
