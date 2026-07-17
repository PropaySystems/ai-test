/*
 * King in the North — UI controller
 * Wires the pure rules engine (engine.js) to the DOM: board rendering,
 * input, coin toss, multi-jump handling, scoring, confetti and sound.
 * Local two-player hot-seat on a single screen.
 */
(function () {
  'use strict';

  var E = window.KITNEngine;
  var SIZE = E.SIZE;

  /* ---------------- DOM refs ---------------- */
  var boardEl = document.getElementById('board');
  var toastEl = document.getElementById('toast');
  var confettiEl = document.getElementById('confetti');

  var tossOverlay = document.getElementById('tossOverlay');
  var howtoOverlay = document.getElementById('howtoOverlay');
  var resultOverlay = document.getElementById('resultOverlay');

  var coinEl = document.getElementById('coin');
  var flipBtn = document.getElementById('flipBtn');
  var startBtn = document.getElementById('startBtn');
  var tossResultEl = document.getElementById('tossResult');
  var tossSubEl = document.getElementById('tossSub');

  var cellEls = [];      // cellEls[r][c] -> element
  var coinAngle = 0;     // running rotation for the coin

  /* ---------------- Persistent scores ---------------- */
  var SCORE_KEY = 'kitn_scores_v1';
  function defaultScores() { return { p1: { points: 0, streak: 0 }, p2: { points: 0, streak: 0 } }; }
  function loadScores() {
    try {
      var s = JSON.parse(localStorage.getItem(SCORE_KEY));
      if (s && s.p1 && s.p2) return s;
    } catch (e) {}
    return defaultScores();
  }
  function saveScores() {
    try { localStorage.setItem(SCORE_KEY, JSON.stringify(scores)); } catch (e) {}
  }
  var scores = loadScores();

  /* ---------------- Game state ---------------- */
  var S = {
    board: null,
    turn: 'black',
    owner: { black: 1, white: 2 }, // which player controls each colour
    assigned: false,               // has the toss assigned colours yet?
    started: false,
    over: false,
    selected: null,                // [r,c]
    moves: [],                     // legal destinations for the selected piece
    mustCapture: false,            // side-to-move is forced to capture
    capturePieces: [],             // coords that currently have a capture
    locked: null,                  // [r,c] locked piece during a multi-jump
    lastMove: null                 // {from,to} for highlight
  };

  /* ---------------- Helpers ---------------- */
  function eq(a, b) { return a && b && a[0] === b[0] && a[1] === b[1]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------------- Board construction ---------------- */
  function buildBoardCells() {
    boardEl.innerHTML = '';
    cellEls = [];
    for (var r = 0; r < SIZE; r++) {
      cellEls[r] = [];
      for (var c = 0; c < SIZE; c++) {
        var cell = document.createElement('div');
        cell.className = 'cell ' + (E.isDark(r, c) ? 'dark' : 'light');
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.setAttribute('role', 'gridcell');
        // coordinate labels along the left (ranks) and bottom (files)
        if (c === 0) {
          var rank = document.createElement('span');
          rank.className = 'coord rank';
          rank.textContent = (SIZE - r);
          cell.appendChild(rank);
        }
        if (r === SIZE - 1) {
          var file = document.createElement('span');
          file.className = 'coord file';
          file.textContent = String.fromCharCode(97 + c);
          cell.appendChild(file);
        }
        cellEls[r][c] = cell;
        boardEl.appendChild(cell);
      }
    }
  }

  /* ---------------- Rendering ---------------- */
  function managePiece(cell, p) {
    var existing = cell.querySelector('.piece');
    var sig = p ? (p.color + (p.king ? '-k' : '')) : '';
    if (existing && existing.dataset.sig === sig) return;
    if (existing) existing.remove();
    if (!p) return;
    var el = document.createElement('div');
    el.className = 'piece ' + p.color + (p.king ? ' king' : '');
    el.dataset.sig = sig;
    if (p.king) el.innerHTML = '<span class="crown">👑</span>';
    cell.appendChild(el);
  }

  function manageDot(cell, show) {
    var d = cell.querySelector('.dot');
    if (show && !d) {
      var e = document.createElement('div');
      e.className = 'dot';
      cell.appendChild(e);
    } else if (!show && d) {
      d.remove();
    }
  }

  function render() {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var cell = cellEls[r][c];
        var here = [r, c];

        var isSel = eq(S.selected, here);
        var destMove = S.selected ? findMove(r, c) : null;
        var isCanCapture = S.started && !S.over && S.mustCapture &&
          S.capturePieces.some(function (p) { return eq(p, here); });

        cell.classList.toggle('selected', !!isSel);
        cell.classList.toggle('can-capture', !!isCanCapture);
        cell.classList.toggle('capture-target', !!(destMove && destMove.capture));
        cell.classList.toggle('last-from', !!(S.lastMove && eq(S.lastMove.from, here)));
        cell.classList.toggle('last-to', !!(S.lastMove && eq(S.lastMove.to, here)));

        managePiece(cell, S.board[r][c]);
        manageDot(cell, !!(destMove && !destMove.capture));
      }
    }
    updateTurnBanner();
    updatePiecesLeft();
    updateActiveCard();
  }

  function findMove(r, c) {
    for (var i = 0; i < S.moves.length; i++) {
      if (S.moves[i].to[0] === r && S.moves[i].to[1] === c) return S.moves[i];
    }
    return null;
  }

  function updateTurnBanner() {
    var dot = document.getElementById('turnDot');
    dot.className = 'turn-dot' + (S.turn === 'white' ? ' white' : '');
    var who = S.assigned ? (' — Player ' + S.owner[S.turn]) : '';
    var label = S.over ? 'Game over' : (cap(S.turn) + ' to move' + who);
    document.getElementById('turnText').textContent = label;
    document.getElementById('forcedFlag').hidden = !(S.started && !S.over && S.mustCapture);
  }

  function updatePiecesLeft() {
    document.getElementById('blackLeft').textContent = E.countPieces(S.board, 'black');
    document.getElementById('whiteLeft').textContent = E.countPieces(S.board, 'white');
  }

  function setStreak(id, val) {
    var el = document.getElementById(id);
    el.textContent = 'streak ' + val + (val >= 2 ? ' 🔥' : '');
    el.classList.toggle('hot', val >= 2);
  }

  function renderScores() {
    document.getElementById('pts1').textContent = scores.p1.points;
    document.getElementById('pts2').textContent = scores.p2.points;
    setStreak('streak1', scores.p1.streak);
    setStreak('streak2', scores.p2.streak);

    var c1 = document.getElementById('color1'), c2 = document.getElementById('color2');
    var chip1 = document.getElementById('chip1'), chip2 = document.getElementById('chip2');
    if (S.assigned) {
      var p1c = S.owner.black === 1 ? 'black' : 'white';
      var p2c = p1c === 'black' ? 'white' : 'black';
      c1.textContent = p1c === 'black' ? 'Black — first move' : 'White';
      c2.textContent = p2c === 'black' ? 'Black — first move' : 'White';
      chip1.className = 'pc-chip ' + p1c;
      chip2.className = 'pc-chip ' + p2c;
    } else {
      c1.textContent = '—'; c2.textContent = '—';
      chip1.className = 'pc-chip'; chip2.className = 'pc-chip';
    }
    updateActiveCard();
  }

  function updateActiveCard() {
    var card1 = document.getElementById('card1'), card2 = document.getElementById('card2');
    card1.classList.remove('active'); card2.classList.remove('active');
    if (S.started && !S.over && S.assigned) {
      (S.owner[S.turn] === 1 ? card1 : card2).classList.add('active');
    }
  }

  /* ---------------- Turn / side bookkeeping ---------------- */
  function refreshSideState() {
    S.mustCapture = E.colorHasCapture(S.board, S.turn);
    S.capturePieces = S.mustCapture ? E.capturingPieces(S.board, S.turn) : [];
    S.selected = null;
    S.moves = [];
  }

  /* ---------------- Input ---------------- */
  function onBoardClick(e) {
    var cellEl = e.target.closest ? e.target.closest('.cell') : null;
    if (!cellEl) return;
    handleClick(+cellEl.dataset.r, +cellEl.dataset.c);
  }

  function handleClick(r, c) {
    if (!S.started || S.over) return;

    // 1) clicking a highlighted destination plays the move
    if (S.selected) {
      var mv = findMove(r, c);
      if (mv) { doMove(mv); return; }
    }

    // 2) otherwise try to (re)select one of the current side's pieces
    var p = S.board[r][c];
    if (p && p.color === S.turn) {
      if (S.locked && !eq(S.locked, [r, c])) {
        toast('Finish the capture sequence first');
        return;
      }
      if (S.mustCapture && !S.capturePieces.some(function (cp) { return eq(cp, [r, c]); })) {
        toast('Capture is forced — pick a gold-ringed piece');
        return;
      }
      selectPiece(r, c);
    } else if (!S.locked) {
      S.selected = null; S.moves = [];
      render();
    }
  }

  function selectPiece(r, c) {
    S.selected = [r, c];
    S.moves = S.mustCapture ? E.getJumps(S.board, r, c) : E.getSteps(S.board, r, c);
    render();
  }

  function doMove(mv) {
    var res = E.applyMove(S.board, mv);
    S.lastMove = { from: mv.from.slice(), to: mv.to.slice() };
    playSound(mv.capture ? 'capture' : 'move');
    if (res.crowned) playSound('king');

    // Continue a multi-jump if more captures are available and we did not crown.
    if (mv.capture && !res.crowned) {
      var more = E.getJumps(S.board, mv.to[0], mv.to[1]);
      if (more.length) {
        S.locked = mv.to.slice();
        S.selected = mv.to.slice();
        S.moves = more;
        S.mustCapture = true;
        S.capturePieces = [mv.to.slice()];
        render();
        toast('Double jump — keep going!');
        return;
      }
    }

    S.locked = null; S.selected = null; S.moves = [];
    endTurn();
  }

  function endTurn() {
    S.turn = S.turn === 'black' ? 'white' : 'black';
    refreshSideState();
    render();
    var winner = E.checkWinner(S.board, S.turn);
    if (winner) gameOver(winner);
    else if (S.mustCapture) toast(cap(S.turn) + ' must capture');
  }

  /* ---------------- Game lifecycle ---------------- */
  function resetBoardState() {
    S.board = E.initialBoard();
    S.turn = 'black';
    S.selected = null; S.moves = [];
    S.locked = null; S.over = false; S.lastMove = null;
    S.mustCapture = false; S.capturePieces = [];
  }

  function openToss() {
    resultOverlay.hidden = true;
    stopConfetti();
    resetBoardState();
    S.started = false;
    S.assigned = false;
    tossResultEl.textContent = '';
    tossSubEl.textContent = '';
    startBtn.disabled = true;
    flipBtn.disabled = false;
    flipBtn.textContent = 'Flip the Coin';
    tossOverlay.hidden = false;
    render();
    renderScores();
  }

  function flipCoin() {
    flipBtn.disabled = true;
    startBtn.disabled = true;
    // Clear the previous outcome so a re-flip doesn't show stale text while spinning.
    tossResultEl.textContent = 'Flipping…';
    tossSubEl.textContent = '';
    var heads = Math.random() < 0.5;
    playSound('coin');

    // Land on a whole number of turns for heads, +180° for tails.
    var base = coinAngle - (coinAngle % 360);
    coinAngle = base + 360 * 6 + (heads ? 0 : 180);
    coinEl.style.transition = 'transform 1.6s cubic-bezier(.2,.75,.2,1)';
    coinEl.style.transform = 'rotateY(' + coinAngle + 'deg)';

    setTimeout(function () {
      var blackOwner = heads ? 1 : 2;
      S.owner = { black: blackOwner, white: blackOwner === 1 ? 2 : 1 };
      S.assigned = true;
      tossResultEl.textContent = heads ? '🪙 Heads!' : '🪙 Tails!';
      tossSubEl.innerHTML = 'Player <b>' + blackOwner + '</b> takes <b>Black</b> and moves first.';
      startBtn.disabled = false;
      flipBtn.disabled = false;
      flipBtn.textContent = 'Flip Again';
      renderScores();
    }, 1650);
  }

  function startGame() {
    tossOverlay.hidden = true;
    S.started = true;
    S.turn = 'black';
    refreshSideState();
    render();
    renderScores();
    toast('Player ' + S.owner.black + ' (Black) moves first');
  }

  function gameOver(winnerColor) {
    S.over = true;
    S.selected = null; S.moves = []; S.locked = null;
    var loserColor = winnerColor === 'black' ? 'white' : 'black';
    var winnerPlayer = S.owner[winnerColor];
    var loserPlayer = winnerPlayer === 1 ? 2 : 1;

    var wp = winnerPlayer === 1 ? scores.p1 : scores.p2;
    var lp = winnerPlayer === 1 ? scores.p2 : scores.p1;
    wp.points += 1;
    wp.streak += 1;
    lp.streak = 0;
    saveScores();
    renderScores();
    render();

    document.getElementById('winnerAttr').innerHTML =
      '🏆 Player ' + winnerPlayer + ' (' + cap(winnerColor) + ') claims the throne' +
      (wp.streak >= 2 ? ' — ' + wp.streak + ' win streak 🔥' : '') + '!';
    document.getElementById('loserLine').innerHTML =
      'Fallen Kingdom Boom....<small>Player ' + loserPlayer + ' (' + cap(loserColor) + ') has fallen.</small>';

    resultOverlay.hidden = false;
    playSound('win');
    launchConfetti();
  }

  /* ---------------- Confetti / party poppers ---------------- */
  var confetti = { raf: null, onResize: null };

  function stopConfetti() {
    if (confetti.raf) { cancelAnimationFrame(confetti.raf); confetti.raf = null; }
    if (confetti.onResize) { window.removeEventListener('resize', confetti.onResize); confetti.onResize = null; }
    var ctx = confettiEl.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, confettiEl.width, confettiEl.height);
    confettiEl.hidden = true;
  }

  function launchConfetti() {
    stopConfetti(); // cancel any run still in flight (e.g. quick Rematch)
    var cv = confettiEl;
    cv.hidden = false;
    var ctx = cv.getContext('2d');
    var W, H;
    function sizeCanvas() { cv.width = window.innerWidth; cv.height = window.innerHeight; W = cv.width; H = cv.height; }
    sizeCanvas();
    // Keep the buffer matched to the viewport if the window is resized mid-animation.
    confetti.onResize = sizeCanvas;
    window.addEventListener('resize', confetti.onResize);
    var colors = ['#ffcf5c', '#6fd3ff', '#ff5d6c', '#57e39a', '#ffffff', '#c78bff'];
    var parts = [];

    function spawnFrom(x, y, n, spread, up) {
      for (var i = 0; i < n; i++) {
        var ang = (-Math.PI / 2) + (Math.random() - 0.5) * spread;
        var speed = up * (0.5 + Math.random());
        parts.push({
          x: x, y: y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          size: 6 + Math.random() * 7,
          color: colors[(Math.random() * colors.length) | 0],
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.3,
          shape: Math.random() < 0.5 ? 'rect' : 'circ',
          life: 0
        });
      }
    }
    // two bottom "poppers" firing up-inward + a top burst raining down
    spawnFrom(W * 0.06, H, 70, 1.1, 16);
    spawnFrom(W * 0.94, H, 70, 1.1, 16);
    for (var i = 0; i < 60; i++) {
      parts.push({
        x: Math.random() * W, y: -20 - Math.random() * H * 0.3,
        vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3,
        size: 6 + Math.random() * 7, color: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 0.3,
        shape: Math.random() < 0.5 ? 'rect' : 'circ', life: 0
      });
    }

    var maxFrames = 320;
    var frame = 0;
    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        p.vy += 0.16;          // gravity
        p.vx *= 0.995;
        p.x += p.vx; p.y += p.vy; p.rot += p.vrot; p.life++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      frame++;
      if (frame < maxFrames) confetti.raf = requestAnimationFrame(tick);
      else stopConfetti();
    }
    confetti.raf = requestAnimationFrame(tick);
  }

  /* ---------------- Sound (WebAudio, no assets) ---------------- */
  var audio = { ctx: null, on: true };
  function ensureAudio() {
    if (!audio.ctx) {
      try { audio.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio.ctx = null; }
    }
  }
  function tone(freq, start, dur, type, vol) {
    if (!audio.ctx) return;
    var t0 = audio.ctx.currentTime + start;
    var o = audio.ctx.createOscillator();
    var g = audio.ctx.createGain();
    o.type = type || 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(audio.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function playSound(kind) {
    if (!audio.on) return;
    ensureAudio();
    if (!audio.ctx) return;
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    switch (kind) {
      case 'move':    tone(520, 0, 0.08, 'triangle', 0.10); break;
      case 'capture': tone(300, 0, 0.10, 'square', 0.12); tone(180, 0.06, 0.12, 'square', 0.10); break;
      case 'king':    tone(660, 0, 0.09, 'triangle', 0.12); tone(880, 0.09, 0.12, 'triangle', 0.12); break;
      case 'coin':    tone(1200, 0, 0.05, 'sine', 0.08); tone(1600, 0.05, 0.05, 'sine', 0.06); break;
      case 'win':     [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.12, 0.22, 'triangle', 0.14); }); break;
    }
  }

  /* ---------------- Toast ---------------- */
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  /* ---------------- Wiring ---------------- */
  function wire() {
    boardEl.addEventListener('click', onBoardClick);

    document.getElementById('newGameBtn').addEventListener('click', openToss);
    document.getElementById('rematchBtn').addEventListener('click', openToss);
    flipBtn.addEventListener('click', flipCoin);
    startBtn.addEventListener('click', startGame);

    document.getElementById('howtoBtn').addEventListener('click', function () { howtoOverlay.hidden = false; });
    document.getElementById('howtoBtn2').addEventListener('click', function () { howtoOverlay.hidden = false; });
    document.getElementById('closeResultBtn').addEventListener('click', function () { resultOverlay.hidden = true; stopConfetti(); });

    // any element with data-close closes the named overlay
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.getElementById(b.getAttribute('data-close')).hidden = true;
      });
    });

    document.getElementById('resetScoresBtn').addEventListener('click', function () {
      if (window.confirm('Reset points and streaks for both players?')) {
        scores = defaultScores();
        saveScores();
        renderScores();
        toast('Scores reset');
      }
    });

    var soundBtn = document.getElementById('soundBtn');
    soundBtn.addEventListener('click', function () {
      audio.on = !audio.on;
      soundBtn.textContent = audio.on ? '🔊 Sound: On' : '🔇 Sound: Off';
      if (audio.on) playSound('move');
    });

    // Esc closes the how-to / result overlays (not the toss)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!howtoOverlay.hidden) howtoOverlay.hidden = true;
        else if (!resultOverlay.hidden) resultOverlay.hidden = true;
      }
    });
  }

  /* ---------------- Public API (for embedding) ---------------- */
  window.KITN = {
    version: '1.0.0',
    newGame: openToss,
    showRules: function () { howtoOverlay.hidden = false; },
    resetScores: function () { scores = defaultScores(); saveScores(); renderScores(); }
  };

  /* ---------------- Boot ---------------- */
  buildBoardCells();
  wire();
  resetBoardState();
  render();
  renderScores();
  // Toss overlay is visible by default in the markup; the board sits behind it.
})();
