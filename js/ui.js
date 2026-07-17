/**
 * DOM rendering and interaction for the checkers game.
 * All rule decisions delegate to the pure engine in checkers.js.
 */

import { BOARD_SIZE, PIECE_TYPES, PLAYERS, isDarkSquare } from './constants.js';
import {
  countPieces,
  createInitialState,
  getLegalMovesFrom,
  getPiece,
  handleSquareAction,
  positionsEqual,
  resetGame,
  suggestMove,
} from './checkers.js';
import {
  displayNameFor,
  getInitials,
  getPalette,
  loadSettings,
  normalizeSettings,
  paletteOptions,
  saveSettings,
} from './players.js';

/**
 * Mount the game UI into the given element refs.
 */
export function createGameUI(elements) {
  let settings = loadSettings();
  let state = createInitialState({ firstPlayer: settings.firstPlayer });
  let hintedMove = null;
  let dragSession = null;
  let suppressClickUntil = 0;

  populatePaletteSelects();
  bindControls();
  applyPaletteCss();
  render();

  if (!settings.setupCompleted) {
    openSetupDialog();
  }

  return {
    getState: () => state,
    getSettings: () => settings,
    render,
    reset: onReset,
  };

  function bindControls() {
    elements.resetBtn?.addEventListener('click', onReset);
    elements.hintBtn?.addEventListener('click', onHint);
    elements.settingsBtn?.addEventListener('click', () => openSetupDialog());
    elements.setupForm?.addEventListener('submit', onSetupSubmit);
    elements.setupCancel?.addEventListener('click', () => {
      elements.setupDialog?.close('cancel');
    });
    elements.setupDialog?.addEventListener('cancel', (event) => {
      if (!settings.setupCompleted) {
        event.preventDefault();
      }
    });
  }

  function populatePaletteSelects() {
    const options = paletteOptions();
    for (const select of [
      elements.blackPaletteSelect,
      elements.redPaletteSelect,
    ]) {
      if (!select) continue;
      select.replaceChildren();
      for (const option of options) {
        const el = document.createElement('option');
        el.value = option.id;
        el.textContent = option.label;
        select.appendChild(el);
      }
    }
  }

  function render() {
    renderPlayers();
    renderBoard();
    renderStatus();
    renderHintCaption();
  }

  function renderPlayers() {
    for (const side of [PLAYERS.BLACK, PLAYERS.RED]) {
      const name = displayNameFor(settings, side);
      const palette = getPalette(settings.players[side].palette);
      const nameEl = side === PLAYERS.BLACK ? elements.nameBlack : elements.nameRed;
      const avatarEl =
        side === PLAYERS.BLACK ? elements.avatarBlack : elements.avatarRed;
      const labelEl =
        side === PLAYERS.BLACK ? elements.labelBlack : elements.labelRed;
      const cardEl = side === PLAYERS.BLACK ? elements.cardBlack : elements.cardRed;
      const countEl =
        side === PLAYERS.BLACK ? elements.countBlackEl : elements.countRedEl;

      if (nameEl) nameEl.textContent = name;
      if (labelEl) labelEl.textContent = name;
      if (avatarEl) {
        avatarEl.textContent = getInitials(name);
        avatarEl.style.setProperty('--avatar-base', palette.base);
        avatarEl.style.setProperty('--avatar-highlight', palette.highlight);
      }
      if (countEl) {
        countEl.textContent = String(countPieces(state.board, side));
      }
      if (cardEl) {
        const isActive =
          !state.winner && state.currentPlayer === side;
        const isWinner = state.winner === side;
        cardEl.classList.toggle('player-card--active', isActive);
        cardEl.classList.toggle('player-card--winner', isWinner);
        const turnEl = cardEl.querySelector('.player-card__turn');
        if (turnEl) {
          turnEl.hidden = !(isActive || isWinner);
          turnEl.textContent = isWinner ? 'Winner' : 'To move';
        }
      }
    }
  }

  function renderBoard() {
    const { board, selected, forcedPiece, currentPlayer } = state;
    const focusPosition = selected || forcedPiece;
    const legalTargets = focusPosition
      ? getLegalMovesFrom(board, currentPlayer, focusPosition, forcedPiece)
      : [];

    const previousFocus = document.activeElement;
    const previousKey =
      previousFocus instanceof HTMLElement
        ? previousFocus.dataset.row != null
          ? `${previousFocus.dataset.row},${previousFocus.dataset.col}`
          : null
        : null;

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
        square.setAttribute(
          'aria-label',
          squareLabel(row, col, board[row][col], settings),
        );

        const dark = isDarkSquare(row, col);
        square.classList.add(dark ? 'square--dark' : 'square--light');
        if (!dark) {
          square.tabIndex = -1;
          square.disabled = true;
        } else {
          square.tabIndex = 0;
        }

        const position = { row, col };
        if (
          positionsEqual(selected, position) ||
          positionsEqual(forcedPiece, position)
        ) {
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
          square.classList.add(
            move.captured ? 'square--capture' : 'square--legal',
          );
        }

        if (hintedMove) {
          if (positionsEqual(hintedMove.from, position)) {
            square.classList.add('square--hint-from');
          }
          if (positionsEqual(hintedMove.to, position)) {
            square.classList.add('square--hint-to');
          }
        }

        const piece = board[row][col];
        if (piece) {
          const pieceEl = document.createElement('span');
          const palette = getPalette(settings.players[piece.player].palette);
          pieceEl.className = `piece piece--${piece.player}`;
          pieceEl.dataset.side = piece.player;
          pieceEl.style.setProperty('--piece-base', palette.base);
          pieceEl.style.setProperty('--piece-highlight', palette.highlight);
          pieceEl.style.setProperty('--piece-edge', palette.edge);
          pieceEl.setAttribute('aria-hidden', 'true');
          if (piece.type === PIECE_TYPES.KING) {
            pieceEl.classList.add('piece--king');
          }

          const canDrag =
            !state.winner &&
            piece.player === currentPlayer &&
            (!forcedPiece || positionsEqual(forcedPiece, position)) &&
            getLegalMovesFrom(board, currentPlayer, position, forcedPiece)
              .length > 0;

          if (canDrag) {
            pieceEl.classList.add('piece--draggable');
            square.addEventListener('pointerdown', (event) => {
              if (event.button != null && event.button !== 0) return;
              beginDrag(event, position, pieceEl);
            });
          }

          square.appendChild(pieceEl);
        }

        if (dark) {
          square.addEventListener('click', () => {
            if (Date.now() < suppressClickUntil) return;
            onSquareActivate(row, col);
          });
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

    if (previousKey) {
      const [r, c] = previousKey.split(',');
      const nextFocus = elements.boardEl.querySelector(
        `[data-row="${r}"][data-col="${c}"]`,
      );
      if (nextFocus instanceof HTMLElement && !nextFocus.disabled) {
        nextFocus.focus({ preventScroll: true });
      }
    }
  }

  function renderStatus() {
    const status = personalizeStatus(state.status, settings);
    if (elements.statusEl) elements.statusEl.textContent = status;

    if (!elements.turnBadgeEl) return;
    if (state.winner) {
      elements.turnBadgeEl.dataset.player = 'winner';
    } else {
      elements.turnBadgeEl.dataset.player = state.currentPlayer;
    }

    const palette = getPalette(
      settings.players[state.winner ?? state.currentPlayer]?.palette ?? 'onyx',
    );
    elements.turnBadgeEl.style.setProperty('--badge-base', palette.base);
    elements.turnBadgeEl.style.setProperty(
      '--badge-highlight',
      palette.highlight,
    );
  }

  function renderHintCaption() {
    if (!elements.hintCaption) return;
    if (!hintedMove) {
      elements.hintCaption.hidden = true;
      elements.hintCaption.textContent = '';
      return;
    }

    const from = coordLabel(hintedMove.from.row, hintedMove.from.col);
    const to = coordLabel(hintedMove.to.row, hintedMove.to.col);
    const verb = hintedMove.captured ? 'Capture' : 'Move';
    elements.hintCaption.hidden = false;
    elements.hintCaption.textContent = `Hint: ${verb} ${from} → ${to}`;
  }

  function applyPaletteCss() {
    const root = document.documentElement;
    for (const side of [PLAYERS.BLACK, PLAYERS.RED]) {
      const palette = getPalette(settings.players[side].palette);
      root.style.setProperty(`--${side}-base`, palette.base);
      root.style.setProperty(`--${side}-highlight`, palette.highlight);
      root.style.setProperty(`--${side}-edge`, palette.edge);
    }
  }

  function onSquareActivate(row, col) {
    const next = handleSquareAction(state, { row, col });
    const moved =
      next.board !== state.board ||
      next.currentPlayer !== state.currentPlayer ||
      next.forcedPiece !== state.forcedPiece;
    state = next;
    if (moved) hintedMove = null;
    render();
  }

  function onHint() {
    if (state.winner) return;
    hintedMove = suggestMove(state);
    if (!hintedMove) {
      state = {
        ...state,
        status: 'No legal moves to suggest',
      };
    }
    render();
  }

  function onReset() {
    hintedMove = null;
    state = resetGame({ firstPlayer: settings.firstPlayer });
    render();
  }

  function openSetupDialog() {
    if (!elements.setupDialog) return;
    fillSetupForm();
    if (typeof elements.setupDialog.showModal === 'function') {
      elements.setupDialog.showModal();
    } else {
      elements.setupDialog.setAttribute('open', '');
    }
    elements.blackNameInput?.focus();
  }

  function fillSetupForm() {
    if (elements.blackNameInput) {
      elements.blackNameInput.value = settings.players[PLAYERS.BLACK].name;
    }
    if (elements.redNameInput) {
      elements.redNameInput.value = settings.players[PLAYERS.RED].name;
    }
    if (elements.blackPaletteSelect) {
      elements.blackPaletteSelect.value =
        settings.players[PLAYERS.BLACK].palette;
    }
    if (elements.redPaletteSelect) {
      elements.redPaletteSelect.value = settings.players[PLAYERS.RED].palette;
    }
    const first =
      settings.firstPlayer === PLAYERS.RED
        ? elements.firstRed
        : elements.firstBlack;
    if (first) first.checked = true;
    if (elements.setupError) {
      elements.setupError.hidden = true;
      elements.setupError.textContent = '';
    }
    if (elements.setupCancel) {
      elements.setupCancel.hidden = !settings.setupCompleted;
    }
  }

  function onSetupSubmit(event) {
    event.preventDefault();
    const blackName = elements.blackNameInput?.value ?? '';
    const redName = elements.redNameInput?.value ?? '';
    const blackPalette = elements.blackPaletteSelect?.value ?? 'onyx';
    const redPalette = elements.redPaletteSelect?.value ?? 'crimson';
    const firstRadio = elements.setupForm?.querySelector(
      'input[name="firstPlayer"]:checked',
    );
    const firstPlayer = firstRadio?.value ?? PLAYERS.BLACK;

    if (blackPalette === redPalette) {
      if (elements.setupError) {
        elements.setupError.hidden = false;
        elements.setupError.textContent =
          'Choose different piece colors for each player.';
      }
      return;
    }

    settings = saveSettings({
      players: {
        [PLAYERS.BLACK]: { name: blackName, palette: blackPalette },
        [PLAYERS.RED]: { name: redName, palette: redPalette },
      },
      firstPlayer,
      setupCompleted: true,
    });
    applyPaletteCss();
    elements.setupDialog?.close('save');
    onReset();
  }

  function beginDrag(event, from, pieceEl) {
    if (dragSession) return;

    const piece = getPiece(state.board, from);
    if (!piece) return;

    event.preventDefault();
    const ghost = elements.dragGhost;
    if (!ghost) return;

    const rect = pieceEl.getBoundingClientRect();
    ghost.hidden = false;
    ghost.className = `drag-ghost piece piece--${piece.player}${
      piece.type === PIECE_TYPES.KING ? ' piece--king' : ''
    }`;
    const palette = getPalette(settings.players[piece.player].palette);
    ghost.style.setProperty('--piece-base', palette.base);
    ghost.style.setProperty('--piece-highlight', palette.highlight);
    ghost.style.setProperty('--piece-edge', palette.edge);
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;

    dragSession = {
      from,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };

    pieceEl.classList.add('piece--dragging-source');
    moveGhost(event.clientX, event.clientY);

    // Select the piece so legal targets appear while dragging.
    state = handleSquareAction(state, from);
    hintedMove = null;
    render();
    const sourceSquare = elements.boardEl.querySelector(
      `[data-row="${from.row}"][data-col="${from.col}"] .piece`,
    );
    sourceSquare?.classList.add('piece--dragging-source');
    markDropTargets(true);

    const onMove = (moveEvent) => {
      if (!dragSession || moveEvent.pointerId !== dragSession.pointerId) return;
      dragSession.moved = true;
      moveGhost(moveEvent.clientX, moveEvent.clientY);
      highlightDropAt(moveEvent.clientX, moveEvent.clientY);
    };

    const onUp = (upEvent) => {
      if (!dragSession || upEvent.pointerId !== dragSession.pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      endDrag(upEvent.clientX, upEvent.clientY);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function moveGhost(clientX, clientY) {
    const ghost = elements.dragGhost;
    if (!ghost || !dragSession) return;
    ghost.style.transform = `translate(${clientX - dragSession.offsetX}px, ${
      clientY - dragSession.offsetY
    }px)`;
  }

  function markDropTargets(active) {
    elements.boardEl
      .querySelectorAll('.square--legal, .square--capture')
      .forEach((square) => {
        square.classList.toggle('square--droppable', active);
      });
  }

  function highlightDropAt(clientX, clientY) {
    elements.boardEl
      .querySelectorAll('.square--drop-hover')
      .forEach((el) => el.classList.remove('square--drop-hover'));

    const target = squareFromPoint(clientX, clientY);
    if (target?.classList.contains('square--droppable')) {
      target.classList.add('square--drop-hover');
    }
  }

  function endDrag(clientX, clientY) {
    const session = dragSession;
    dragSession = null;
    const ghost = elements.dragGhost;
    if (ghost) ghost.hidden = true;

    markDropTargets(false);
    elements.boardEl
      .querySelectorAll('.square--drop-hover, .piece--dragging-source')
      .forEach((el) => {
        el.classList.remove('square--drop-hover', 'piece--dragging-source');
      });

    if (!session) return;

    if (!session.moved) {
      // Treat as a normal click-select; board already selected the piece.
      render();
      return;
    }

    suppressClickUntil = Date.now() + 250;
    const target = squareFromPoint(clientX, clientY);
    if (!target) {
      render();
      return;
    }

    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    onSquareActivate(row, col);
  }

  function squareFromPoint(clientX, clientY) {
    const stack = document.elementsFromPoint(clientX, clientY);
    for (const node of stack) {
      if (!(node instanceof HTMLElement)) continue;
      const square = node.closest('.square');
      if (square && elements.boardEl.contains(square)) return square;
    }
    return null;
  }
}

function coordLabel(row, col) {
  const file = String.fromCharCode(97 + col);
  const rank = BOARD_SIZE - row;
  return `${file}${rank}`;
}

function squareLabel(row, col, piece, settings) {
  const coord = coordLabel(row, col);

  if (!isDarkSquare(row, col)) {
    return `Light square ${coord}`;
  }

  if (!piece) {
    return `Empty dark square ${coord}`;
  }

  const owner = displayNameFor(settings, piece.player);
  const kind = piece.type === PIECE_TYPES.KING ? 'king' : 'piece';
  return `${owner}'s ${kind} on ${coord}`;
}

function personalizeStatus(status, settings) {
  let text = status;
  for (const side of [PLAYERS.BLACK, PLAYERS.RED]) {
    const name = displayNameFor(settings, side);
    const sideLabel = side.charAt(0).toUpperCase() + side.slice(1);
    text = text.replaceAll(sideLabel, name);
  }
  return text;
}
