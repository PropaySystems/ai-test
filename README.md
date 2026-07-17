# Checkers — Modular JavaScript Game

Local two-player checkers with player setup, on-demand move hints, and drag-and-drop, built with vanilla HTML, CSS, and reusable ES modules.

## Play

Serve the project over HTTP (ES modules do not load from `file://` in most browsers):

```bash
npm start
```

Then open [http://localhost:4173](http://localhost:4173).

Or use any static server from the project root, for example:

```bash
python3 -m http.server 4173
```

## Tests

```bash
npm test
```

Uses Node’s built-in test runner against the pure rules engine and player-settings helpers.

## Features

- **Player setup** — name both players, pick piece color palettes, choose who moves first; settings persist in `localStorage`
- **Suggest move** — highlights one recommended legal play without making it
- **Drag and drop** — pointer-based mouse/touch dragging; click and keyboard still work
- **Full rules** — mandatory captures, enforced double/multi-jumps, kings (including continuing after crowning), and both win conditions
- **Winner crown** — the winning player receives a crowned celebration with a quick rematch action
- **Taken pieces** — captured dots appear live on each player card and beside the board

## Module architecture

| File | Responsibility |
|------|----------------|
| [`js/constants.js`](js/constants.js) | Board size, players, piece types, dark-square helpers, move deltas |
| [`js/checkers.js`](js/checkers.js) | Pure, reusable game state and rules (including `suggestMove`) |
| [`js/players.js`](js/players.js) | Player names, palettes, validation, and local persistence |
| [`js/ui.js`](js/ui.js) | Rendering, setup dialog, hints, drag/drop, status display |
| [`js/main.js`](js/main.js) | Application bootstrap |
| [`css/styles.css`](css/styles.css) | Game-room styling and motion |
| [`tests/checkers.test.js`](tests/checkers.test.js) | Rules and settings coverage |

Game rules live only in `checkers.js`, so move generation, captures, crowning, hints, and win checks can be reused from tests or another UI.

## Gameplay rules

1. **Setup** — 8×8 board; only the 32 dark squares are used. Each side starts with 12 pieces on the three nearest rows of dark squares.
2. **Moves** — Men move diagonally forward one empty dark square.
3. **Captures** — Jump diagonally over an adjacent enemy into the empty square beyond. Captures are mandatory. Multi-jumps with the same piece are required when available.
4. **Kings** — Reaching the opponent’s back row crowns the piece. Kings move and capture diagonally in both directions. If a piece crowns mid-chain and another jump is available, it continues jumping as a king.
5. **Winning** — Capture all opponent pieces, or leave them with no legal move on their turn.

## Controls

- Drag a piece onto a highlighted square, or click to select then click a destination.
- **Suggest move** highlights a recommended origin and landing square.
- **Players & options** opens the setup dialog (names, colors, first player).
- **New game** resets the board using the saved first-player preference.
- Keyboard: Tab to a square, Enter or Space to select / move.

---

## Candidate exercise notes

This repository is also used as a hiring exercise. Fork the repo, work on a personal feature branch, install the always-on prompt-logging rule from `test-rules/commit-user-prompts.mdc`, and open a PR into `PropaySystems/ai-test` `master` when finished. See git history and `prompts/prompts.md` for the prompt log required by that rule.
