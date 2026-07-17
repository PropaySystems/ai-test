window.Checkers = window.Checkers || {};

(function (Checkers) {
  function Game() {
    this.board = new Checkers.Board();
    this.moveGenerator = new Checkers.MoveGenerator(this.board);
    this.moveValidator = new Checkers.MoveValidator(this.moveGenerator);
    this.reset();
  }

  Game.prototype.reset = function () {
    this.board.setupInitialPosition();
    this.currentPlayer = Checkers.PLAYER.WHITE;
    this.winner = null;
    this.forcedJumpSquare = null;
    this._jumpPathNotation = [];
    this.history = [];
    this.statusMessage = Checkers.PLAYER_LABEL[this.currentPlayer] + ' to move';
  };

  Object.defineProperty(Game.prototype, 'isGameOver', {
    get: function () {
      return this.winner != null;
    },
  });

  Game.prototype.getLegalMoves = function () {
    if (this.isGameOver) return [];
    return this.moveGenerator.getLegalMoves(this.currentPlayer, this.forcedJumpSquare);
  };

  Game.prototype.getLegalMovesFrom = function (from) {
    return this.getLegalMoves().filter(function (move) {
      return move.from.row === from.row && move.from.col === from.col;
    });
  };

  Game.prototype.getSelectableSquares = function () {
    var moves = this.getLegalMoves();
    var seen = {};
    var squares = [];
    for (var i = 0; i < moves.length; i += 1) {
      var move = moves[i];
      var key = move.from.row + ',' + move.from.col;
      if (!seen[key]) {
        seen[key] = true;
        squares.push({ row: move.from.row, col: move.from.col });
      }
    }
    return squares;
  };

  Game.prototype.applyMove = function (from, to) {
    if (this.isGameOver) {
      return { ok: false, error: 'Game is over. Start a new game to play again.' };
    }

    if (this.forcedJumpSquare && !Checkers.sameSquare(from, this.forcedJumpSquare)) {
      return {
        ok: false,
        error:
          'You must continue capturing with the piece on ' +
          Checkers.toAlgebraic(this.forcedJumpSquare.row, this.forcedJumpSquare.col) +
          '.',
      };
    }

    var piece = this.board.getPieceAt(from);
    if (!piece) {
      return { ok: false, error: 'No piece on the selected square.' };
    }
    if (piece.color !== this.currentPlayer) {
      return { ok: false, error: 'You can only move your own pieces.' };
    }

    var move = this.moveValidator.findLegalMove(
      this.currentPlayer,
      from,
      to,
      this.forcedJumpSquare,
    );
    if (!move) {
      return { ok: false, error: 'Illegal move.' };
    }

    var wasCapture = move.isCapture;
    this.board.movePiece(move.from, move.to);

    if (move.captured) {
      this.board.removePiece(move.captured);
    }

    var promoted = false;
    var landed = this.board.getPieceAt(move.to);
    if (landed && !landed.isKing && move.to.row === Checkers.KING_ROW[landed.color]) {
      landed.promote();
      promoted = true;
    }

    if (wasCapture) {
      if (this._jumpPathNotation.length === 0) {
        this._jumpPathNotation.push(Checkers.toAlgebraic(move.from.row, move.from.col));
      }
      this._jumpPathNotation.push(Checkers.toAlgebraic(move.to.row, move.to.col));
    }

    if (wasCapture && !promoted) {
      var further = this.moveGenerator.getCapturesFrom(move.to);
      if (further.length > 0) {
        this.forcedJumpSquare = { row: move.to.row, col: move.to.col };
        this.statusMessage =
          Checkers.PLAYER_LABEL[this.currentPlayer] + ' must continue capturing';
        return {
          ok: true,
          turnEnded: false,
          promoted: promoted,
          captured: wasCapture,
          mustContinue: true,
          winner: null,
        };
      }
    }

    var historyEntry = {
      notation: wasCapture
        ? this._jumpPathNotation.join('x')
        : Checkers.toAlgebraic(move.from.row, move.from.col) +
          '-' +
          Checkers.toAlgebraic(move.to.row, move.to.col),
      player: this.currentPlayer,
      wasCapture: wasCapture,
      wasPromotion: promoted,
      continuedJump: wasCapture && this._jumpPathNotation.length > 2,
    };
    this.history.push(historyEntry);
    this._jumpPathNotation = [];
    this.forcedJumpSquare = null;

    this._switchTurnAndEvaluate();

    return {
      ok: true,
      turnEnded: true,
      promoted: promoted,
      captured: wasCapture,
      mustContinue: false,
      winner: this.winner,
      historyEntry: historyEntry,
    };
  };

  Game.prototype._switchTurnAndEvaluate = function () {
    this.currentPlayer = Checkers.MoveGenerator.opponent(this.currentPlayer);
    this._evaluateGameEnd();
    if (!this.isGameOver) {
      this.statusMessage = Checkers.PLAYER_LABEL[this.currentPlayer] + ' to move';
    }
  };

  Game.prototype._evaluateGameEnd = function () {
    var opponent = this.currentPlayer;
    var remaining = this.board.countPieces(opponent);
    if (remaining === 0) {
      this.winner = Checkers.MoveGenerator.opponent(opponent);
      this.statusMessage =
        Checkers.PLAYER_LABEL[this.winner] + ' wins — all pieces captured!';
      return;
    }

    if (!this.moveGenerator.hasLegalMoves(opponent)) {
      this.winner = Checkers.MoveGenerator.opponent(opponent);
      this.statusMessage =
        Checkers.PLAYER_LABEL[this.winner] + ' wins — opponent has no legal moves!';
    }
  };

  Game.prototype.getState = function () {
    var grid = [];
    for (var row = 0; row < Checkers.BOARD_SIZE; row += 1) {
      grid[row] = [];
      for (var col = 0; col < Checkers.BOARD_SIZE; col += 1) {
        var piece = this.board.squares[row][col];
        grid[row][col] = piece
          ? { color: piece.color, isKing: piece.isKing }
          : null;
      }
    }

    var legalMoves = this.getLegalMoves().map(function (m) {
      return {
        from: { row: m.from.row, col: m.from.col },
        to: { row: m.to.row, col: m.to.col },
        captured: m.captured
          ? { row: m.captured.row, col: m.captured.col }
          : null,
        isCapture: m.isCapture,
      };
    });

    return {
      grid: grid,
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      isGameOver: this.isGameOver,
      forcedJumpSquare: this.forcedJumpSquare
        ? { row: this.forcedJumpSquare.row, col: this.forcedJumpSquare.col }
        : null,
      statusMessage: this.statusMessage,
      history: this.history.map(function (entry) {
        return {
          notation: entry.notation,
          player: entry.player,
          wasCapture: entry.wasCapture,
          wasPromotion: entry.wasPromotion,
          continuedJump: entry.continuedJump,
        };
      }),
      selectableSquares: this.getSelectableSquares(),
      legalMoves: legalMoves,
    };
  };

  Checkers.Game = Game;
})(window.Checkers);
