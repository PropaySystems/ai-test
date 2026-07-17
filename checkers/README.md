# Checkers

Two-player English draughts built with **HTML, CSS, and vanilla JavaScript only**. No frameworks, no build step, no other languages.

## How to play

Open `index.html` in your browser (double-click the file, or use File → Open).

## Rules

- White (Player A) moves first from ranks 1–3 toward rank 8
- Black (Player B) starts on ranks 6–8 toward rank 1
- Only dark squares are playable; A1 is dark
- Captures are mandatory; any legal capture sequence may be chosen
- Multi-jumps must be completed
- Promotion ends the turn (no further jumps after crowning)
- Kings move and capture one square diagonally in any direction

## Project structure

```
checkers/
├── index.html
├── styles/board.css
└── src/
    ├── main.js
    ├── engine/          # game logic (no DOM)
    ├── ui/              # board rendering & input
    └── utils/
```

Engine code lives under `src/engine/` and does not touch the DOM, so it can be reused with another UI later.
