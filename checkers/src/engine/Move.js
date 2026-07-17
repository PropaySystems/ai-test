window.Checkers = window.Checkers || {};

(function (Checkers) {
  function Move(from, to, captured) {
    this.from = Checkers.cloneSquare(from);
    this.to = Checkers.cloneSquare(to);
    this.captured = captured ? Checkers.cloneSquare(captured) : null;
  }

  Object.defineProperty(Move.prototype, 'isCapture', {
    get: function () {
      return this.captured != null;
    },
  });

  Move.prototype.toNotation = function () {
    var sep = this.isCapture ? 'x' : '-';
    return (
      Checkers.toAlgebraic(this.from.row, this.from.col) +
      sep +
      Checkers.toAlgebraic(this.to.row, this.to.col)
    );
  };

  Move.prototype.equals = function (other) {
    if (!other) return false;
    var sameFrom = this.from.row === other.from.row && this.from.col === other.from.col;
    var sameTo = this.to.row === other.to.row && this.to.col === other.to.col;
    var sameCap =
      (this.captured == null && other.captured == null) ||
      (this.captured != null &&
        other.captured != null &&
        this.captured.row === other.captured.row &&
        this.captured.col === other.captured.col);
    return sameFrom && sameTo && sameCap;
  };

  Checkers.Move = Move;
})(window.Checkers);
