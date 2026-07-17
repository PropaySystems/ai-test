window.Checkers = window.Checkers || {};

(function (Checkers) {
  function MoveGenerator(board) {
    this.board = board;
  }

  MoveGenerator.prototype.getMoveDirections = function (piece) {
    if (piece.isKing) {
      return Checkers.DIAGONAL_DELTAS.map(function (d) {
        return { row: d.row, col: d.col };
      });
    }
    var forward = Checkers.FORWARD_ROW_DELTA[piece.color];
    return [
      { row: forward, col: -1 },
      { row: forward, col: 1 },
    ];
  };

  MoveGenerator.prototype.getCaptureDirections = function (piece) {
    return this.getMoveDirections(piece);
  };

  MoveGenerator.prototype.getQuietMovesFrom = function (from) {
    var piece = this.board.getPieceAt(from);
    if (!piece) return [];

    var moves = [];
    var dirs = this.getMoveDirections(piece);
    for (var i = 0; i < dirs.length; i += 1) {
      var dir = dirs[i];
      var to = { row: from.row + dir.row, col: from.col + dir.col };
      if (!Checkers.isOnBoard(to.row, to.col) || !Checkers.isPlayableSquare(to.row, to.col)) continue;
      if (!this.board.isEmpty(to)) continue;
      moves.push(new Checkers.Move(from, to, null));
    }
    return moves;
  };

  MoveGenerator.prototype.getCapturesFrom = function (from) {
    var piece = this.board.getPieceAt(from);
    if (!piece) return [];

    var moves = [];
    var dirs = this.getCaptureDirections(piece);
    for (var i = 0; i < dirs.length; i += 1) {
      var dir = dirs[i];
      var mid = { row: from.row + dir.row, col: from.col + dir.col };
      var to = { row: from.row + dir.row * 2, col: from.col + dir.col * 2 };

      if (!Checkers.isOnBoard(to.row, to.col) || !Checkers.isPlayableSquare(to.row, to.col)) continue;
      if (!this.board.isEmpty(to)) continue;

      var victim = this.board.getPieceAt(mid);
      if (!victim || victim.color === piece.color) continue;

      moves.push(new Checkers.Move(from, to, mid));
    }
    return moves;
  };

  MoveGenerator.prototype.getAllCaptures = function (color) {
    var moves = [];
    var squares = this.board.getPieceSquares(color);
    for (var i = 0; i < squares.length; i += 1) {
      moves = moves.concat(this.getCapturesFrom(squares[i]));
    }
    return moves;
  };

  MoveGenerator.prototype.getAllQuietMoves = function (color) {
    var moves = [];
    var squares = this.board.getPieceSquares(color);
    for (var i = 0; i < squares.length; i += 1) {
      moves = moves.concat(this.getQuietMovesFrom(squares[i]));
    }
    return moves;
  };

  MoveGenerator.prototype.getLegalMoves = function (color, forcedSquare) {
    if (forcedSquare) {
      return this.getCapturesFrom(forcedSquare);
    }
    var captures = this.getAllCaptures(color);
    if (captures.length > 0) {
      return captures;
    }
    return this.getAllQuietMoves(color);
  };

  MoveGenerator.prototype.hasLegalMoves = function (color, forcedSquare) {
    return this.getLegalMoves(color, forcedSquare).length > 0;
  };

  MoveGenerator.opponent = function (color) {
    return color === Checkers.PLAYER.WHITE ? Checkers.PLAYER.BLACK : Checkers.PLAYER.WHITE;
  };

  Checkers.MoveGenerator = MoveGenerator;
})(window.Checkers);
