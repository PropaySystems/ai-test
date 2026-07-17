import { createGameUI } from './ui.js';

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status-text');
const turnBadgeEl = document.getElementById('turn-badge');
const countBlackEl = document.getElementById('count-black');
const countRedEl = document.getElementById('count-red');
const resetBtn = document.getElementById('reset-btn');

if (
  !boardEl ||
  !statusEl ||
  !turnBadgeEl ||
  !countBlackEl ||
  !countRedEl ||
  !resetBtn
) {
  throw new Error('Checkers UI root elements are missing from the page');
}

createGameUI({
  boardEl,
  statusEl,
  turnBadgeEl,
  countBlackEl,
  countRedEl,
  resetBtn,
});
