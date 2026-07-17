/**
 * DOM rendering and interaction for the checkers game.
 * All rule decisions delegate to the pure engine in checkers.js.
 */

import { BOARD_SIZE, PIECE_TYPES, PLAYERS, isDarkSquare } from './constants.js';
import {
  countPieces,
  createInitialState,
  getLegalMovesFrom,
  handleSquareAction,
  positionsEqual,
  resetGame,
} from './checkers.js';

/**
 * Mount the game UI into the given element refs.
 * @param {{
 *   boardEl: HTMLElement,
 *   statusEl: HTMLElement,
 *   turnBadgeEl: HTMLElement,
 *   countBlackEl: HTMLElement,
 *   countRedEl: HTMLElement,
 *   resetBtn: HTMLElement,
 * }} elements
 */
export function createGameUI(elements) {
  let state = createInitialState();

  function render() {
    renderBoard();
    renderStatus();
    renderCounts();
  }

  function renderBoard() {
    const { board, selected, forcedPiece, currentPlayer } = state;
    const legalTargets = selected
      ? getLegalMovesFrom(board, currentPlayer, selected, forcedPiece)
      : forcedPiece
        ? getLegalMovesFrom(board, currentPlayer, forcedPiece, forcedPiece)
        : [];

    elements.boardEl.replaceChildren();
    elements.boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const square = document.createElement('button');
        square.type = 'button';
        square.className = 'square';
        square.dataset.row = String(row);
        square.dataset.col = String(col);
        square.setAttribute('role', 'gridcell');
        square.setAttribute('aria-label', squareLabel(row, col, board[row][col]));

        const dark = isDarkSquare(row, col);
        square.classList.add(dark ? 'square--dark' : 'square--light');
        if (!dark) {
          square.tabIndex = -1;
          square.disabled = true;
        } else {
          square.tabIndex = 0;
        }

        const position = { row, col };
        if (positionsEqual(selected, position) || positionsEqual(forcedPiece, position)) {
          square.classList.add(
            forcedPiece && positionsEqual(forcedPiece, position)
              ? 'square--forced'
              : 'square--selected',
          );
        }

        const move = legalTargets.find((candidate) =>
          positionsEqual(candidate.to, position),
        );
        if (move) {
          square.classList.add(move.captured ? 'square--capture' : 'square--legal');
        }

        const piece = board[row][col];
        if (piece) {
          const pieceEl = document.createElement('span');
          pieceEl.className = `piece piece--${piece.player}`;
          pieceEl.setAttribute('aria-hidden', 'true');
          if (piece.type === PIECE_TYPES.KING) {
            pieceEl.classList.add('piece--king');
          }
          square.appendChild(pieceEl);
        }

        if (dark) {
          square.addEventListener('click', () => onSquareActivate(row, col));
          square.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSquareActivate(row, col);
            }
          });
        }

        elements.boardEl.appendChild(square);
      }
    }
  }

  function renderStatus() {
    elements.statusEl.textContent = state.status;

    if (state.winner) {
      elements.turnBadgeEl.dataset.player = 'winner';
    } else {
      elements.turnBadgeEl.dataset.player = state.currentPlayer;
    }
  }

  function renderCounts() {
    elements.countBlackEl.textContent = String(
      countPieces(state.board, PLAYERS.BLACK),
    );
    elements.countRedEl.textContent = String(
      countPieces(state.board, PLAYERS.RED),
    );
  }

  function onSquareActivate(row, col) {
    state = handleSquareAction(state, { row, col });
    render();
  }

  function onReset() {
    state = resetGame();
    render();
  }

  elements.resetBtn.addEventListener('click', onReset);

  render();

  return {
    getState: () => state,
    render,
    reset: onReset,
  };
}

function squareLabel(row, col, piece) {
  const file = String.fromCharCode(97 + col);
  const rank = BOARD_SIZE - row;
  const coord = `${file}${rank}`;

  if (!isDarkSquare(row, col)) {
    return `Light square ${coord}`;
  }

  if (!piece) {
    return `Empty dark square ${coord}`;
  }

  const kind = piece.type === PIECE_TYPES.KING ? 'king' : 'piece';
  return `${piece.player} ${kind} on ${coord}`;
}
