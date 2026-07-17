# User Prompts Log

---

## Prompt — 2026-07-17 13:50

**User prompt:**

I need a fully functional browser based game built using only HTML and vanilla JavaScript. The game is a classic 8×8 matrix board.
The name of game is (Web Game – “King in the North”)

1. Board & Setup
Board: 8×8 matrix with alternating black and white squares.

Pieces: 2 players, each starting with 12 pieces.

Initial Placement: All pieces are placed only on the dark squares. Each player’s pieces occupy the dark squares on their side the first three rows from their perspective. The board should be oriented so that a dark square is in each player’s lower-left corner.

Player Sides: Player 1 (Black pieces) and Player 2 (White pieces). Black always starts after a toss.

2. Toss & Turn Order
Before the game begins a coin toss decides which player gets the black pieces and therefore the first move.
The toss result must be clearly shown on screen.

3. Piece Movement (Men)
Men move diagonally forward one square to an adjacent, unoccupied dark square.
They cannot move backward or sideways.
Pieces may only move onto dark squares at all times.

4. Capturing Opponent Pieces
Jumping: A man captures by jumping diagonally over an opponent’s adjacent piece and landing on the immediately following empty dark square.

Forced captures: If a capture is available, it must be taken.

Multiple jumps: If, after a capture, another capture is possible from the landing square, the sequence must continue in the same turn until no further captures can be made.

5. Winning Conditions
The game ends and a player wins when:
All opponent’s pieces are captured, or
The opponent has no legal moves available (blocked).

6. Kinging, Crowning & King Powers
When a man reaches the opponent’s back row, it is crowned and becomes a King.
Visually, the king piece must be distinguished e.g., stacked piece, crown icon.

King movement: A king can move and capture both diagonally forward and backward, one square at a time, following the same capture rules.

7. Streak System & Points System
Implement a streak counter that tracks consecutive wins for each player across rounds.

Implement a points system where, for example, each game win awards 1 point. This could be session based (resets on page reload) or persistent via localStorage make it clear in the interface.

Display both streak and points prominently.

8. Player Guidance
Include a comprehensive how-to-play guide accessible from the main screen. It should explain all rules clearly (movement, capturing, kinging, winning conditions, forced captures, etc.).

Optionally, use tooltips or an animated tutorial for first-time visitors.

9. Visual & UX Requirements
Clean, amazing visuals – polished and easy to navigate.
The board, pieces, and UI must be responsive and look excellent.
Clear indicators for:
Selected piece
Valid moves
Forced capture paths
Turn indicator and toss result display.

10. Win/Loss Feedback
When a player wins:
Show a party poppers animation.
Display a pop-up message: “King in the North (John Snow)”

When a player loses:
Display a pop-up message: “Fallen Kindgom Boom....”

**Images or references:**

None provided.
