const board = document.querySelector("#board");
const resetButton = document.querySelector("#reset-button");
const status = document.querySelector("#status");

const BOARD_ROWS = 8;
const BOARD_COLS = 8;
const BOARD_SIZE = BOARD_ROWS * BOARD_COLS;

function getPieceColor(row, isDark) {
  if (!isDark) {
    return null;
  }

  if (row < 3) {
    return "black";
  }

  if (row > 4) {
    return "white";
  }

  return null;
}

function createBoard() {
  board.replaceChildren();

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const row = Math.floor(index / BOARD_COLS);
    const col = index % BOARD_COLS;
    const isDark = (row + col) % 2 === 1;
    const pieceColor = getPieceColor(row, isDark);

    const cell = document.createElement("button");
    cell.className = `cell ${isDark ? "cell--dark" : "cell--light"}`;
    cell.type = "button";
    cell.dataset.index = index;
    cell.setAttribute(
      "aria-label",
      `${pieceColor ? `${pieceColor} piece, ` : ""}row ${row + 1}, column ${col + 1}`,
    );

    if (pieceColor) {
      const piece = document.createElement("span");
      piece.className = `piece piece--${pieceColor}`;
      piece.dataset.color = pieceColor;
      cell.append(piece);
    }

    board.append(cell);
  }

  status.textContent = "Black: 12 pieces · White: 12 pieces";
}

resetButton.addEventListener("click", createBoard);

createBoard();
