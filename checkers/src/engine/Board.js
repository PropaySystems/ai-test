window.Checkers = window.Checkers || {};

(function (Checkers) {
  function Board() {
    this.squares = [];
    for (var row = 0; row < Checkers.BOARD_SIZE; row += 1) {
      this.squares[row] = [];
      for (var col = 0; col < Checkers.BOARD_SIZE; col += 1) {
        this.squares[row][col] = null;
      }
    }
  }

  Board.prototype.setupInitialPosition = function () {
    this.clear();
    for (var row = 0; row < Checkers.BOARD_SIZE; row += 1) {
      for (var col = 0; col < Checkers.BOARD_SIZE; col += 1) {
        if (!Checkers.isPlayableSquare(row, col)) continue;
        if (row <= 2) {
          this.squares[row][col] = new Checkers.Piece(Checkers.PLAYER.WHITE);
        } else if (row >= 5) {
          this.squares[row][col] = new Checkers.Piece(Checkers.PLAYER.BLACK);
        }
      }
    }
  };

  Board.prototype.clear = function () {
    for (var row = 0; row < Checkers.BOARD_SIZE; row += 1) {
      for (var col = 0; col < Checkers.BOARD_SIZE; col += 1) {
        this.squares[row][col] = null;
      }
    }
  };

  Board.prototype.getPiece = function (row, col) {
    if (!Checkers.isOnBoard(row, col)) return null;
    return this.squares[row][col];
  };

  Board.prototype.getPieceAt = function (square) {
    return this.getPiece(square.row, square.col);
  };

  Board.prototype.setPiece = function (row, col, piece) {
    if (!Checkers.isOnBoard(row, col)) {
      throw new Error('Cannot place piece off board: (' + row + ', ' + col + ')');
    }
    this.squares[row][col] = piece;
  };

  Board.prototype.setPieceAt = function (square, piece) {
    this.setPiece(square.row, square.col, piece);
  };

  Board.prototype.isEmpty = function (square) {
    return this.getPieceAt(square) == null;
  };

  Board.prototype.getPieceSquares = function (color) {
    var result = [];
    for (var row = 0; row < Checkers.BOARD_SIZE; row += 1) {
      for (var col = 0; col < Checkers.BOARD_SIZE; col += 1) {
        var piece = this.squares[row][col];
        if (piece && piece.color === color) {
          result.push({ row: row, col: col });
        }
      }
    }
    return result;
  };

  Board.prototype.countPieces = function (color) {
    return this.getPieceSquares(color).length;
  };

  Board.prototype.clone = function () {
    var copy = new Board();
    for (var row = 0; row < Checkers.BOARD_SIZE; row += 1) {
      for (var col = 0; col < Checkers.BOARD_SIZE; col += 1) {
        var piece = this.squares[row][col];
        copy.squares[row][col] = piece ? piece.clone() : null;
      }
    }
    return copy;
  };

  Board.prototype.hasPieceAt = function (square) {
    return this.getPieceAt(square) != null;
  };

  Board.prototype.movePiece = function (a, b) {
    var piece = this.getPieceAt(a);
    if (!piece) {
      throw new Error('No piece to move');
    }
    this.setPieceAt(a, null);
    this.setPieceAt(b, piece);
  };

  Board.prototype.removePiece = function (square) {
    this.setPieceAt(square, null);
  };

  Checkers.Board = Board;
})(window.Checkers);
