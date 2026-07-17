/**
 * Local player profiles, color palettes, and persistence.
 * Kept separate from the pure rules engine in checkers.js.
 */

import { PLAYERS } from './constants.js';

export const STORAGE_KEY = 'checkers.playerSettings.v1';

export const PIECE_PALETTES = Object.freeze({
  onyx: Object.freeze({
    id: 'onyx',
    label: 'Onyx',
    base: '#1f1a17',
    highlight: '#6a5f56',
    edge: '#4a4038',
  }),
  slate: Object.freeze({
    id: 'slate',
    label: 'Slate',
    base: '#243447',
    highlight: '#6f8aa8',
    edge: '#3d556d',
  }),
  crimson: Object.freeze({
    id: 'crimson',
    label: 'Crimson',
    base: '#7a140e',
    highlight: '#ef6a5c',
    edge: '#b42318',
  }),
  amber: Object.freeze({
    id: 'amber',
    label: 'Amber',
    base: '#8a4b12',
    highlight: '#f0b35a',
    edge: '#c76b1c',
  }),
  forest: Object.freeze({
    id: 'forest',
    label: 'Forest',
    base: '#1f4a35',
    highlight: '#6fbf93',
    edge: '#2f6b4d',
  }),
  royal: Object.freeze({
    id: 'royal',
    label: 'Royal',
    base: '#3b1f6b',
    highlight: '#b58cff',
    edge: '#5b3a96',
  }),
});

export function createDefaultSettings() {
  return {
    players: {
      [PLAYERS.BLACK]: {
        name: 'Player One',
        palette: 'onyx',
      },
      [PLAYERS.RED]: {
        name: 'Player Two',
        palette: 'crimson',
      },
    },
    firstPlayer: PLAYERS.BLACK,
    setupCompleted: false,
  };
}

export function sanitizeName(value, fallback) {
  const trimmed = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24);
  return trimmed || fallback;
}

export function sanitizePalette(value, fallback) {
  return PIECE_PALETTES[value] ? value : fallback;
}

export function sanitizeSide(value, fallback = PLAYERS.BLACK) {
  return value === PLAYERS.RED || value === PLAYERS.BLACK ? value : fallback;
}

/**
 * Normalize and validate a settings object.
 */
export function normalizeSettings(raw) {
  const defaults = createDefaultSettings();
  const source = raw && typeof raw === 'object' ? raw : {};
  const players = source.players && typeof source.players === 'object'
    ? source.players
    : {};

  const black = players[PLAYERS.BLACK] ?? {};
  const red = players[PLAYERS.RED] ?? {};

  let blackPalette = sanitizePalette(
    black.palette,
    defaults.players[PLAYERS.BLACK].palette,
  );
  let redPalette = sanitizePalette(
    red.palette,
    defaults.players[PLAYERS.RED].palette,
  );

  if (blackPalette === redPalette) {
    redPalette = blackPalette === 'crimson' ? 'amber' : 'crimson';
  }

  return {
    players: {
      [PLAYERS.BLACK]: {
        name: sanitizeName(
          black.name,
          defaults.players[PLAYERS.BLACK].name,
        ),
        palette: blackPalette,
      },
      [PLAYERS.RED]: {
        name: sanitizeName(red.name, defaults.players[PLAYERS.RED].name),
        palette: redPalette,
      },
    },
    firstPlayer: sanitizeSide(source.firstPlayer, defaults.firstPlayer),
    setupCompleted: Boolean(source.setupCompleted),
  };
}

export function loadSettings(storage = globalThis.localStorage) {
  try {
    if (!storage) return createDefaultSettings();
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSettings();
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return createDefaultSettings();
  }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  const normalized = normalizeSettings({
    ...settings,
    setupCompleted: true,
  });

  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore quota / private-mode failures; in-memory settings still apply.
  }

  return normalized;
}

export function getPalette(paletteId) {
  return PIECE_PALETTES[paletteId] ?? PIECE_PALETTES.onyx;
}

export function getInitials(name) {
  const parts = sanitizeName(name, '?').split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function displayNameFor(settings, side) {
  return settings.players[side]?.name ?? side;
}

export function paletteOptions() {
  return Object.values(PIECE_PALETTES).map((palette) => ({
    id: palette.id,
    label: palette.label,
  }));
}
