window.Checkers = window.Checkers || {};

(function (Checkers) {
  function GameController(deps) {
    this.game = deps.game;
    this.boardView = deps.boardView;
    this.statusView = deps.statusView;
    this.sound = deps.sound;
    this.selected = null;
  }

  GameController.prototype.start = function () {
    this.selected = null;
    this.refresh();
  };

  GameController.prototype.newGame = function () {
    this.game.reset();
    this.selected = null;
    this.sound.playNewGame();
    this.refresh();
  };

  GameController.prototype.onSquareClick = function (square) {
    if (this.game.isGameOver) {
      this.sound.playIllegal();
      return;
    }

    var state = this.game.getState();
    var piece = state.grid[square.row][square.col];

    if (state.forcedJumpSquare) {
      if (this.selected && !Checkers.sameSquare(square, this.selected)) {
        this._tryMove(this.selected, square);
        return;
      }
      if (Checkers.sameSquare(square, state.forcedJumpSquare)) {
        this.selected = { row: square.row, col: square.col };
        this.refresh();
        return;
      }
      this.sound.playIllegal();
      return;
    }

    if (this.selected) {
      var targets = this.game.getLegalMovesFrom(this.selected);
      var isTarget = false;
      for (var i = 0; i < targets.length; i += 1) {
        if (targets[i].to.row === square.row && targets[i].to.col === square.col) {
          isTarget = true;
          break;
        }
      }
      if (isTarget) {
        this._tryMove(this.selected, square);
        return;
      }
    }

    var canSelect = false;
    for (var s = 0; s < state.selectableSquares.length; s += 1) {
      if (Checkers.sameSquare(state.selectableSquares[s], square)) {
        canSelect = true;
        break;
      }
    }

    if (canSelect && piece && piece.color === state.currentPlayer) {
      if (this.selected && Checkers.sameSquare(this.selected, square)) {
        this.selected = null;
      } else {
        this.selected = { row: square.row, col: square.col };
      }
      this.refresh();
      return;
    }

    if (this.selected) {
      this.selected = null;
      this.refresh();
      return;
    }

    if (piece && piece.color !== state.currentPlayer) {
      this.sound.playIllegal();
    }
  };

  GameController.prototype._tryMove = function (from, to) {
    var result = this.game.applyMove(from, to);
    if (!result.ok) {
      this.sound.playIllegal();
      return;
    }

    if (result.promoted) {
      this.sound.playPromote();
    } else if (result.captured) {
      this.sound.playCapture();
    } else {
      this.sound.playMove();
    }

    if (result.mustContinue) {
      this.selected = { row: to.row, col: to.col };
    } else {
      this.selected = null;
      if (result.winner) {
        this.sound.playWin();
      }
    }

    this.refresh();
  };

  GameController.prototype.refresh = function () {
    var state = this.game.getState();
    var targets = [];
    var i;

    if (this.selected && !state.isGameOver) {
      var moves = this.game.getLegalMovesFrom(this.selected);
      for (i = 0; i < moves.length; i += 1) {
        targets.push({ row: moves[i].to.row, col: moves[i].to.col });
      }
    }

    if (state.forcedJumpSquare && !this.selected) {
      this.selected = {
        row: state.forcedJumpSquare.row,
        col: state.forcedJumpSquare.col,
      };
      targets = [];
      var forcedMoves = this.game.getLegalMovesFrom(this.selected);
      for (i = 0; i < forcedMoves.length; i += 1) {
        targets.push({ row: forcedMoves[i].to.row, col: forcedMoves[i].to.col });
      }
    }

    this.boardView.render(state, this.selected, targets);
    this.statusView.render(state);
  };

  Checkers.GameController = GameController;
})(window.Checkers);
