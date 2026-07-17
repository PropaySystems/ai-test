window.Checkers = window.Checkers || {};

(function (Checkers) {
  function BoardView(root, handlers) {
    this.root = root;
    this.handlers = handlers;
    this.selected = null;
    this.highlights = [];
    this.selectableKeys = {};
    this.squareElements = [];
    this._buildSkeleton();
  }

  BoardView.prototype._buildSkeleton = function () {
    var self = this;
    this.root.innerHTML = '';
    this.root.classList.add('board-wrap');

    var frame = document.createElement('div');
    frame.className = 'board-frame';

    var corner = document.createElement('div');
    corner.className = 'coord coord-corner';
    frame.appendChild(corner);

    for (var col = 0; col < Checkers.BOARD_SIZE; col += 1) {
      var label = document.createElement('div');
      label.className = 'coord coord-col';
      label.textContent = 'ABCDEFGH'[col];
      frame.appendChild(label);
    }

    for (var displayRow = 0; displayRow < Checkers.BOARD_SIZE; displayRow += 1) {
      var row = Checkers.BOARD_SIZE - 1 - displayRow;

      var rowLabel = document.createElement('div');
      rowLabel.className = 'coord coord-row';
      rowLabel.textContent = String(row + 1);
      frame.appendChild(rowLabel);

      this.squareElements[row] = [];

      for (var c = 0; c < Checkers.BOARD_SIZE; c += 1) {
        (function (r, column) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = Checkers.isPlayableSquare(r, column)
            ? 'square square-dark'
            : 'square square-light';
          btn.dataset.row = String(r);
          btn.dataset.col = String(column);
          btn.setAttribute('aria-label', Checkers.toAlgebraic(r, column));
          btn.addEventListener('click', function () {
            self.handlers.onSquareClick({ row: r, col: column });
          });
          frame.appendChild(btn);
          self.squareElements[r][column] = btn;
        })(row, c);
      }
    }

    this.root.appendChild(frame);
  };

  BoardView.prototype.render = function (state, selected, targetSquares) {
    this.selected = selected;
    this.highlights = targetSquares;

    this.selectableKeys = {};
    for (var s = 0; s < state.selectableSquares.length; s += 1) {
      var sq = state.selectableSquares[s];
      this.selectableKeys[sq.row + ',' + sq.col] = true;
    }

    var targetKeys = {};
    for (var t = 0; t < targetSquares.length; t += 1) {
      var target = targetSquares[t];
      targetKeys[target.row + ',' + target.col] = true;
    }

    var forced = state.forcedJumpSquare;
    var forcedKey = forced ? forced.row + ',' + forced.col : null;

    for (var row = 0; row < Checkers.BOARD_SIZE; row += 1) {
      for (var col = 0; col < Checkers.BOARD_SIZE; col += 1) {
        var el = this.squareElements[row][col];
        var key = row + ',' + col;
        var piece = state.grid[row][col];

        el.classList.toggle(
          'selected',
          selected != null && selected.row === row && selected.col === col,
        );
        el.classList.toggle('highlight', !!targetKeys[key]);
        el.classList.toggle('selectable', !!this.selectableKeys[key] && !state.isGameOver);
        el.classList.toggle('forced', forcedKey === key);
        el.disabled = state.isGameOver;

        el.innerHTML = '';
        if (piece) {
          var pieceEl = document.createElement('span');
          pieceEl.className =
            'piece piece-' + piece.color + (piece.isKing ? ' piece-king' : '');
          pieceEl.setAttribute('aria-hidden', 'true');
          if (piece.isKing) {
            var crown = document.createElement('span');
            crown.className = 'crown';
            crown.textContent = '♔';
            pieceEl.appendChild(crown);
          }
          el.appendChild(pieceEl);
        }
      }
    }
  };

  Checkers.BoardView = BoardView;
})(window.Checkers);
