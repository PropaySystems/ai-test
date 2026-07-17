import {
  applyMove,
  countMaterial,
  getLegalMoves,
  opponentOf,
} from "./game-engine.js";

const DIFFICULTY = {
  easy: { maxDepth: 2, timeMs: 80 },
  medium: { maxDepth: 4, timeMs: 180 },
  hard: { maxDepth: 6, timeMs: 450 },
};

/** Scores a position from the computer player's perspective. */
export function evaluateState(state, aiPlayer) {
  if (state.status === "completed") {
    if (state.winner === aiPlayer) return 100_000;
    if (state.winner === null) return 0;
    return -100_000;
  }

  const material = countMaterial(state);
  const opponent = opponentOf(aiPlayer);
  const materialScore =
    (material[aiPlayer] - material[opponent]) * 100 +
    (material.kings[aiPlayer] - material.kings[opponent]) * 75;

  // Mobility gives the search a preference for positions that avoid traps.
  const currentMoves = getLegalMoves(state).length;
  const mobilityScore =
    state.currentPlayer === aiPlayer ? currentMoves * 3 : -currentMoves * 3;
  return materialScore + mobilityScore;
}

/** Searches a position with alpha-beta pruning until depth or time expires. */
function minimax(state, depth, alpha, beta, aiPlayer, deadline) {
  if (
    depth === 0 ||
    state.status === "completed" ||
    performance.now() >= deadline
  ) {
    return evaluateState(state, aiPlayer);
  }

  const moves = getLegalMoves(state);
  const maximizing = state.currentPlayer === aiPlayer;
  let best = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const child = applyMove(state, move);
    const score = minimax(child, depth - 1, alpha, beta, aiPlayer, deadline);

    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }

    if (beta <= alpha || performance.now() >= deadline) break;
  }

  return best;
}

/**
 * Selects a legal move using iterative deepening. Completing each depth before
 * starting the next guarantees a usable result within the mobile time budget.
 */
export function chooseComputerMove(
  state,
  difficulty = "medium",
  aiPlayer = state.currentPlayer,
) {
  const options = DIFFICULTY[difficulty] ?? DIFFICULTY.medium;
  const legalMoves = getLegalMoves(state);
  if (legalMoves.length === 0) return null;
  if (legalMoves.length === 1) return legalMoves[0];

  const deadline = performance.now() + options.timeMs;
  let bestMove = legalMoves[0];

  for (let depth = 1; depth <= options.maxDepth; depth += 1) {
    let completedDepth = true;
    let depthBest = bestMove;
    let depthScore = -Infinity;

    for (const move of legalMoves) {
      if (performance.now() >= deadline) {
        completedDepth = false;
        break;
      }

      const score = minimax(
        applyMove(state, move),
        depth - 1,
        -Infinity,
        Infinity,
        aiPlayer,
        deadline,
      );
      if (score > depthScore) {
        depthScore = score;
        depthBest = move;
      }
    }

    if (completedDepth) bestMove = depthBest;
    else break;
  }

  return bestMove;
}
