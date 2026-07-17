const board = document.querySelector("#board");
const resetButton = document.querySelector("#reset-button");
const status = document.querySelector("#status");

const BOARD_ROWS = 8;
const BOARD_COLS = 8;
const BOARD_SIZE = BOARD_ROWS * BOARD_COLS;

function createBoard() {
  board.replaceChildren();

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const row = Math.floor(index / BOARD_COLS);
    const col = index % BOARD_COLS;
    const isDark = (row + col) % 2 === 1;

    const cell = document.createElement("button");
    cell.className = `cell ${isDark ? "cell--dark" : "cell--light"}`;
    cell.type = "button";
    cell.dataset.index = index;
    cell.setAttribute("aria-label", `Board cell row ${row + 1}, column ${col + 1}`);
    board.append(cell);
  }

  status.textContent = "Game ready";
}

resetButton.addEventListener("click", createBoard);

createBoard();
