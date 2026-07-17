import { chooseComputerMove } from "../shared/ai.js";

/**
 * Calculates computer moves away from the UI thread. Each request carries an
 * identifier so stale responses can be ignored after navigation or undo.
 */
self.addEventListener("message", (event) => {
  const { requestId, state, difficulty, aiPlayer } = event.data;

  try {
    const move = chooseComputerMove(state, difficulty, aiPlayer);
    self.postMessage({ requestId, move });
  } catch (error) {
    self.postMessage({
      requestId,
      error: error instanceof Error ? error.message : "Computer move failed.",
    });
  }
});
