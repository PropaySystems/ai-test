/** Shared board, player, and movement constants. */

export const BOARD_SIZE = 8;
export const PIECES_PER_PLAYER = 12;

export const PLAYERS = Object.freeze({
  RED: 'red',
  BLACK: 'black',
});

export const PIECE_TYPES = Object.freeze({
  MAN: 'man',
  KING: 'king',
});

/** Dark squares are those where (row + col) is odd. */
export function isDarkSquare(row, col) {
  return (row + col) % 2 === 1;
}

/** Forward row deltas for each player (men only move this way). */
export const FORWARD_DELTAS = Object.freeze({
  [PLAYERS.RED]: 1,
  [PLAYERS.BLACK]: -1,
});

/** King rows: red crowns on the last row, black on the first. */
export const KING_ROWS = Object.freeze({
  [PLAYERS.RED]: BOARD_SIZE - 1,
  [PLAYERS.BLACK]: 0,
});

export const DIAGONAL_DELTAS = Object.freeze([
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 },
]);
