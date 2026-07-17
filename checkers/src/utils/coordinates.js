window.Checkers = window.Checkers || {};

(function (Checkers) {
  var COL_LABELS = 'ABCDEFGH';

  Checkers.isOnBoard = function (row, col) {
    return row >= 0 && row < Checkers.BOARD_SIZE && col >= 0 && col < Checkers.BOARD_SIZE;
  };

  Checkers.isPlayableSquare = function (row, col) {
    return Checkers.isOnBoard(row, col) && (row + col) % 2 === 0;
  };

  Checkers.toAlgebraic = function (row, col) {
    return COL_LABELS[col] + (row + 1);
  };

  Checkers.fromAlgebraic = function (notation) {
    var col = COL_LABELS.indexOf(notation[0].toUpperCase());
    var row = Number(notation.slice(1)) - 1;
    if (col < 0 || !Checkers.isOnBoard(row, col)) {
      throw new Error('Invalid square: ' + notation);
    }
    return { row: row, col: col };
  };

  Checkers.sameSquare = function (a, b) {
    return a != null && b != null && a.row === b.row && a.col === b.col;
  };

  Checkers.cloneSquare = function (square) {
    return { row: square.row, col: square.col };
  };
})(window.Checkers);
