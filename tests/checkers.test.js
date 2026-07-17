import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PIECE_TYPES, PLAYERS } from '../js/constants.js';
import {
  applyMove,
  cloneBoard,
  countPieces,
  createEmptyBoard,
  createInitialBoard,
  createInitialState,
  getAllCaptures,
  getCapturesFrom,
  getLegalMoves,
  getLegalMovesFrom,
  getQuietMovesFrom,
  getWinner,
  handleSquareAction,
  moveSelectedTo,
  resetGame,
  selectSquare,
  suggestMove,
} from '../js/checkers.js';
import {
  createDefaultSettings,
  getInitials,
  normalizeSettings,
  saveSettings,
} from '../js/players.js';

function place(board, row, col, player, type = PIECE_TYPES.MAN) {
  board[row][col] = { player, type };
}

describe('setup', () => {
  it('creates an 8×8 board with 12 pieces per side on dark squares', () => {
    const board = createInitialBoard();

    assert.equal(board.length, 8);
    assert.equal(board[0].length, 8);
    assert.equal(countPieces(board, PLAYERS.RED), 12);
    assert.equal(countPieces(board, PLAYERS.BLACK), 12);

    let darkOccupied = 0;
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        if (board[row][col]) {
          assert.equal((row + col) % 2, 1);
          darkOccupied += 1;
        }
      }
    }
    assert.equal(darkOccupied, 24);
  });

  it('starts with black to move', () => {
    const state = createInitialState();
    assert.equal(state.currentPlayer, PLAYERS.BLACK);
    assert.equal(state.winner, null);
  });

  it('accepts a configured first player', () => {
    const state = createInitialState({ firstPlayer: PLAYERS.RED });
    assert.equal(state.currentPlayer, PLAYERS.RED);
    assert.match(state.status, /Red to move/i);

    const reset = resetGame({ firstPlayer: PLAYERS.RED });
    assert.equal(reset.currentPlayer, PLAYERS.RED);
  });
});

describe('basic moves', () => {
  it('allows men to move diagonally forward onto empty dark squares only', () => {
    const board = createEmptyBoard();
    place(board, 5, 0, PLAYERS.BLACK);

    const moves = getQuietMovesFrom(board, { row: 5, col: 0 }, board[5][0]);
    assert.deepEqual(
      moves.map((move) => move.to).sort((a, b) => a.col - b.col),
      [{ row: 4, col: 1 }],
    );
  });

  it('does not allow men to move backward', () => {
    const board = createEmptyBoard();
    place(board, 4, 1, PLAYERS.BLACK);

    const moves = getQuietMovesFrom(board, { row: 4, col: 1 }, board[4][1]);
    assert.ok(moves.every((move) => move.to.row < 4));
  });
});

describe('captures', () => {
  it('allows jumping an adjacent enemy into an empty square beyond', () => {
    const board = createEmptyBoard();
    place(board, 5, 2, PLAYERS.BLACK);
    place(board, 4, 3, PLAYERS.RED);

    const captures = getCapturesFrom(board, { row: 5, col: 2 }, board[5][2]);
    assert.equal(captures.length, 1);
    assert.deepEqual(captures[0].to, { row: 3, col: 4 });
    assert.deepEqual(captures[0].captured, { row: 4, col: 3 });
  });

  it('removes the jumped piece when a capture is applied', () => {
    const board = createEmptyBoard();
    place(board, 5, 2, PLAYERS.BLACK);
    place(board, 4, 3, PLAYERS.RED);

    const [capture] = getCapturesFrom(board, { row: 5, col: 2 }, board[5][2]);
    const { board: next } = applyMove(board, capture);

    assert.equal(next[4][3], null);
    assert.equal(next[5][2], null);
    assert.equal(next[3][4]?.player, PLAYERS.BLACK);
  });

  it('makes captures mandatory when any jump is available', () => {
    const board = createEmptyBoard();
    place(board, 5, 0, PLAYERS.BLACK);
    place(board, 5, 2, PLAYERS.BLACK);
    place(board, 4, 3, PLAYERS.RED);

    const legal = getLegalMoves(board, PLAYERS.BLACK);
    assert.ok(legal.length > 0);
    assert.ok(legal.every((move) => move.captured));
    assert.ok(
      !legal.some((move) => move.from.row === 5 && move.from.col === 0),
    );
  });
});

describe('multi-jumps', () => {
  it('requires continuing with the same piece when another jump is available', () => {
    const board = createEmptyBoard();
    place(board, 5, 0, PLAYERS.BLACK);
    place(board, 4, 1, PLAYERS.RED);
    place(board, 2, 3, PLAYERS.RED);

    let state = {
      ...createInitialState(),
      board,
      currentPlayer: PLAYERS.BLACK,
      status: 'Black to move',
    };

    state = selectSquare(state, { row: 5, col: 0 });
    state = moveSelectedTo(state, { row: 3, col: 2 });

    assert.ok(state.forcedPiece);
    assert.deepEqual(state.forcedPiece, { row: 3, col: 2 });
    assert.equal(state.currentPlayer, PLAYERS.BLACK);
    assert.equal(state.board[4][1], null);
    assert.ok(state.board[2][3]);

    const continued = getLegalMoves(
      state.board,
      state.currentPlayer,
      state.forcedPiece,
    );
    assert.equal(continued.length, 1);
    assert.deepEqual(continued[0].to, { row: 1, col: 4 });
  });
});

describe('kings', () => {
  it('crowns a man that reaches the opposite back row', () => {
    const board = createEmptyBoard();
    place(board, 1, 2, PLAYERS.BLACK);

    const move = {
      from: { row: 1, col: 2 },
      to: { row: 0, col: 3 },
      captured: null,
    };
    const { board: next, crowned } = applyMove(board, move);

    assert.equal(crowned, true);
    assert.equal(next[0][3].type, PIECE_TYPES.KING);
  });

  it('lets kings move and capture in both directions', () => {
    const board = createEmptyBoard();
    place(board, 3, 2, PLAYERS.BLACK, PIECE_TYPES.KING);
    place(board, 4, 3, PLAYERS.RED);

    const quiet = getQuietMovesFrom(board, { row: 3, col: 2 }, board[3][2]);
    assert.ok(quiet.some((move) => move.to.row === 2));
    assert.ok(quiet.some((move) => move.to.row === 4));

    const captures = getCapturesFrom(board, { row: 3, col: 2 }, board[3][2]);
    assert.ok(
      captures.some(
        (move) => move.to.row === 5 && move.to.col === 4 && move.captured,
      ),
    );
  });

  it('continues a multi-jump after crowning when another jump exists', () => {
    // Black man on row 2 captures onto king row, then can capture backward as king.
    const board = createEmptyBoard();
    place(board, 2, 1, PLAYERS.BLACK);
    place(board, 1, 2, PLAYERS.RED);
    place(board, 1, 4, PLAYERS.RED);

    const [firstJump] = getCapturesFrom(board, { row: 2, col: 1 }, board[2][1]);
    assert.deepEqual(firstJump.to, { row: 0, col: 3 });

    const { board: next, crowned, continuedCaptures } = applyMove(
      board,
      firstJump,
    );

    assert.equal(crowned, true);
    assert.equal(next[0][3].type, PIECE_TYPES.KING);
    assert.ok(continuedCaptures.length >= 1);
    assert.ok(
      continuedCaptures.some(
        (move) => move.to.row === 2 && move.to.col === 5,
      ),
    );
  });
});

describe('winning', () => {
  it('wins by capturing all opponent pieces', () => {
    const board = createEmptyBoard();
    place(board, 5, 2, PLAYERS.BLACK);
    place(board, 4, 3, PLAYERS.RED);

    const [capture] = getCapturesFrom(board, { row: 5, col: 2 }, board[5][2]);
    const { board: next } = applyMove(board, capture);

    assert.equal(countPieces(next, PLAYERS.RED), 0);
    assert.equal(getWinner(next, PLAYERS.RED), PLAYERS.BLACK);
  });

  it('wins when the opponent has no legal move', () => {
    const board = createEmptyBoard();
    // Red man on the back row, hemmed in with no quiet move and no jump landing.
    place(board, 0, 1, PLAYERS.RED);
    place(board, 1, 0, PLAYERS.BLACK);
    place(board, 1, 2, PLAYERS.BLACK);
    place(board, 2, 3, PLAYERS.BLACK);

    assert.equal(getLegalMoves(board, PLAYERS.RED).length, 0);
    assert.equal(getWinner(board, PLAYERS.RED), PLAYERS.BLACK);
  });
});

describe('turn flow via UI actions', () => {
  it('switches turns after a completed non-capturing move', () => {
    let state = createInitialState();
    // Black man at (5,0) can move to (4,1)
    state = selectSquare(state, { row: 5, col: 0 });
    state = moveSelectedTo(state, { row: 4, col: 1 });

    assert.equal(state.currentPlayer, PLAYERS.RED);
    assert.equal(state.forcedPiece, null);
    assert.equal(state.selected, null);
  });

  it('rejects selecting a piece that cannot capture when captures exist', () => {
    const board = createEmptyBoard();
    place(board, 5, 0, PLAYERS.BLACK);
    place(board, 5, 2, PLAYERS.BLACK);
    place(board, 4, 3, PLAYERS.RED);

    let state = {
      ...createInitialState(),
      board,
      currentPlayer: PLAYERS.BLACK,
    };

    state = selectSquare(state, { row: 5, col: 0 });
    assert.equal(state.selected, null);
    assert.match(state.status, /must capture/i);
  });

  it('handleSquareAction moves when clicking a legal target', () => {
    const board = createEmptyBoard();
    place(board, 5, 0, PLAYERS.BLACK);
    place(board, 2, 1, PLAYERS.RED);

    let state = {
      ...createInitialState(),
      board: cloneBoard(board),
      currentPlayer: PLAYERS.BLACK,
    };

    state = handleSquareAction(state, { row: 5, col: 0 });
    state = handleSquareAction(state, { row: 4, col: 1 });

    assert.equal(state.board[4][1]?.player, PLAYERS.BLACK);
    assert.equal(state.currentPlayer, PLAYERS.RED);
    assert.equal(state.winner, null);
  });
});

describe('legal move helpers', () => {
  it('filters legal moves from a chosen square', () => {
    const board = createInitialBoard();
    const from = { row: 5, col: 0 };
    const moves = getLegalMovesFrom(board, PLAYERS.BLACK, from);
    assert.ok(moves.every((move) => move.from.row === 5 && move.from.col === 0));
  });

  it('reports all captures for a player', () => {
    const board = createEmptyBoard();
    place(board, 5, 2, PLAYERS.BLACK);
    place(board, 4, 3, PLAYERS.RED);
    place(board, 5, 6, PLAYERS.BLACK);
    place(board, 4, 5, PLAYERS.RED);

    const captures = getAllCaptures(board, PLAYERS.BLACK);
    assert.equal(captures.length, 2);
  });
});

describe('move suggestions', () => {
  it('suggests a capture when captures are mandatory', () => {
    const board = createEmptyBoard();
    place(board, 5, 0, PLAYERS.BLACK);
    place(board, 5, 2, PLAYERS.BLACK);
    place(board, 4, 3, PLAYERS.RED);

    const suggestion = suggestMove({
      board,
      currentPlayer: PLAYERS.BLACK,
      forcedPiece: null,
      winner: null,
    });

    assert.ok(suggestion);
    assert.deepEqual(suggestion.from, { row: 5, col: 2 });
    assert.deepEqual(suggestion.to, { row: 3, col: 4 });
    assert.deepEqual(suggestion.captured, { row: 4, col: 3 });
  });

  it('prefers a crowning capture over a quiet alternative when both are captures', () => {
    const board = createEmptyBoard();
    place(board, 2, 1, PLAYERS.BLACK);
    place(board, 1, 2, PLAYERS.RED);
    place(board, 2, 5, PLAYERS.BLACK);
    place(board, 1, 4, PLAYERS.RED);

    const suggestion = suggestMove({
      board,
      currentPlayer: PLAYERS.BLACK,
      forcedPiece: null,
      winner: null,
    });

    assert.ok(suggestion);
    assert.deepEqual(suggestion.from, { row: 2, col: 1 });
    assert.deepEqual(suggestion.to, { row: 0, col: 3 });
  });

  it('returns null when the game already has a winner', () => {
    const state = createInitialState();
    state.winner = PLAYERS.BLACK;
    assert.equal(suggestMove(state), null);
  });
});

describe('player settings', () => {
  it('normalizes names, palettes, and first player', () => {
    const settings = normalizeSettings({
      players: {
        black: { name: '  Ada  Lovelace ', palette: 'slate' },
        red: { name: '', palette: 'not-real' },
      },
      firstPlayer: 'red',
    });

    assert.equal(settings.players.black.name, 'Ada Lovelace');
    assert.equal(settings.players.black.palette, 'slate');
    assert.equal(settings.players.red.name, 'Player Two');
    assert.equal(settings.players.red.palette, 'crimson');
    assert.equal(settings.firstPlayer, PLAYERS.RED);
  });

  it('avoids duplicate palettes and persists through a mock store', () => {
    const memory = new Map();
    const storage = {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
    };

    const saved = saveSettings(
      {
        ...createDefaultSettings(),
        players: {
          black: { name: 'North', palette: 'crimson' },
          red: { name: 'South', palette: 'crimson' },
        },
      },
      storage,
    );

    assert.notEqual(saved.players.black.palette, saved.players.red.palette);
    assert.equal(saved.setupCompleted, true);
    assert.equal(getInitials('North Wind'), 'NW');
  });
});
