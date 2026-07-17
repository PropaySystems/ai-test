const board = document.querySelector("#board");
const resetButton = document.querySelector("#reset-button");
const status = document.querySelector("#status");

const BOARD_ROWS = 8;
const BOARD_COLS = 8;
const BOARD_SIZE = BOARD_ROWS * BOARD_COLS;
let currentPlayer = "black";
let selectedCell = null;

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

function updateStatus() {
  const playerName = currentPlayer[0].toUpperCase() + currentPlayer.slice(1);
  status.textContent = `${playerName}'s turn`;
}

function updateCellLabel(cell) {
  const index = Number(cell.dataset.index);
  const row = Math.floor(index / BOARD_COLS);
  const col = index % BOARD_COLS;
  const piece = cell.querySelector(".piece");
  const pieceDescription = piece ? `${piece.dataset.color} piece, ` : "";

  cell.setAttribute(
    "aria-label",
    `${pieceDescription}row ${row + 1}, column ${col + 1}`,
  );
}

function selectCell(cell) {
  selectedCell?.classList.remove("cell--selected");
  selectedCell = cell;
  selectedCell.classList.add("cell--selected");
}

function moveSelectedPiece(destination) {
  destination.append(selectedCell.querySelector(".piece"));
  selectedCell.classList.remove("cell--selected");
  updateCellLabel(selectedCell);
  updateCellLabel(destination);
  selectedCell = null;
  currentPlayer = currentPlayer === "black" ? "white" : "black";
  updateStatus();
}

function handleBoardClick(event) {
  const cell = event.target.closest(".cell");

  if (!cell) {
    return;
  }

  const piece = cell.querySelector(".piece");

  if (piece?.dataset.color === currentPlayer) {
    selectCell(cell);
    return;
  }

  if (
    selectedCell &&
    !piece &&
    cell.classList.contains("cell--dark")
  ) {
    moveSelectedPiece(cell);
  }
}

function createBoard() {
  board.replaceChildren();
  currentPlayer = "black";
  selectedCell = null;

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const row = Math.floor(index / BOARD_COLS);
    const col = index % BOARD_COLS;
    const isDark = (row + col) % 2 === 1;
    const pieceColor = getPieceColor(row, isDark);

    const cell = document.createElement("button");
    cell.className = `cell ${isDark ? "cell--dark" : "cell--light"}`;
    cell.type = "button";
    cell.dataset.index = index;

    if (pieceColor) {
      const piece = document.createElement("span");
      piece.className = `piece piece--${pieceColor}`;
      piece.dataset.color = pieceColor;
      cell.append(piece);
    }

    updateCellLabel(cell);
    board.append(cell);
  }

  updateStatus();
}

board.addEventListener("click", handleBoardClick);
resetButton.addEventListener("click", createBoard);

createBoard();
