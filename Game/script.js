const board = document.querySelector("#board");
const resetButton = document.querySelector("#reset-button");
const status = document.querySelector("#status");

const BOARD_SIZE = 9;

function createBoard() {
  board.replaceChildren();

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.type = "button";
    cell.dataset.index = index;
    cell.setAttribute("aria-label", `Board cell ${index + 1}`);
    board.append(cell);
  }

  status.textContent = "Game ready";
}

resetButton.addEventListener("click", createBoard);

createBoard();
