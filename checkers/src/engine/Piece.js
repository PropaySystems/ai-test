window.Checkers = window.Checkers || {};

(function (Checkers) {
  function Piece(color, isKing) {
    if (color !== Checkers.PLAYER.WHITE && color !== Checkers.PLAYER.BLACK) {
      throw new Error('Invalid piece color: ' + color);
    }
    this.color = color;
    this.isKing = Boolean(isKing);
  }

  Piece.prototype.promote = function () {
    this.isKing = true;
  };

  Piece.prototype.clone = function () {
    return new Piece(this.color, this.isKing);
  };

  Checkers.Piece = Piece;
})(window.Checkers);
