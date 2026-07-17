# Checkers — Project Structure

Overview of the folder layout, each file’s role, and how the pieces fit together.

The project uses **HTML, CSS, and vanilla JavaScript only** (no frameworks, no build tools, no other languages). Scripts load via plain `<script>` tags and share a global `window.Checkers` namespace so `index.html` can be opened directly in a browser.

---

## Directory tree

```
checkers/
├── index.html                 # Page shell: layout, controls, script tags
├── README.md                  # Short how-to-play / overview
├── RULES.md                   # All implemented game rules
├── STRUCTURE.md               # This file
├── styles/
│   └── board.css              # Visual design for board, pieces, panels
└── src/
    ├── main.js                # App bootstrap: wires engine ↔ UI
    ├── engine/                # Pure game logic (no DOM)
    │   ├── constants.js       # Board size, players, directions, king rows
    │   ├── Piece.js           # Piece model (color, king flag)
    │   ├── Move.js            # Single move / jump representation
    │   ├── Board.js           # 8×8 grid, setup, piece get/set/remove
    │   ├── MoveGenerator.js   # Legal quiet moves & captures
    │   ├── MoveValidator.js   # Checks a proposed move against legal list
    │   └── Game.js            # Turns, apply move, promote, win, history
    ├── ui/                    # Browser UI only
    │   ├── BoardView.js       # Renders board, coords, pieces, highlights
    │   ├── StatusView.js      # Turn label, status text, move history list
    │   ├── GameController.js  # Clicks, selection, calls engine, sounds
    │   └── SoundService.js    # Web Audio tones (move, capture, win, etc.)
    └── utils/
        └── coordinates.js     # A1 ↔ {row,col}, playable-square helpers
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  index.html + board.css                     │
│  (markup & styling)                         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  main.js                                    │
│  Creates Game, views, SoundService,         │
│  GameController; binds New Game / Sound     │
└──────────┬───────────────────┬──────────────┘
           │                   │
           ▼                   ▼
┌──────────────────┐  ┌───────────────────────┐
│  ui/*            │  │  engine/*             │
│  DOM & input     │◄─┤  Rules & state        │
│  Never decides   │  │  No document/window   │
│  legality alone  │  │  DOM usage            │
└──────────────────┘  └───────────────────────┘
```

**Design rule:** the engine never reads or writes the DOM. The UI never invents legal moves; it only displays what `Game` returns and forwards user clicks into `Game.applyMove`.

---

## File reference

### Root

| File | Functionality |
|------|----------------|
| `index.html` | App chrome: brand header, board mount (`#board`), turn/status, history list, New Game & Sound buttons. Loads CSS and all JS files in dependency order. |
| `styles/board.css` | Layout, felt/wood look, square colors, piece styles, highlights, responsive side panel. |
| `README.md` | Quick start and high-level description. |
| `RULES.md` | Complete list of rules the engine enforces. |
| `STRUCTURE.md` | This structure / responsibility guide. |

### `src/main.js`

- Finds required DOM nodes.
- Instantiates `Game`, `SoundService`, `BoardView`, `StatusView`, `GameController`.
- Binds **New Game** and **Sound** buttons.
- Starts the first render via `controller.start()`.

### `src/utils/coordinates.js`

| Export (on `Checkers`) | Role |
|------------------------|------|
| `isOnBoard` | Bounds check for row/col `0–7`. |
| `isPlayableSquare` | Dark-square test; A1 playable (`(row + col) % 2 === 0`). |
| `toAlgebraic` / `fromAlgebraic` | Convert between `{row,col}` and `A1`…`H8`. |
| `sameSquare` / `cloneSquare` | Equality and copy helpers. |

### `src/engine/` — game logic

| File | Functionality |
|------|----------------|
| `constants.js` | `BOARD_SIZE`, `PLAYER`, labels, forward deltas, king rows, diagonal directions. |
| `Piece.js` | Piece object: `color`, `isKing`, `promote()`, `clone()`. |
| `Move.js` | One step: `from`, `to`, optional `captured`; notation helpers; equality. |
| `Board.js` | 8×8 array of pieces; initial setup; get/set/move/remove; count pieces by color. |
| `MoveGenerator.js` | Builds quiet moves and captures for a side; enforces mandatory capture when listing legal moves; supports forced square for multi-jump. |
| `MoveValidator.js` | Confirms a from→to request matches a generated legal move. |
| `Game.js` | Full match state: current player, forced jump, history, winner. Applies moves, removes captures, promotes, continues multi-jumps, switches turns, detects win. Exposes `getState()` for the UI. |

**Important `Game` behaviors:**

- `applyMove(from, to)` — only entry point that changes position.
- `getLegalMoves()` / `getLegalMovesFrom(square)` — what the UI may highlight.
- `getSelectableSquares()` — which pieces the current player can click.
- `reset()` — new game.
- Promotion **ends** the turn (no post-promotion jumps same turn).

### `src/ui/` — presentation & input

| File | Functionality |
|------|----------------|
| `BoardView.js` | Builds the 8×8 grid with A–H / 1–8 labels; draws pieces and kings; highlights selected / legal / forced squares; forwards clicks. |
| `StatusView.js` | Updates turn indicator, status message, and scrollable move history. |
| `GameController.js` | Selection logic; calls `game.applyMove`; keeps selection during multi-jump; triggers sounds; refreshes both views after every action. |
| `SoundService.js` | Optional Web Audio beeps for move, capture, promote, win, new game, illegal click. |

---

## Script load order

Scripts must load in this order (as in `index.html`) so dependencies exist on `window.Checkers` before use:

1. `engine/constants.js`
2. `utils/coordinates.js`
3. `engine/Piece.js`
4. `engine/Move.js`
5. `engine/Board.js`
6. `engine/MoveGenerator.js`
7. `engine/MoveValidator.js`
8. `engine/Game.js`
9. `ui/SoundService.js`
10. `ui/BoardView.js`
11. `ui/StatusView.js`
12. `ui/GameController.js`
13. `main.js`

---

## Data flow (one click)

1. User clicks a square → `BoardView` → `GameController.onSquareClick`.
2. Controller selects a piece or attempts a move.
3. Move attempt → `Game.applyMove` → generator/validator enforce rules.
4. On success: board updates, captures removed, promotion/win checked.
5. Controller plays sound (if enabled) and calls `refresh()`.
6. `BoardView` + `StatusView` re-render from `Game.getState()`.

---

## Reusing the engine

Anything under `src/engine/` plus `src/utils/coordinates.js` is UI-agnostic. Another frontend can:

1. Load the same engine scripts (or port the classes).
2. Call `new Checkers.Game()`.
3. Drive the match with `getState()`, `getLegalMovesFrom()`, and `applyMove()`.

No HTML or CSS is required for the rules engine itself.
