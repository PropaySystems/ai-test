const board = document.querySelector("#board");
const resetButton = document.querySelector("#reset-button");
const status = document.querySelector("#status");

const BOARD_ROWS = 8;
const BOARD_COLS = 8;
const BOARD_SIZE = BOARD_ROWS * BOARD_COLS;
let currentPlayer = "black";
let selectedCell = null;
let mustContinueJump = false;
let gameOver = false;

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

function updateStatus(instruction = "") {
  const playerName = currentPlayer[0].toUpperCase() + currentPlayer.slice(1);
  status.textContent = instruction
    ? `${playerName}'s turn — ${instruction}`
    : `${playerName}'s turn`;
}

function getCoordinates(cell) {
  const index = Number(cell.dataset.index);

  return {
    row: Math.floor(index / BOARD_COLS),
    col: index % BOARD_COLS,
  };
}

function getCell(row, col) {
  if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
    return null;
  }

  return board.querySelector(`[data-index="${row * BOARD_COLS + col}"]`);
}

function updateCellLabel(cell) {
  const { row, col } = getCoordinates(cell);
  const piece = cell.querySelector(".piece");
  const pieceDescription = piece
    ? `${piece.classList.contains("piece--king") ? "king " : ""}${piece.dataset.color} piece, `
    : "";

  cell.setAttribute(
    "aria-label",
    `${pieceDescription}row ${row + 1}, column ${col + 1}`,
  );
}

function getMovementDirections(piece) {
  const forwardDirection = piece.dataset.color === "black" ? 1 : -1;
  const forwardDirections = [
    [forwardDirection, -1],
    [forwardDirection, 1],
  ];

  if (!piece.classList.contains("piece--king")) {
    return forwardDirections;
  }

  return [
    ...forwardDirections,
    [-forwardDirection, -1],
    [-forwardDirection, 1],
  ];
}

function getJumpOptions(cell) {
  const piece = cell.querySelector(".piece");

  if (!piece) {
    return [];
  }

  const { row, col } = getCoordinates(cell);
  const directions = getMovementDirections(piece);

  return directions.flatMap(([rowDirection, colDirection]) => {
    const capturedCell = getCell(row + rowDirection, col + colDirection);
    const destination = getCell(
      row + rowDirection * 2,
      col + colDirection * 2,
    );
    const capturedPiece = capturedCell?.querySelector(".piece");

    if (
      capturedPiece &&
      capturedPiece.dataset.color !== piece.dataset.color &&
      destination &&
      !destination.querySelector(".piece")
    ) {
      return [{ capturedCell, destination }];
    }

    return [];
  });
}

function getJumpingCells() {
  return [...board.querySelectorAll(".cell")].filter((cell) => {
    const piece = cell.querySelector(".piece");

    return (
      piece?.dataset.color === currentPlayer &&
      getJumpOptions(cell).length > 0
    );
  });
}

function hasNormalMove(cell) {
  const piece = cell.querySelector(".piece");
  const { row, col } = getCoordinates(cell);

  return getMovementDirections(piece).some(
    ([rowDirection, colDirection]) => {
      const destination = getCell(row + rowDirection, col + colDirection);
      return destination && !destination.querySelector(".piece");
    },
  );
}

function hasAnyLegalMove(player) {
  const playerCells = [...board.querySelectorAll(".cell")].filter(
    (cell) => cell.querySelector(".piece")?.dataset.color === player,
  );

  return playerCells.some(
    (cell) => getJumpOptions(cell).length > 0 || hasNormalMove(cell),
  );
}

function selectCell(cell) {
  selectedCell?.classList.remove("cell--selected");
  selectedCell = cell;
  selectedCell.classList.add("cell--selected");
}

function isDiagonalMove(origin, destination) {
  const originCoordinates = getCoordinates(origin);
  const destinationCoordinates = getCoordinates(destination);
  const piece = origin.querySelector(".piece");
  const rowChange = destinationCoordinates.row - originCoordinates.row;
  const colChange = destinationCoordinates.col - originCoordinates.col;
  const allowedDirections = getMovementDirections(piece);

  return allowedDirections.some(
    ([rowDirection, colDirection]) =>
      rowChange === rowDirection && colChange === colDirection,
  );
}

function promotePiece(cell) {
  const piece = cell.querySelector(".piece");
  const { row } = getCoordinates(cell);
  const promotionRow = piece.dataset.color === "black" ? BOARD_ROWS - 1 : 0;

  if (row === promotionRow && !piece.classList.contains("piece--king")) {
    piece.classList.add("piece--king");
    piece.textContent = "KING";
  }
}

function launchConfetti() {
  document.querySelector(".confetti")?.remove();

  const colors = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#a855f7"];
  const confetti = document.createElement("div");
  confetti.className = "confetti";
  confetti.setAttribute("aria-hidden", "true");

  for (let index = 0; index < 100; index += 1) {
    const particle = document.createElement("span");
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.backgroundColor = colors[index % colors.length];
    particle.style.animationDelay = `${Math.random() * 0.8}s`;
    particle.style.animationDuration = `${2.5 + Math.random() * 2}s`;
    particle.style.setProperty("--drift", `${Math.random() * 30 - 15}vw`);
    particle.style.setProperty("--spin", `${Math.random() * 720 - 360}deg`);
    confetti.append(particle);
  }

  document.body.append(confetti);
  window.setTimeout(() => confetti.remove(), 5000);
}

function declareWinner(winnerColor, reason = "") {
  const winner = winnerColor[0].toUpperCase() + winnerColor.slice(1);
  selectedCell?.classList.remove("cell--selected");
  selectedCell = null;
  mustContinueJump = false;
  gameOver = true;
  status.textContent = reason
    ? `${winner} wins! ${reason}`
    : `${winner} wins!`;
  launchConfetti();
}

function checkForWinner() {
  const opponent = currentPlayer === "black" ? "white" : "black";
  const opponentPieces = board.querySelectorAll(`.piece--${opponent}`);

  if (opponentPieces.length > 0) {
    return false;
  }

  declareWinner(currentPlayer);
  return true;
}

function finishTurn() {
  selectedCell?.classList.remove("cell--selected");
  selectedCell = null;
  mustContinueJump = false;
  currentPlayer = currentPlayer === "black" ? "white" : "black";

  if (!hasAnyLegalMove(currentPlayer)) {
    const winner = currentPlayer === "black" ? "white" : "black";
    const blockedPlayer =
      currentPlayer[0].toUpperCase() + currentPlayer.slice(1);
    declareWinner(winner, `${blockedPlayer} has no valid moves.`);
    return;
  }

  updateStatus(getJumpingCells().length ? "a jump is required" : "");
}

function moveSelectedPiece(destination, capturedCell = null) {
  const origin = selectedCell;
  destination.append(selectedCell.querySelector(".piece"));
  origin.classList.remove("cell--selected");
  promotePiece(destination);

  if (capturedCell) {
    capturedCell.querySelector(".piece").remove();
    updateCellLabel(capturedCell);
  }

  updateCellLabel(origin);
  updateCellLabel(destination);

  if (capturedCell && checkForWinner()) {
    return;
  }

  if (capturedCell && getJumpOptions(destination).length > 0) {
    selectedCell = destination;
    selectedCell.classList.add("cell--selected");
    mustContinueJump = true;
    updateStatus("continue jumping with the selected piece");
    return;
  }

  finishTurn();
}

function handleBoardClick(event) {
  if (gameOver) {
    return;
  }

  const cell = event.target.closest(".cell");

  if (!cell) {
    return;
  }

  const piece = cell.querySelector(".piece");
  const jumpingCells = getJumpingCells();

  if (piece?.dataset.color === currentPlayer) {
    if (mustContinueJump && cell !== selectedCell) {
      updateStatus("continue jumping with the selected piece");
      return;
    }

    if (jumpingCells.length > 0 && !jumpingCells.includes(cell)) {
      updateStatus("a jump is required");
      return;
    }

    selectCell(cell);
    return;
  }

  if (!selectedCell || piece || !cell.classList.contains("cell--dark")) {
    return;
  }

  const jump = getJumpOptions(selectedCell).find(
    (option) => option.destination === cell,
  );

  if (jump) {
    moveSelectedPiece(cell, jump.capturedCell);
    return;
  }

  if (mustContinueJump || jumpingCells.length > 0) {
    updateStatus(
      mustContinueJump
        ? "continue jumping with the selected piece"
        : "a jump is required",
    );
    return;
  }

  if (isDiagonalMove(selectedCell, cell)) {
    moveSelectedPiece(cell);
  }
}

function createBoard() {
  board.replaceChildren();
  currentPlayer = "black";
  selectedCell = null;
  mustContinueJump = false;
  gameOver = false;
  document.querySelector(".confetti")?.remove();

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

  updateStatus(getJumpingCells().length ? "a jump is required" : "");
}

board.addEventListener("click", handleBoardClick);
resetButton.addEventListener("click", createBoard);

createBoard();
