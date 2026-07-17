/*
 * King in the North — Rules Engine (pure logic, no DOM)
 * ------------------------------------------------------
 * Classic 8x8 checkers/draughts rules:
 *  - Men move diagonally forward one square onto an empty dark square.
 *  - Capture by jumping an adjacent opponent onto the empty square beyond.
 *  - Captures are forced; multi-jumps continue from the landing square.
 *  - A man reaching the far back row is crowned King (ends the turn).
 *  - Kings move & capture in all four diagonal directions.
 *
 * Board convention:
 *  - board[row][col], row 0 = top, row 7 = bottom.
 *  - Playable (dark) squares satisfy (row + col) % 2 === 1
 *    => the lower-left square (7,0) is dark, per the brief.
 *  - White starts on rows 0..2 (top) and moves DOWN (+row).
 *  - Black starts on rows 5..7 (bottom) and moves UP (-row).
 *  - Black is crowned on row 0; White is crowned on row 7.
 *
 * This module is environment-agnostic: it attaches to `window.KITNEngine`
 * in the browser and exports via `module.exports` under Node (for tests).
 */
(function (global) {
  'use strict';

  var SIZE = 8;

  function isDark(r, c) { return (r + c) % 2 === 1; }
  function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

  function cloneBoard(b) {
    return b.map(function (row) {
      return row.map(function (cell) {
        return cell ? { color: cell.color, king: cell.king } : null;
      });
    });
  }

  function initialBoard() {
    var b = [];
    for (var r = 0; r < SIZE; r++) {
      var row = [];
      for (var c = 0; c < SIZE; c++) {
        if (isDark(r, c) && r <= 2) row.push({ color: 'white', king: false });
        else if (isDark(r, c) && r >= 5) row.push({ color: 'black', king: false });
        else row.push(null);
      }
      b.push(row);
    }
    return b;
  }

  // Diagonal directions a piece may travel. Men: forward only. Kings: all four.
  function directionsFor(piece) {
    if (piece.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    return piece.color === 'black' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  }

  // Simple (non-capturing) moves for the piece at (r,c).
  function getSteps(b, r, c) {
    var p = b[r][c];
    if (!p) return [];
    var res = [];
    directionsFor(p).forEach(function (d) {
      var nr = r + d[0], nc = c + d[1];
      if (inBounds(nr, nc) && !b[nr][nc]) {
        res.push({ from: [r, c], to: [nr, nc], capture: false });
      }
    });
    return res;
  }

  // Capturing jumps for the piece at (r,c).
  function getJumps(b, r, c) {
    var p = b[r][c];
    if (!p) return [];
    var res = [];
    directionsFor(p).forEach(function (d) {
      var mr = r + d[0], mc = c + d[1];        // square being jumped
      var nr = r + 2 * d[0], nc = c + 2 * d[1]; // landing square
      if (!inBounds(nr, nc)) return;
      var mid = b[mr][mc];
      if (mid && mid.color !== p.color && !b[nr][nc]) {
        res.push({ from: [r, c], to: [nr, nc], captured: [mr, mc], capture: true });
      }
    });
    return res;
  }

  // Does `color` have at least one available capture anywhere?
  function colorHasCapture(b, color) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var p = b[r][c];
        if (p && p.color === color && getJumps(b, r, c).length) return true;
      }
    }
    return false;
  }

  // All legal moves for `color`, honouring the forced-capture rule:
  // if any capture exists, only captures are legal.
  function allLegalMoves(b, color) {
    var must = colorHasCapture(b, color);
    var moves = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var p = b[r][c];
        if (!p || p.color !== color) continue;
        var list = must ? getJumps(b, r, c) : getSteps(b, r, c);
        for (var i = 0; i < list.length; i++) moves.push(list[i]);
      }
    }
    return moves;
  }

  // Every coordinate for `color` that currently has a capture (UI highlight).
  function capturingPieces(b, color) {
    var out = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var p = b[r][c];
        if (p && p.color === color && getJumps(b, r, c).length) out.push([r, c]);
      }
    }
    return out;
  }

  function shouldCrown(piece, r) {
    if (piece.king) return false;
    return (piece.color === 'black' && r === 0) ||
           (piece.color === 'white' && r === SIZE - 1);
  }

  // Applies a step or single jump, mutating the board. Returns {crowned}.
  function applyMove(b, move) {
    var fr = move.from[0], fc = move.from[1];
    var tr = move.to[0], tc = move.to[1];
    var piece = b[fr][fc];
    b[fr][fc] = null;
    if (move.captured) b[move.captured[0]][move.captured[1]] = null;
    var crowned = false;
    if (shouldCrown(piece, tr)) { piece.king = true; crowned = true; }
    b[tr][tc] = piece;
    return { crowned: crowned };
  }

  function countPieces(b, color) {
    var n = 0;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (b[r][c] && b[r][c].color === color) n++;
      }
    }
    return n;
  }

  // Given whose turn it is, returns the winning color if the game is over,
  // else null. A side loses when it has no pieces or no legal moves.
  function checkWinner(b, sideToMove) {
    var other = sideToMove === 'black' ? 'white' : 'black';
    if (countPieces(b, sideToMove) === 0) return other;
    if (allLegalMoves(b, sideToMove).length === 0) return other;
    return null;
  }

  var engine = {
    SIZE: SIZE,
    isDark: isDark,
    inBounds: inBounds,
    cloneBoard: cloneBoard,
    initialBoard: initialBoard,
    directionsFor: directionsFor,
    getSteps: getSteps,
    getJumps: getJumps,
    colorHasCapture: colorHasCapture,
    allLegalMoves: allLegalMoves,
    capturingPieces: capturingPieces,
    shouldCrown: shouldCrown,
    applyMove: applyMove,
    countPieces: countPieces,
    checkWinner: checkWinner
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  else global.KITNEngine = engine;
})(typeof window !== 'undefined' ? window : this);
