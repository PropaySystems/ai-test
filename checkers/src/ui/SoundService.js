window.Checkers = window.Checkers || {};

(function (Checkers) {
  function SoundService() {
    this._ctx = null;
    this.enabled = true;
  }

  SoundService.prototype._ensureContext = function () {
    if (!this._ctx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this._ctx = new Ctx();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  };

  SoundService.prototype._tone = function (frequency, durationSec, type, gain) {
    if (!this.enabled) return;
    var ctx = this._ensureContext();
    if (!ctx) return;

    var osc = ctx.createOscillator();
    var amp = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = frequency;
    amp.gain.value = gain == null ? 0.08 : gain;
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  };

  SoundService.prototype.playMove = function () {
    this._tone(420, 0.07, 'triangle', 0.06);
  };

  SoundService.prototype.playCapture = function () {
    var self = this;
    this._tone(280, 0.06, 'square', 0.05);
    setTimeout(function () {
      self._tone(180, 0.1, 'square', 0.04);
    }, 60);
  };

  SoundService.prototype.playPromote = function () {
    var self = this;
    this._tone(520, 0.08, 'sine', 0.06);
    setTimeout(function () {
      self._tone(780, 0.12, 'sine', 0.05);
    }, 80);
  };

  SoundService.prototype.playWin = function () {
    var self = this;
    this._tone(392, 0.1, 'sine', 0.07);
    setTimeout(function () {
      self._tone(523, 0.1, 'sine', 0.07);
    }, 100);
    setTimeout(function () {
      self._tone(659, 0.18, 'sine', 0.07);
    }, 200);
  };

  SoundService.prototype.playNewGame = function () {
    var self = this;
    this._tone(330, 0.08, 'triangle', 0.05);
    setTimeout(function () {
      self._tone(440, 0.1, 'triangle', 0.05);
    }, 90);
  };

  SoundService.prototype.playIllegal = function () {
    this._tone(120, 0.12, 'sawtooth', 0.04);
  };

  SoundService.prototype.toggle = function () {
    this.enabled = !this.enabled;
    return this.enabled;
  };

  Checkers.SoundService = SoundService;
})(window.Checkers);
