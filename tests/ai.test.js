import { describe, expect, it } from "vitest";
import { chooseComputerMove, evaluateState } from "../shared/ai.js";
import {
  createInitialState,
  getLegalMoves,
  positionKey,
  toIndex,
} from "../shared/game-engine.js";

/** Creates a small deterministic tactical position for AI checks. */
function tacticalPosition() {
  const state = createInitialState({ firstPlayer: "orange" });
  state.board = Array(64).fill(null);
  state.board[toIndex(2, 1)] = {
    id: "orange-attacker",
    player: "orange",
    king: false,
  };
  state.board[toIndex(3, 2)] = {
    id: "blue-target",
    player: "blue",
    king: false,
  };
  state.board[toIndex(7, 6)] = {
    id: "blue-reserve",
    player: "blue",
    king: true,
  };
  state.positionCounts = { [positionKey(state)]: 1 };
  return state;
}

describe("computer opponent", () => {
  it("always returns a legal move", () => {
    const state = createInitialState({ firstPlayer: "orange" });
    const move = chooseComputerMove(state, "easy", "orange");
    expect(getLegalMoves(state)).toContainEqual(move);
  });

  it("takes a mandatory capture", () => {
    const state = tacticalPosition();
    const move = chooseComputerMove(state, "hard", "orange");
    expect(move).toMatchObject({
      from: toIndex(2, 1),
      to: toIndex(4, 3),
      capture: true,
    });
  });

  it("scores a material advantage for the requested player", () => {
    const state = tacticalPosition();
    expect(evaluateState(state, "blue")).toBeGreaterThan(
      evaluateState(state, "orange"),
    );
  });
});
