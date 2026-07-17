export const PLAYERS = Object.freeze({
  BLUE: "blue",
  ORANGE: "orange",
});

const BOARD_SIZE = 8;
const NO_PROGRESS_LIMIT = 80;

/** Returns the opposing player identifier. */
export function opponentOf(player) {
  return player === PLAYERS.BLUE ? PLAYERS.ORANGE : PLAYERS.BLUE;
}

/** Converts a board row and column into a stable flat-array index. */
export function toIndex(row, column) {
  return row * BOARD_SIZE + column;
}

/** Converts a flat-array index into board coordinates. */
export function toCoordinates(index) {
  return {
    row: Math.floor(index / BOARD_SIZE),
    column: index % BOARD_SIZE,
  };
}

/** Reports whether coordinates are inside the board. */
function isInside(row, column) {
  return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE;
}

/** Builds the standard 12-piece-per-side opening position. */
function createBoard() {
  const board = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  let blueNumber = 1;
  let orangeNumber = 1;

  // Populate only dark squares in each player's nearest three rows.
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      if ((row + column) % 2 === 0) continue;

      if (row <= 2) {
        board[toIndex(row, column)] = {
          id: `orange-${orangeNumber++}`,
          player: PLAYERS.ORANGE,
          king: false,
        };
      } else if (row >= 5) {
        board[toIndex(row, column)] = {
          id: `blue-${blueNumber++}`,
          player: PLAYERS.BLUE,
          king: false,
        };
      }
    }
  }

  return board;
}

/** Serializes the material and side-to-move fields used for repetition draws. */
export function positionKey(state) {
  const material = state.board
    .map((piece) => {
      if (!piece) return ".";
      const player = piece.player === PLAYERS.BLUE ? "b" : "o";
      return piece.king ? player.toUpperCase() : player;
    })
    .join("");

  return `${state.currentPlayer}:${material}`;
}

/**
 * Creates a complete serializable game state.
 *
 * @param {{firstPlayer?: "blue"|"orange", humanPlayer?: "blue"|"orange", clockSeconds?: number|null}} options
 */
export function createInitialState({
  firstPlayer = PLAYERS.BLUE,
  humanPlayer = PLAYERS.BLUE,
  clockSeconds = null,
} = {}) {
  const state = {
    board: createBoard(),
    currentPlayer: firstPlayer,
    openingPlayer: firstPlayer,
    humanPlayer,
    forcedPieceId: null,
    status: "active",
    winner: null,
    resultReason: null,
    noProgressPly: 0,
    positionCounts: {},
    completedTurns: 0,
    clockRemaining: clockSeconds,
    initialClockSeconds: clockSeconds,
    undoUsed: false,
  };

  state.positionCounts[positionKey(state)] = 1;
  return state;
}

/** Returns movement directions for a piece and whether captures are requested. */
function directionsFor(piece, capturesOnly) {
  if (piece.king || capturesOnly) {
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
  }

  const forward = piece.player === PLAYERS.BLUE ? -1 : 1;
  return [
    [forward, -1],
    [forward, 1],
  ];
}

/** Generates immediate captures for one piece from the current position. */
function capturesForPiece(state, from) {
  const piece = state.board[from];
  if (!piece) return [];

  const { row, column } = toCoordinates(from);
  const captures = [];

  for (const [rowStep, columnStep] of directionsFor(piece, true)) {
    const jumpedRow = row + rowStep;
    const jumpedColumn = column + columnStep;
    const targetRow = row + rowStep * 2;
    const targetColumn = column + columnStep * 2;
    if (!isInside(targetRow, targetColumn)) continue;

    const capturedIndex = toIndex(jumpedRow, jumpedColumn);
    const targetIndex = toIndex(targetRow, targetColumn);
    const capturedPiece = state.board[capturedIndex];

    if (
      capturedPiece &&
      capturedPiece.player !== piece.player &&
      state.board[targetIndex] === null
    ) {
      captures.push({
        from,
        to: targetIndex,
        capturedIndex,
        pieceId: piece.id,
        capture: true,
      });
    }
  }

  return captures;
}

/** Generates non-capturing moves for one piece. */
function normalMovesForPiece(state, from) {
  const piece = state.board[from];
  if (!piece) return [];

  const { row, column } = toCoordinates(from);
  const moves = [];

  for (const [rowStep, columnStep] of directionsFor(piece, false)) {
    const targetRow = row + rowStep;
    const targetColumn = column + columnStep;
    if (!isInside(targetRow, targetColumn)) continue;

    const targetIndex = toIndex(targetRow, targetColumn);
    if (state.board[targetIndex] === null) {
      moves.push({
        from,
        to: targetIndex,
        capturedIndex: null,
        pieceId: piece.id,
        capture: false,
      });
    }
  }

  return moves;
}

/**
 * Returns every legal immediate move while enforcing global mandatory capture
 * and forced continuation by the active piece.
 */
export function getLegalMoves(state) {
  if (state.status !== "active") return [];

  const playerIndexes = state.board
    .map((piece, index) => ({ piece, index }))
    .filter(({ piece }) => piece?.player === state.currentPlayer);

  // During a chain only the piece that made the previous jump may continue.
  if (state.forcedPieceId) {
    const active = playerIndexes.find(
      ({ piece }) => piece.id === state.forcedPieceId,
    );
    return active ? capturesForPiece(state, active.index) : [];
  }

  const captures = playerIndexes.flatMap(({ index }) =>
    capturesForPiece(state, index),
  );
  if (captures.length > 0) return captures;

  return playerIndexes.flatMap(({ index }) =>
    normalMovesForPiece(state, index),
  );
}

/** Marks a game complete without mutating the caller's state object. */
function completeGame(state, winner, reason) {
  return {
    ...state,
    status: "completed",
    winner,
    resultReason: reason,
    forcedPieceId: null,
  };
}

/** Checks terminal material, immobilization, repetition, and progress limits. */
function resolveEndOfTurn(state) {
  const nextPieces = state.board.filter(
    (piece) => piece?.player === state.currentPlayer,
  );
  if (nextPieces.length === 0) {
    return completeGame(state, opponentOf(state.currentPlayer), "capture");
  }

  if (getLegalMoves(state).length === 0) {
    return completeGame(state, opponentOf(state.currentPlayer), "blocked");
  }

  const key = positionKey(state);
  const nextCount = (state.positionCounts[key] ?? 0) + 1;
  state.positionCounts[key] = nextCount;
  if (nextCount >= 3) {
    return completeGame(state, null, "repetition");
  }

  if (state.noProgressPly >= NO_PROGRESS_LIMIT) {
    return completeGame(state, null, "no-progress");
  }

  return state;
}

/**
 * Applies one legal step. Capture chains return the same player and a forced
 * piece until no capture remains or promotion ends the turn.
 */
export function applyMove(state, requestedMove) {
  const legalMove = getLegalMoves(state).find(
    (move) => move.from === requestedMove.from && move.to === requestedMove.to,
  );
  if (!legalMove) {
    throw new Error("Illegal move.");
  }

  const next = structuredClone(state);
  const piece = next.board[legalMove.from];
  next.board[legalMove.from] = null;
  next.board[legalMove.to] = piece;

  if (legalMove.capture) {
    next.board[legalMove.capturedIndex] = null;
  }

  // Promotion occurs on the far row and deliberately ends a capture chain.
  const { row } = toCoordinates(legalMove.to);
  const promoted =
    !piece.king &&
    ((piece.player === PLAYERS.BLUE && row === 0) ||
      (piece.player === PLAYERS.ORANGE && row === BOARD_SIZE - 1));
  if (promoted) piece.king = true;

  // Capturing the final opposing piece ends immediately, even mid-chain.
  const opponentPieces = next.board.filter(
    (candidate) => candidate?.player === opponentOf(piece.player),
  );
  if (opponentPieces.length === 0) {
    return completeGame(next, piece.player, "capture");
  }

  if (legalMove.capture && !promoted) {
    next.forcedPieceId = piece.id;
    if (capturesForPiece(next, legalMove.to).length > 0) {
      return next;
    }
  }

  next.forcedPieceId = null;
  next.currentPlayer = opponentOf(next.currentPlayer);
  next.completedTurns += 1;
  next.noProgressPly =
    legalMove.capture || promoted ? 0 : next.noProgressPly + 1;
  return resolveEndOfTurn(next);
}

/** Completes an active game as a resignation by the given player. */
export function resignGame(state, player = state.currentPlayer) {
  if (state.status !== "active") return structuredClone(state);
  return completeGame(
    structuredClone(state),
    opponentOf(player),
    "resignation",
  );
}

/** Completes an active game as a timeout by the human player. */
export function timeoutGame(state) {
  if (state.status !== "active") return structuredClone(state);
  return completeGame(
    structuredClone(state),
    opponentOf(state.humanPlayer),
    "timeout",
  );
}

/** Captures the complete state and replay list before a human turn begins. */
export function createUndoSnapshot(state, moves) {
  return {
    state: structuredClone(state),
    moves: structuredClone(moves),
  };
}

/** Restores one snapshot and permanently marks the match's undo as consumed. */
export function restoreUndoSnapshot(snapshot) {
  const restoredState = structuredClone(snapshot.state);
  restoredState.undoUsed = true;
  return {
    state: restoredState,
    moves: structuredClone(snapshot.moves),
  };
}

/** Returns material totals used by the interface and AI evaluation. */
export function countMaterial(state) {
  return state.board.reduce(
    (counts, piece) => {
      if (!piece) return counts;
      counts[piece.player] += 1;
      if (piece.king) counts.kings[piece.player] += 1;
      return counts;
    },
    {
      blue: 0,
      orange: 0,
      kings: { blue: 0, orange: 0 },
    },
  );
}
