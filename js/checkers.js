/**
 * Pure checkers rules engine.
 * All functions are side-effect free with respect to the caller's board
 * (mutations always return new board / state objects).
 */

import {
  BOARD_SIZE,
  DIAGONAL_DELTAS,
  FORWARD_DELTAS,
  KING_ROWS,
  PIECE_TYPES,
  PIECES_PER_PLAYER,
  PLAYERS,
  isDarkSquare,
} from './constants.js';

/**
 * @typedef {{ player: string, type: string }} Piece
 * @typedef {(Piece|null)[][]} Board
 * @typedef {{ row: number, col: number }} Position
 * @typedef {{
 *   from: Position,
 *   to: Position,
 *   captured?: Position|null,
 *   path?: Position[],
 * }} Move
 * @typedef {{
 *   board: Board,
 *   currentPlayer: string,
 *   selected: Position|null,
 *   forcedPiece: Position|null,
 *   captureCount: number,
 *   winner: string|null,
 *   status: string,
 * }} GameState
 */

/** Create an empty 8×8 board. */
export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
}

/**
 * Standard starting position: each player has 12 pieces on the three
 * rows of dark squares closest to them.
 * Red occupies the top (rows 0–2), black the bottom (rows 5–7).
 */
export function createInitialBoard() {
  const board = createEmptyBoard();

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!isDarkSquare(row, col)) continue;

      if (row <= 2) {
        board[row][col] = { player: PLAYERS.RED, type: PIECE_TYPES.MAN };
      } else if (row >= 5) {
        board[row][col] = { player: PLAYERS.BLACK, type: PIECE_TYPES.MAN };
      }
    }
  }

  return board;
}

/** Deep-clone a board so callers can safely mutate the copy. */
export function cloneBoard(board) {
  return board.map((row) =>
    row.map((cell) => (cell ? { ...cell } : null)),
  );
}

export function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function getPiece(board, position) {
  if (!position || !inBounds(position.row, position.col)) return null;
  return board[position.row][position.col];
}

export function positionsEqual(a, b) {
  return Boolean(a && b && a.row === b.row && a.col === b.col);
}

export function opponentOf(player) {
  return player === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
}

function shouldCrown(piece, row) {
  return piece.type === PIECE_TYPES.MAN && KING_ROWS[piece.player] === row;
}

/**
 * Direction deltas a piece may move/capture in.
 * Men: forward diagonals only. Kings: all four diagonals.
 */
export function getMoveDeltas(piece) {
  if (piece.type === PIECE_TYPES.KING) {
    return DIAGONAL_DELTAS;
  }

  const forward = FORWARD_DELTAS[piece.player];
  return [
    { row: forward, col: -1 },
    { row: forward, col: 1 },
  ];
}

/**
 * Quiet (non-capturing) moves from a square for the given piece.
 */
export function getQuietMovesFrom(board, from, piece) {
  const moves = [];

  for (const delta of getMoveDeltas(piece)) {
    const toRow = from.row + delta.row;
    const toCol = from.col + delta.col;

    if (!inBounds(toRow, toCol) || !isDarkSquare(toRow, toCol)) continue;
    if (board[toRow][toCol] !== null) continue;

    moves.push({
      from: { ...from },
      to: { row: toRow, col: toCol },
      captured: null,
    });
  }

  return moves;
}

/**
 * Single-jump capture options from a square for the given piece.
 * Does not recurse into multi-jumps.
 */
export function getCapturesFrom(board, from, piece) {
  const moves = [];

  for (const delta of getMoveDeltas(piece)) {
    const midRow = from.row + delta.row;
    const midCol = from.col + delta.col;
    const toRow = from.row + delta.row * 2;
    const toCol = from.col + delta.col * 2;

    if (!inBounds(toRow, toCol) || !isDarkSquare(toRow, toCol)) continue;
    if (board[toRow][toCol] !== null) continue;

    const mid = board[midRow]?.[midCol];
    if (!mid || mid.player === piece.player) continue;

    moves.push({
      from: { ...from },
      to: { row: toRow, col: toCol },
      captured: { row: midRow, col: midCol },
    });
  }

  return moves;
}

/**
 * All captures available to a player anywhere on the board.
 * When `forcedPiece` is set, only that piece may continue jumping.
 */
export function getAllCaptures(board, player, forcedPiece = null) {
  const captures = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.player !== player) continue;

      const from = { row, col };
      if (forcedPiece && !positionsEqual(from, forcedPiece)) continue;

      captures.push(...getCapturesFrom(board, from, piece));
    }
  }

  return captures;
}

/**
 * All quiet moves available to a player.
 */
export function getAllQuietMoves(board, player) {
  const moves = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.player !== player) continue;

      moves.push(...getQuietMovesFrom(board, { row, col }, piece));
    }
  }

  return moves;
}

/**
 * Legal moves for the current turn.
 * Captures are mandatory: if any jump exists, only jumps are legal.
 * During a multi-jump, only the forced piece may move, and only by jumping.
 */
export function getLegalMoves(board, player, forcedPiece = null) {
  if (forcedPiece) {
    const piece = getPiece(board, forcedPiece);
    if (!piece || piece.player !== player) return [];
    return getCapturesFrom(board, forcedPiece, piece);
  }

  const captures = getAllCaptures(board, player);
  if (captures.length > 0) return captures;

  return getAllQuietMoves(board, player);
}

/**
 * Legal moves originating from a specific square.
 */
export function getLegalMovesFrom(board, player, from, forcedPiece = null) {
  return getLegalMoves(board, player, forcedPiece).filter((move) =>
    positionsEqual(move.from, from),
  );
}

/**
 * Apply a single move (quiet or one jump).
 * Crowns immediately when landing on the king row.
 * Returns { board, crowned, continuedCaptures }.
 */
export function applyMove(board, move) {
  const next = cloneBoard(board);
  const piece = next[move.from.row][move.from.col];

  if (!piece) {
    throw new Error('No piece at move origin');
  }

  next[move.from.row][move.from.col] = null;
  next[move.to.row][move.to.col] = piece;

  if (move.captured) {
    next[move.captured.row][move.captured.col] = null;
  }

  let crowned = false;
  if (shouldCrown(piece, move.to.row)) {
    next[move.to.row][move.to.col] = {
      player: piece.player,
      type: PIECE_TYPES.KING,
    };
    crowned = true;
  }

  const movedPiece = next[move.to.row][move.to.col];
  const continuedCaptures = move.captured
    ? getCapturesFrom(next, move.to, movedPiece)
    : [];

  return { board: next, crowned, continuedCaptures };
}

/** Count pieces belonging to a player. */
export function countPieces(board, player) {
  let count = 0;

  for (const row of board) {
    for (const cell of row) {
      if (cell?.player === player) count += 1;
    }
  }

  return count;
}

/**
 * How many of the opponent's pieces this player has captured.
 * Derived from remaining pieces so it stays accurate after every jump.
 */
export function countCapturedBy(board, player) {
  const remaining = countPieces(board, opponentOf(player));
  return Math.max(0, PIECES_PER_PLAYER - remaining);
}

/**
 * Winner detection:
 * - Capture all opponent pieces, or
 * - Leave opponent with no legal move on their turn.
 */
export function getWinner(board, playerToMove) {
  const opponent = opponentOf(playerToMove);

  if (countPieces(board, opponent) === 0) {
    return playerToMove;
  }

  if (countPieces(board, playerToMove) === 0) {
    return opponent;
  }

  if (getLegalMoves(board, playerToMove).length === 0) {
    return opponent;
  }

  return null;
}

/**
 * @param {{ firstPlayer?: string }} [options]
 */
export function createInitialState(options = {}) {
  const firstPlayer =
    options.firstPlayer === PLAYERS.RED || options.firstPlayer === PLAYERS.BLACK
      ? options.firstPlayer
      : PLAYERS.BLACK;

  return {
    board: createInitialBoard(),
    currentPlayer: firstPlayer,
    selected: null,
    forcedPiece: null,
    captureCount: 0,
    winner: null,
    status: `${capitalize(firstPlayer)} to move`,
  };
}

/**
 * Rank legal moves for the hint system.
 * Higher score = stronger suggestion. Captures already dominate via getLegalMoves.
 */
export function scoreMove(board, move) {
  let score = 0;
  const piece = getPiece(board, move.from);
  if (!piece) return score;

  if (move.captured) score += 100;

  const landing = move.to;
  if (shouldCrown(piece, landing.row)) score += 40;

  // Prefer advancing men toward the king row.
  if (piece.type === PIECE_TYPES.MAN) {
    const forward = FORWARD_DELTAS[piece.player];
    score += (landing.row - move.from.row) * forward * 2;
  } else {
    score += 5;
  }

  // Prefer central landings slightly.
  const centerBias = 3.5 - Math.abs(landing.col - 3.5);
  score += centerBias;

  // Peek one ply for continued captures after this jump.
  if (move.captured) {
    const { continuedCaptures } = applyMove(board, move);
    score += continuedCaptures.length * 25;
  }

  return score;
}

/**
 * Suggest a single legal move for the current turn.
 * Returns null when the game is over or no moves exist.
 */
export function suggestMove(state) {
  if (!state || state.winner) return null;

  const moves = getLegalMoves(
    state.board,
    state.currentPlayer,
    state.forcedPiece,
  );

  if (moves.length === 0) return null;

  let best = moves[0];
  let bestScore = scoreMove(state.board, best);

  for (let i = 1; i < moves.length; i += 1) {
    const candidate = moves[i];
    const score = scoreMove(state.board, candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return {
    from: { ...best.from },
    to: { ...best.to },
    captured: best.captured ? { ...best.captured } : null,
  };
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Select a square. Returns a new game state.
 * Selecting an empty square or enemy piece clears selection
 * (unless a multi-jump is forced).
 */
export function selectSquare(state, position) {
  if (state.winner) return state;

  const { board, currentPlayer, forcedPiece } = state;
  const piece = getPiece(board, position);

  if (forcedPiece) {
    if (!positionsEqual(position, forcedPiece)) {
      return {
        ...state,
        selected: { ...forcedPiece },
        status: `${capitalize(currentPlayer)} must continue jumping with the highlighted piece`,
      };
    }

    return {
      ...state,
      selected: { ...forcedPiece },
      status: `${capitalize(currentPlayer)} must continue jumping`,
    };
  }

  if (!piece || piece.player !== currentPlayer) {
    return {
      ...state,
      selected: null,
      status: statusMessage(board, currentPlayer),
    };
  }

  const fromMoves = getLegalMovesFrom(board, currentPlayer, position);
  if (fromMoves.length === 0) {
    const anyCaptures = getAllCaptures(board, currentPlayer).length > 0;
    return {
      ...state,
      selected: null,
      status: anyCaptures
        ? `${capitalize(currentPlayer)} must capture — choose a piece that can jump`
        : `${capitalize(currentPlayer)} to move`,
    };
  }

  const mustCapture = fromMoves.some((move) => move.captured);
  return {
    ...state,
    selected: { ...position },
    status: mustCapture
      ? `${capitalize(currentPlayer)} — capture required`
      : `${capitalize(currentPlayer)} — select a destination`,
  };
}

function statusMessage(board, player) {
  const captures = getAllCaptures(board, player);
  if (captures.length > 0) {
    return `${capitalize(player)} must capture`;
  }
  return `${capitalize(player)} to move`;
}

/**
 * Attempt to move the selected piece to `to`.
 * Handles captures, multi-jump continuation, crowning, and win checks.
 */
export function moveSelectedTo(state, to) {
  if (state.winner || !state.selected) return state;

  const { board, currentPlayer, forcedPiece, selected } = state;
  const legal = getLegalMovesFrom(board, currentPlayer, selected, forcedPiece);
  const move = legal.find((candidate) => positionsEqual(candidate.to, to));

  if (!move) {
    return {
      ...state,
      status: 'Illegal move — pick a highlighted square',
    };
  }

  const { board: nextBoard, crowned, continuedCaptures } = applyMove(board, move);
  const captureCount = (state.captureCount ?? 0) + (move.captured ? 1 : 0);

  // Multi-jump: same piece must keep jumping if another jump is available.
  // Crowning mid-chain does NOT end the turn (per game choice): the new king
  // may continue jumping immediately.
  if (move.captured && continuedCaptures.length > 0) {
    const landing = { ...move.to };
    return {
      board: nextBoard,
      currentPlayer,
      selected: landing,
      forcedPiece: landing,
      captureCount,
      winner: null,
      status: crowned
        ? `${capitalize(currentPlayer)} crowned — continue jumping`
        : `${capitalize(currentPlayer)} must continue jumping — ${captureCount} captured`,
    };
  }

  const nextPlayer = opponentOf(currentPlayer);
  const winner = getWinner(nextBoard, nextPlayer);
  const chainStatus =
    captureCount >= 2
      ? `${capitalize(currentPlayer)} completed a ${
          captureCount === 2 ? 'double jump' : `${captureCount}-jump chain`
        } — ${capitalize(nextPlayer)} to move`
      : null;

  return {
    board: nextBoard,
    currentPlayer: winner ? currentPlayer : nextPlayer,
    selected: null,
    forcedPiece: null,
    captureCount: 0,
    winner,
    status: winner
      ? `${capitalize(winner)} wins!`
      : chainStatus
        ? chainStatus
      : crowned
        ? `${capitalize(currentPlayer)} crowned — ${capitalize(nextPlayer)} to move`
        : statusMessage(nextBoard, nextPlayer),
  };
}

/**
 * Handle a board click/key activation: select piece or move to square.
 */
export function handleSquareAction(state, position) {
  if (state.winner) return state;

  const { selected, forcedPiece, board, currentPlayer } = state;

  if (forcedPiece) {
    const legal = getLegalMovesFrom(board, currentPlayer, forcedPiece, forcedPiece);
    const isTarget = legal.some((move) => positionsEqual(move.to, position));
    if (isTarget) {
      return moveSelectedTo({ ...state, selected: { ...forcedPiece } }, position);
    }
    return selectSquare(state, forcedPiece);
  }

  if (selected) {
    const legal = getLegalMovesFrom(board, currentPlayer, selected);
    if (legal.some((move) => positionsEqual(move.to, position))) {
      return moveSelectedTo(state, position);
    }

    const piece = getPiece(board, position);
    if (piece && piece.player === currentPlayer) {
      return selectSquare({ ...state, selected: null }, position);
    }

    return {
      ...state,
      selected: null,
      status: statusMessage(board, currentPlayer),
    };
  }

  return selectSquare(state, position);
}

/**
 * @param {{ firstPlayer?: string }} [options]
 */
export function resetGame(options = {}) {
  return createInitialState(options);
}

export {
  capitalize,
  statusMessage,
};
