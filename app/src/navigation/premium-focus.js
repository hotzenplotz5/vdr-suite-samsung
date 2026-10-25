// S2.2 Samsung focus graph. Each view supplies its visible, ordered rows.
// Pure navigation logic: no Tizen API, layout measurement or second key listener.
export function nextFocusId(current, direction, rows, remembered) {
  if (!rows || !rows.length || !rows[0] || !rows[0].length) return null;

  var row = -1;
  var column = -1;
  for (var r = 0; r < rows.length; r += 1) {
    var cells = rows[r] || [];
    var found = cells.indexOf(current);
    if (found !== -1) {
      row = r;
      column = found;
      break;
    }
  }
  if (row === -1) return rows[0][0];

  if (direction === "LEFT") return rows[row][Math.max(0, column - 1)];
  if (direction === "RIGHT") return rows[row][Math.min(column + 1, rows[row].length - 1)];

  if (direction === "UP" || direction === "DOWN") {
    var targetRow = row + (direction === "UP" ? -1 : 1);
    if (targetRow < 0 || targetRow >= rows.length) return current;
    var targets = rows[targetRow] || [];
    if (!targets.length) return current;
    // Going back to a previously visited row returns to its last focused card.
    var preferred = remembered && remembered[targetRow];
    if (preferred && targets.indexOf(preferred) !== -1) return preferred;
    // First-time cross-row motion uses the nearest column, clamped at the edge.
    return targets[Math.min(column, targets.length - 1)];
  }
  return current;
}
