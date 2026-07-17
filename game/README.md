# Board Game Engine

Turn-based two-player game on an 8×8 board (32 dark playable squares).

Implemented as a **single self-contained HTML/JavaScript file** — no Python runtime and no external dependencies.

## Documents

- [OFFICIAL_RULES.md](../OFFICIAL_RULES.md) — complete official rules (implementation source of truth)
- [index.html](index.html) — pure JavaScript game (engine + UI)

## Run

```bash
open game/index.html
```

Or from the project root:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080/game/index.html
```

## Architecture (eight modules)

| Module | Role |
|--------|------|
| Constants | Players, piece kinds, diagonals, draw limits |
| BoardUtils | Geometry, notation, `createSquare` / `createPiece` / `createMove` |
| GameState | 8×8 dark-square piece map, turn, counters |
| MoveGenerator | Quiet moves and maximal capture paths |
| MoveValidator | Legal-move and multi-jump selection checks |
| GameEngine | Apply turns, promotion, win/draw, undo |
| UIRenderer | Board, highlights, status, history |
| UIEventHandlers | Clicks, mandatory captures, multi-jump lock |

The page includes a **Team explanation** section with the same overview.

## How to play

1. Open `index.html` in a browser
2. Dark (Player 1) moves first — click a piece, then a green target
3. Orange highlights mean a capture is mandatory
4. Multi-jumps must be completed before the turn ends
5. Use **New Game** / **Undo** as needed

### Notation (move history)

| Action | Format | Example |
|--------|--------|---------|
| Quiet move | `from-to` | `a3-b4` |
| Capture / multi-jump | `fromxlandx...` | `c3xe5xg7` |

### Board legend

- Dark / light discs — standard pieces
- Crown (♛) — king
- Orange outline — must capture
- Green outline — legal target
