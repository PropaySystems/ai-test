window.Checkers = window.Checkers || {};

(function (Checkers) {
  Checkers.BOARD_SIZE = 8;

  Checkers.PLAYER = Object.freeze({
    WHITE: 'white',
    BLACK: 'black',
  });

  Checkers.PLAYER_LABEL = Object.freeze({
    [Checkers.PLAYER.WHITE]: 'Player A (White)',
    [Checkers.PLAYER.BLACK]: 'Player B (Black)',
  });

  Checkers.FORWARD_ROW_DELTA = Object.freeze({
    [Checkers.PLAYER.WHITE]: 1,
    [Checkers.PLAYER.BLACK]: -1,
  });

  Checkers.KING_ROW = Object.freeze({
    [Checkers.PLAYER.WHITE]: Checkers.BOARD_SIZE - 1,
    [Checkers.PLAYER.BLACK]: 0,
  });

  Checkers.DIAGONAL_DELTAS = Object.freeze([
    { row: 1, col: 1 },
    { row: 1, col: -1 },
    { row: -1, col: 1 },
    { row: -1, col: -1 },
  ]);
})(window.Checkers);
