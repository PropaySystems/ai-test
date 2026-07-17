# Checkers — Implemented Rules

This document describes every game rule enforced by the engine in this project.

---

## Board

- The board is **8×8** (64 squares).
- Squares alternate **black** and **white**.
- Only **black (dark) squares** are playable.
- Light squares are never used for movement or placement.
- There are **32 playable** and **32 non-playable** squares.
- Coordinates:
  - Columns labeled **A–H** (left to right from White’s view)
  - Rows labeled **1–8** (bottom to top from White’s view)
- **A1 is a playable (dark) square.**

---

## Starting position

- **Player A** uses **white** pieces.
- **Player B** uses **black** pieces.
- Each player starts with **12 pieces**.
- White pieces occupy the dark squares of ranks **1, 2, and 3**.
- Black pieces occupy the dark squares of ranks **6, 7, and 8**.
- Ranks **4 and 5** start empty.
- Each of those ranks has **4** playable squares → **3 × 4 = 12** pieces per side.

---

## Turns

- **White (Player A) moves first.**
- Players alternate turns.
- On a turn, a player moves **one** of their pieces.
- A turn may include a **multi-jump** sequence with the same piece (see Capturing).
- The turn only ends when the move sequence is fully finished.
- After the game ends, no further moves are accepted until **New Game** is started.

---

## Movement — normal pieces (men)

- A normal piece moves **one square diagonally forward** onto an **empty** playable square.
- **Forward** means:
  - White moves toward rank **8** (up the board)
  - Black moves toward rank **1** (down the board)
- Normal pieces **cannot** move backward.
- Moving onto an occupied square is illegal.
- Moving off the board is illegal.
- Moving onto a light square is illegal.

---

## Capturing — normal pieces

- Capturing is done by **jumping diagonally** over an **adjacent opponent piece** into the **empty square immediately beyond** it.
- The jumped piece is **removed immediately**.
- The landing square must be empty and on the board.
- You cannot jump your own pieces.
- You cannot jump into an occupied square.

---

## Mandatory captures

- If **any** capture is available for the current player anywhere on the board, capturing is **mandatory**.
- When captures are available, quiet (non-capturing) moves are **not** allowed.
- If several captures or capture paths exist, the player may choose **any legal capture sequence**.
- There is **no** “maximum capture” / longest-path requirement.

---

## Multi-jump (continued capturing)

- After a jump, if the **same piece** can capture again, it **must** continue.
- The player cannot end the turn early while further jumps exist for that piece.
- Only that piece may move until the multi-jump sequence ends.
- Captured pieces are removed as each jump is completed.

---

## Promotion (kings)

- When a normal piece reaches the **last rank on the opponent’s side**, it becomes a **king** automatically:
  - White promotes on rank **8**
  - Black promotes on rank **1**
- **Promotion ends the turn immediately**, even if that piece could still jump afterward as a king.
- No further captures are allowed on the same turn after crowning.

---

## Kings — movement and capturing

- A king may move **one square diagonally** in **any** direction (forward or backward).
- Kings do **not** fly: they do not slide multiple empty squares in one move.
- Kings capture the same way as men: jump over an adjacent opponent into the empty square beyond.
- Kings may also make **multi-jump** captures in one turn when available.
- Kings follow the same mandatory-capture rules as men.

---

## Selection and legality (UI + engine)

- Only the **current player’s** pieces can be selected.
- Illegal moves are never accepted; the engine validates every move before applying it.
- When a piece is selected, only its **legal destinations** are highlighted.
- When capturing is mandatory, only **capture** destinations are highlighted.
- During a forced multi-jump, only the jumping piece and its next capture squares are usable.

---

## Winning conditions

A player wins if either:

1. The opponent has **no pieces left**, or  
2. The opponent has pieces but **no legal moves**.

When a winner is determined:

- A status message announces the result.
- Further moves are blocked until a new game starts.

---

## Edge cases handled

- Pieces on board **edges** and **corners**
- Attempts to move **off the board**
- Attempts to land on **occupied** squares
- Attempts to move the **opponent’s** pieces
- Quiet moves when a **capture is available** (rejected)
- **Multiple** capture options / paths (player chooses freely)
- **Multi-jump** continuation
- **Promotion during / after** a capturing move (turn stops on promotion)
- Game over with **no legal moves** remaining for the side to play

---

## Features included (not core rules, but shipped)

- Move **history** (algebraic-style notation, e.g. `C3-D4`, `B6xD8`)
- Optional **sound** effects (toggle on/off)
- **New Game** button to reset the board and turn
- **No undo** (by design)
