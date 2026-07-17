import { describe, expect, it } from "vitest";
import {
  applyMove,
  createInitialState,
  createUndoSnapshot,
  getLegalMoves,
  positionKey,
  restoreUndoSnapshot,
  toIndex,
} from "../shared/game-engine.js";

/** Creates an empty active state so each rule can be tested in isolation. */
function position(currentPlayer = "blue") {
  const state = createInitialState({ firstPlayer: currentPlayer });
  state.board = Array(64).fill(null);
  state.positionCounts = {};
  state.positionCounts[positionKey(state)] = 1;
  return state;
}

/** Places a stable test piece at board coordinates. */
function place(
  state,
  row,
  column,
  player,
  king = false,
  id = `${player}-${row}-${column}`,
) {
  state.board[toIndex(row, column)] = { id, player, king };
}

describe("Edge Kings rules engine", () => {
  it("creates 12 pieces per player on playable squares", () => {
    const state = createInitialState();
    expect(
      state.board.filter((piece) => piece?.player === "blue"),
    ).toHaveLength(12);
    expect(
      state.board.filter((piece) => piece?.player === "orange"),
    ).toHaveLength(12);
    state.board.forEach((piece, index) => {
      if (piece) {
        const row = Math.floor(index / 8);
        const column = index % 8;
        expect((row + column) % 2).toBe(1);
      }
    });
  });

  it("forces a capture instead of an available normal move", () => {
    const state = position();
    place(state, 5, 0, "blue", false, "capturer");
    place(state, 5, 4, "blue", false, "walker");
    place(state, 4, 1, "orange");

    const moves = getLegalMoves(state);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({
      from: toIndex(5, 0),
      to: toIndex(3, 2),
      capture: true,
    });
  });

  it("allows ordinary pieces to capture backward", () => {
    const state = position();
    place(state, 3, 2, "blue");
    place(state, 4, 3, "orange");

    expect(getLegalMoves(state)).toContainEqual(
      expect.objectContaining({
        from: toIndex(3, 2),
        to: toIndex(5, 4),
        capture: true,
      }),
    );
  });

  it("forces the same piece to continue a capture chain", () => {
    const state = position();
    place(state, 5, 0, "blue", false, "chain");
    place(state, 4, 1, "orange", false, "first");
    place(state, 2, 3, "orange", false, "second");
    place(state, 5, 6, "blue", false, "other");

    const afterFirst = applyMove(state, {
      from: toIndex(5, 0),
      to: toIndex(3, 2),
    });

    expect(afterFirst.currentPlayer).toBe("blue");
    expect(afterFirst.forcedPieceId).toBe("chain");
    expect(getLegalMoves(afterFirst)).toEqual([
      expect.objectContaining({
        from: toIndex(3, 2),
        to: toIndex(1, 4),
      }),
    ]);
  });

  it("promotes on the back row and ends the capture chain", () => {
    const state = position();
    place(state, 2, 1, "blue", false, "promoter");
    place(state, 1, 2, "orange");
    place(state, 1, 4, "orange");

    const promoted = applyMove(state, {
      from: toIndex(2, 1),
      to: toIndex(0, 3),
    });

    expect(promoted.board[toIndex(0, 3)].king).toBe(true);
    expect(promoted.currentPlayer).toBe("orange");
    expect(promoted.forcedPieceId).toBeNull();
  });

  it("ends with a capture win when the final opposing piece is removed", () => {
    const state = position();
    place(state, 3, 2, "blue");
    place(state, 2, 3, "orange");

    const completed = applyMove(state, {
      from: toIndex(3, 2),
      to: toIndex(1, 4),
    });

    expect(completed.status).toBe("completed");
    expect(completed.winner).toBe("blue");
    expect(completed.resultReason).toBe("capture");
  });

  it("declares a draw on the third occurrence of a position", () => {
    const state = position();
    place(state, 7, 0, "blue", true, "blue-king");
    place(state, 0, 7, "orange", true, "orange-king");
    state.positionCounts = {};

    let current = state;
    const cycle = [
      [toIndex(7, 0), toIndex(6, 1)],
      [toIndex(0, 7), toIndex(1, 6)],
      [toIndex(6, 1), toIndex(7, 0)],
      [toIndex(1, 6), toIndex(0, 7)],
    ];

    for (
      let repetition = 0;
      repetition < 3 && current.status === "active";
      repetition += 1
    ) {
      for (const [from, to] of cycle) {
        current = applyMove(current, { from, to });
        if (current.status === "completed") break;
      }
    }

    expect(current.status).toBe("completed");
    expect(current.winner).toBeNull();
    expect(current.resultReason).toBe("repetition");
  });

  it("declares a no-progress draw after 80 completed turns", () => {
    const state = position();
    place(state, 7, 0, "blue", true);
    place(state, 0, 7, "orange", true);
    state.noProgressPly = 79;

    const completed = applyMove(state, {
      from: toIndex(7, 0),
      to: toIndex(6, 1),
    });

    expect(completed.status).toBe("completed");
    expect(completed.resultReason).toBe("no-progress");
  });

  it("restores a complete turn snapshot and consumes undo", () => {
    const initial = createInitialState();
    const snapshot = createUndoSnapshot(initial, []);
    const move = getLegalMoves(initial)[0];
    const changed = applyMove(initial, move);
    expect(changed.board).not.toEqual(snapshot.state.board);

    const restored = restoreUndoSnapshot(snapshot);
    expect(restored.state.board).toEqual(initial.board);
    expect(restored.state.undoUsed).toBe(true);
    expect(restored.moves).toEqual([]);
  });
});
