// S2 TV focus graph: stable IDs and explicit rows. No DOM geometry required.
// A single document key handler in main.js remains the sole remote owner.
export function nextFocusId(current, direction, rows) {
  if (!rows || !rows.length || !rows[0].length) return null;
  var row = -1;
  var column = -1;
  for (var r = 0; r < rows.length; r += 1) {
    for (var c = 0; c < rows[r].length; c += 1) {
      if (rows[r][c] === current) {
        row = r;
        column = c;
        break;
      }
    }
    if (row !== -1) break;
  }
  if (row === -1) return rows[0][0];
  if (direction === "LEFT") return rows[row][Math.max(0, column - 1)];
  if (direction === "RIGHT") return rows[row][Math.min(rows[row].length - 1, column + 1)];
  if (direction === "UP" || direction === "DOWN") {
    var nextRow = row + (direction === "UP" ? -1 : 1);
    if (nextRow < 0 || nextRow >= rows.length) return current;
    return rows[nextRow][Math.min(column, rows[nextRow].length - 1)];
  }
  return current;
}
