# Neon Checkers — Game Rules

A two-player strategy board game built with vanilla JavaScript and HTML. This guide explains everything you need to know to play.

## Objective

Be the last player with pieces remaining on the board. You win by capturing **all** of your opponent's disks.

## The Board

- The board is an **8x8 grid** (64 squares), colored like a chessboard with alternating **black** and **white** squares.
- Play happens **only on the black squares**. The white squares are never used.

## The Pieces

There are **24 round disks** in total, split between two players:

| Player | Color | Disks | Starting Side |
|--------|-------|-------|---------------|
| Player 1 | Neon Blue | 12 | Bottom of the board |
| Player 2 | Neon Green | 12 | Top of the board |

Each player's 12 disks start on the black squares of the **three rows closest to them**.

## Turns

- **Player 1 (Neon Blue) always moves first.**
- Players alternate turns, making exactly **one move per turn**.

## How to Move

1. **Select a piece** — Click one of your own disks. The valid destination squares are highlighted with dots.
2. **Move it** — Click a highlighted square to move there.

### Simple Move

- A piece moves **one square diagonally** onto an empty black square.
- Regular (non-king) pieces move **forward only**:
  - Neon Blue moves **up** the board.
  - Neon Green moves **down** the board.

### Capturing (Jumping)

- If an opponent's piece sits diagonally adjacent to yours and the square **directly beyond it is empty**, you may **jump** over it.
- You land on the empty square, and the jumped opponent piece is **removed from the board**.

## Kings

- When one of your pieces reaches the **far edge** of the board (the opponent's back row), it is **promoted to a King**, marked with a star (★).
- A King can move and capture **both forward and backward** diagonally, making it more powerful.

## Winning

- The game ends when a player has **no pieces left**.
- The player with pieces remaining is declared the **winner**, shown in the status bar at the top.

## Controls

| Action | How |
|--------|-----|
| Select a piece | Click your disk |
| Move / capture | Click a highlighted square |
| Restart the game | Click the **Reset Game** button |

## Quick Tips

- Try to keep your pieces protected so they can't be jumped.
- Advancing a piece to become a King gives you a big advantage.
- Control the center of the board to maximize your movement options.

## How to Play

Open `board-game.html` in any modern web browser and start playing. No installation or internet connection required.
