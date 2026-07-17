window.Checkers = window.Checkers || {};

(function (Checkers) {
  function MoveValidator(moveGenerator) {
    this.moveGenerator = moveGenerator;
  }

  MoveValidator.prototype.isLegalMove = function (color, move, forcedSquare) {
    var legal = this.moveGenerator.getLegalMoves(color, forcedSquare || null);
    return legal.some(function (candidate) {
      return candidate.equals(move);
    });
  };

  MoveValidator.prototype.findLegalMove = function (color, from, to, forcedSquare) {
    var legal = this.moveGenerator.getLegalMoves(color, forcedSquare || null);
    for (var i = 0; i < legal.length; i += 1) {
      var candidate = legal[i];
      if (
        candidate.from.row === from.row &&
        candidate.from.col === from.col &&
        candidate.to.row === to.row &&
        candidate.to.col === to.col
      ) {
        return candidate;
      }
    }
    return null;
  };

  Checkers.MoveValidator = MoveValidator;
})(window.Checkers);
