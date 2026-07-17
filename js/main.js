import { createGameUI } from './ui.js';

const required = {
  boardEl: document.getElementById('board'),
  statusEl: document.getElementById('status-text'),
  turnBadgeEl: document.getElementById('turn-badge'),
  countBlackEl: document.getElementById('count-black'),
  countRedEl: document.getElementById('count-red'),
  resetBtn: document.getElementById('reset-btn'),
  hintBtn: document.getElementById('hint-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  setupDialog: document.getElementById('setup-dialog'),
  setupForm: document.getElementById('setup-form'),
  setupCancel: document.getElementById('setup-cancel'),
  setupError: document.getElementById('setup-error'),
  blackNameInput: document.getElementById('input-black-name'),
  redNameInput: document.getElementById('input-red-name'),
  blackPaletteSelect: document.getElementById('input-black-palette'),
  redPaletteSelect: document.getElementById('input-red-palette'),
  firstBlack: document.getElementById('first-black'),
  firstRed: document.getElementById('first-red'),
  nameBlack: document.getElementById('name-black'),
  nameRed: document.getElementById('name-red'),
  avatarBlack: document.getElementById('avatar-black'),
  avatarRed: document.getElementById('avatar-red'),
  labelBlack: document.getElementById('label-black'),
  labelRed: document.getElementById('label-red'),
  cardBlack: document.getElementById('card-black'),
  cardRed: document.getElementById('card-red'),
  hintCaption: document.getElementById('hint-caption'),
  dragGhost: document.getElementById('drag-ghost'),
  winnerDialog: document.getElementById('winner-dialog'),
  winnerName: document.getElementById('winner-name'),
  winnerAvatar: document.getElementById('winner-avatar'),
  winnerPlayAgain: document.getElementById('winner-play-again'),
};

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  throw new Error(
    `Checkers UI root elements are missing: ${missing.join(', ')}`,
  );
}

createGameUI(required);
