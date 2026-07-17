window.Checkers = window.Checkers || {};

(function (Checkers) {
  function StatusView(elements) {
    this.statusEl = elements.statusEl;
    this.historyEl = elements.historyEl;
    this.turnEl = elements.turnEl;
  }

  StatusView.prototype.render = function (state) {
    this.statusEl.textContent = state.statusMessage;

    this.turnEl.className = 'turn-indicator';
    if (state.isGameOver) {
      this.turnEl.textContent = 'Game over';
      this.turnEl.classList.add('turn-over');
    } else {
      this.turnEl.textContent = Checkers.PLAYER_LABEL[state.currentPlayer];
      this.turnEl.classList.add(
        state.currentPlayer === 'white' ? 'turn-white' : 'turn-black',
      );
    }

    this.historyEl.innerHTML = '';
    if (state.history.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'history-empty';
      empty.textContent = 'No moves yet';
      this.historyEl.appendChild(empty);
      return;
    }

    for (var index = 0; index < state.history.length; index += 1) {
      var entry = state.history[index];
      var li = document.createElement('li');
      li.className = 'history-item';

      var num = document.createElement('span');
      num.className = 'history-num';
      num.textContent = index + 1 + '.';

      var move = document.createElement('span');
      move.className = 'history-move';
      move.textContent = entry.notation;

      var meta = document.createElement('span');
      meta.className = 'history-meta';
      var tags = [];
      if (entry.wasPromotion) tags.push('king');
      if (entry.continuedJump) tags.push('multi');
      meta.textContent = tags.length ? tags.join(' · ') : '';

      li.appendChild(num);
      li.appendChild(move);
      li.appendChild(meta);
      this.historyEl.appendChild(li);
    }

    this.historyEl.scrollTop = this.historyEl.scrollHeight;
  };

  Checkers.StatusView = StatusView;
})(window.Checkers);
