(function () {
  var Checkers = window.Checkers;

  function bootstrap() {
    var boardRoot = document.getElementById('board');
    var statusEl = document.getElementById('status');
    var historyEl = document.getElementById('history');
    var turnEl = document.getElementById('turn');
    var newGameBtn = document.getElementById('new-game');
    var soundBtn = document.getElementById('toggle-sound');

    if (!boardRoot || !statusEl || !historyEl || !turnEl || !newGameBtn || !soundBtn) {
      throw new Error('Missing required DOM elements');
    }

    var game = new Checkers.Game();
    var sound = new Checkers.SoundService();
    var controller;

    controller = new Checkers.GameController({
      game: game,
      boardView: new Checkers.BoardView(boardRoot, {
        onSquareClick: function (square) {
          controller.onSquareClick(square);
        },
      }),
      statusView: new Checkers.StatusView({
        statusEl: statusEl,
        historyEl: historyEl,
        turnEl: turnEl,
      }),
      sound: sound,
    });

    newGameBtn.addEventListener('click', function () {
      controller.newGame();
    });

    soundBtn.addEventListener('click', function () {
      var on = sound.toggle();
      soundBtn.textContent = on ? 'Sound: On' : 'Sound: Off';
      soundBtn.setAttribute('aria-pressed', String(on));
    });

    controller.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
