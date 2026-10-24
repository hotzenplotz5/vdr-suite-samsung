// Phase S1: strictly bounded vertical menu focus. A spatial focus graph follows in S2.
export function nextMenuIndex(current, direction, count) {
  if (!Number.isInteger(current) || !Number.isInteger(count) || count <= 0) return 0;
  const clamped = Math.max(0, Math.min(count - 1, current));
  if (direction === "UP" || direction === "LEFT") return Math.max(0, clamped - 1);
  if (direction === "DOWN" || direction === "RIGHT") return Math.min(count - 1, clamped + 1);
  return clamped;
}
