# Official Rules Document

## 1. Game Overview

This document defines the complete official rules for a turn-based, two-player board game played exclusively on an 8×8 grid. The rules below are self-contained. A programmer may implement a complete game engine from this document alone, without any external references.

- The game is played by exactly two players.
- Players alternate turns.
- Player 1 is Dark (also called Black) and moves first.
- Player 2 is Light (also called White) and moves second.
- All play occurs only on dark squares. Light squares are never occupied and never used for movement or capture.

---

## 2. Board Definition

### 2.1 Grid

- The board is an 8×8 grid of squares.
- Rows are numbered 1 through 8.
- Columns are labeled a through h, from left to right from Player 1’s perspective.
- Each square is identified by its column letter and row number (for example: a1, b2, h8).

### 2.2 Playable and Non-Playable Squares

- There are exactly 32 dark squares and 32 light squares.
- Dark squares are playable.
- Light squares are non-playable.
- A piece may never occupy, move onto, land on, or jump onto a light square.

### 2.3 Board Orientation

- The board is positioned so that a dark playable square is in the bottom-left corner of each player’s side.
- From Player 1’s perspective, square a1 (column a, row 1) is a dark playable square.
- From Player 2’s perspective, when facing the board, the bottom-left corner of their own side is also a dark playable square (which is h8 from Player 1’s perspective).
- A square is dark (playable) if and only if the sum of its zero-based column index and zero-based row index is even, when:
  - Column a = 0, b = 1, …, h = 7
  - Row 1 = 0, row 2 = 1, …, row 8 = 7
- Equivalently: square (column, row) is playable when `(columnIndex + rowIndex) % 2 == 0`.

### 2.4 Coordinate Conventions for Implementation

- Use Player 1’s perspective as the absolute coordinate system for the entire engine.
- Row numbers always increase from Player 1’s near side (row 1) to Player 1’s far side (row 8).
- Column letters always increase from left to right from Player 1’s perspective (a to h).
- Diagonal adjacency between two dark squares always means a change of exactly ±1 column and ±1 row.

---

## 3. Pieces

### 3.1 Piece Types

Each player controls pieces of exactly one of two types:

1. Standard piece (also called a man or pawn)
2. King

### 3.2 Piece Ownership

- Player 1 (Dark / Black) owns only Dark pieces.
- Player 2 (Light / White) owns only Light pieces.
- A player may never move or capture with an opponent’s piece.

### 3.3 Piece Identity on the Board

- At any moment, each playable square is either empty or occupied by exactly one piece.
- A piece is fully described by:
  - Owner: Player 1 or Player 2
  - Type: standard or king
  - Location: one playable dark square

---

## 4. Setup (Initial Position)

### 4.1 Player 1 Setup

- Player 1 (Dark / Black) occupies the twelve dark squares in rows 1, 2, and 3.
- From Player 1’s perspective, those rows are rows 1–3.
- All twelve of those pieces are standard pieces (not kings) at the start of the game.

Exact starting squares for Player 1:

- Row 1: a1, c1, e1, g1
- Row 2: b2, d2, f2, h2
- Row 3: a3, c3, e3, g3

### 4.2 Player 2 Setup

- Player 2 (Light / White) occupies the twelve dark squares in rows 6, 7, and 8.
- Those rows are numbered from Player 1’s perspective.
- All twelve of those pieces are standard pieces (not kings) at the start of the game.

Exact starting squares for Player 2:

- Row 6: b6, d6, f6, h6
- Row 7: a7, c7, e7, g7
- Row 8: b8, d8, f8, h8

### 4.3 Empty Squares at Start

- All remaining dark squares in rows 4 and 5 are empty at the start of the game.

Exact empty dark squares at start:

- Row 4: b4, d4, f4, h4
- Row 5: a5, c5, e5, g5

### 4.4 Starting Turn

- After setup, it is Player 1’s turn to move.

---

## 5. Movement Rules (Non-Capturing)

These rules apply only to non-capturing moves. Capturing is defined in Section 6 and Section 8.

### 5.1 Standard Piece Non-Capturing Movement

1. A standard piece moves only diagonally forward one square at a time onto an empty dark square.
2. Forward for Player 1 means toward increasing row numbers (from row 1 toward row 8).
3. Forward for Player 2 means toward decreasing row numbers (from row 8 toward row 1).

### 5.2 Legal Non-Capturing Destinations for a Standard Piece

- From square (column C, row R), a Player 1 standard piece may move to an empty dark square at:
  - (C − 1, R + 1), if that square exists and is empty
  - (C + 1, R + 1), if that square exists and is empty
- From square (column C, row R), a Player 2 standard piece may move to an empty dark square at:
  - (C − 1, R − 1), if that square exists and is empty
  - (C + 1, R − 1), if that square exists and is empty
- A non-capturing move may never:
  - Move more than one square
  - Move onto an occupied square
  - Move onto a light square
  - Move backward
  - Move sideways along a row or column

### 5.3 King Non-Capturing Movement

King non-capturing movement is defined in Section 8.1.

---

## 6. Capturing Rules (Standard Pieces)

### 6.1 Basic Capture

- A piece captures an opponent’s piece by jumping diagonally over it and landing on the immediate empty dark square beyond.
- The jumped square must contain an opponent’s piece.
- The landing square must be the next dark square in the same diagonal direction, must be on the board, and must be empty.
- The capturing piece moves from its current square, over the adjacent opponent piece, onto that empty landing square.
- The captured opponent piece is removed from the board as part of that jump.

### 6.2 Capture Geometry

For a jump in one of the four diagonal directions, the intermediate (captured) square is exactly one diagonal step away, and the landing square is exactly two diagonal steps away in the same direction.

From (C, R), the four possible capture patterns are:

1. Over (C − 1, R + 1), land on (C − 2, R + 2)
2. Over (C + 1, R + 1), land on (C + 2, R + 2)
3. Over (C − 1, R − 1), land on (C − 2, R − 2)
4. Over (C + 1, R − 1), land on (C + 2, R − 2)

A capture is legal only if:

- Both the intermediate square and the landing square exist on the board.
- The intermediate square contains an opponent piece.
- The landing square is empty.
- Both squares are dark playable squares (which they will be if they exist and follow diagonal geometry from a dark square).

### 6.3 Direction Limits for Standard Pieces During Capture

- A standard piece may capture only in forward diagonal directions, unless it is already a king.
- For Player 1 standard pieces, forward capture directions are patterns 1 and 2 above (increasing row).
- For Player 2 standard pieces, forward capture directions are patterns 3 and 4 above (decreasing row).
- Standard pieces may not capture backward.

### 6.4 Captures Are Mandatory

- If a player has one or more legal capturing moves available on their turn, that player must capture.
- If any capture is available, the player is forbidden from making a non-capturing move.

### 6.5 Multi-Jump Captures

- Multiple jumps in a single turn are allowed.
- After completing a jump, if the same piece can immediately make another legal jump from its new square, that piece may continue jumping in the same turn.
- Each successive jump must:
  - Begin from the square where the previous jump landed
  - Jump over an opponent piece that is still on the board
  - Land on an immediate empty dark square beyond
- A piece already captured earlier in the same multi-jump sequence is no longer on the board and cannot be jumped again.
- Captured pieces are removed immediately when jumped; they do not remain on the board for later jumps in the same turn.

### 6.6 Changing Direction During a Multi-Jump

- During a multi-jump, the direction of successive jumps may change.
- Example: a piece may jump forward-left and then forward-right in the same turn.
- Each individual jump must still be independently legal under these rules.

### 6.7 Promotion During a Multi-Jump

- If a standard piece reaches the farthest row during a multi-jump, it becomes a king immediately, but the turn continues.
- Farthest row for Player 1 is row 8.
- Farthest row for Player 2 is row 1.
- After such an immediate promotion mid-sequence:
  - The piece is a king for the remainder of the turn for the purpose of status and display.
  - However, that piece may not jump backward in the same turn unless it was already a king before the turn began.
  - In other words: a piece that promotes during the current turn retains only its pre-promotion jumping directions for the remainder of that same turn.
  - On future turns, the piece has full king movement and capture rights.

### 6.8 Completing a Capture Sequence

- If multiple capture paths exist, the player may choose any legal path.
- Once a path is chosen, the player must complete the full sequence of jumps available along that chosen path for the moving piece.
- The player may not stop a multi-jump early if further legal jumps are still available for that same piece from the current landing square under the rules in this section.
- Different branches are alternative complete paths; the player chooses one complete path, not a partial path.

---

## 7. Promotion

### 7.1 When Promotion Occurs

- When a standard piece lands on the opponent’s home row, it is immediately crowned as a king.
- Opponent’s home row for Player 1 is row 8.
- Opponent’s home row for Player 2 is row 1.
- Promotion occurs as soon as the piece lands on that row, whether the landing was by a non-capturing move or by a jump.

### 7.2 Effect of Promotion

- A king is distinguished by having enhanced movement and capture abilities, as defined in Section 8.
- A promoted piece remains owned by the same player.
- A king never reverts to a standard piece.

### 7.3 Promotion Timing and Same-Turn Restrictions

- Promotion is immediate upon landing on the promotion row.
- If promotion occurs during a multi-jump, the turn continues as described in Section 6.7.
- Newly promoted pieces do not gain backward jumping ability until a later turn.

---

## 8. King Movement and Capture

### 8.1 King Non-Capturing Movement

- Kings move diagonally both forward and backward, one square at a time.
- From (C, R), a king may non-capturing-move to any empty dark square among:
  - (C − 1, R + 1)
  - (C + 1, R + 1)
  - (C − 1, R − 1)
  - (C + 1, R − 1)
- provided the destination exists on the board and is empty.

### 8.2 King Capturing

- Kings capture by jumping diagonally over an opponent piece, forward or backward, onto the immediate empty dark square beyond.
- Kings may use all four capture patterns listed in Section 6.2.
- The intermediate square must contain an opponent piece.
- The landing square must be empty and on the board.

### 8.3 King Multi-Jumps

- Kings may perform multi-jumps.
- During a king multi-jump, the king may change direction freely, including forward and backward, as long as each successive jump is a legal capture.
- Captured pieces are removed immediately and cannot be jumped again in the same sequence.
- As with standard pieces, if multiple capture paths exist, the player chooses any one complete path and must finish that path.

---

## 9. Turn Sequence and Enforcement

### 9.1 Alternation

- Players alternate turns.
- Player 1 (Dark) moves first.
- After Player 1 completes a legal turn, it becomes Player 2’s turn.
- After Player 2 completes a legal turn, it becomes Player 1’s turn.
- This continues until the game ends under Section 10.

### 9.2 Contents of a Turn

A turn consists of exactly one of the following:

1. A single non-capturing move by one of the current player’s pieces, or
2. One or more mandatory capturing jumps by one of the current player’s pieces, forming one complete capture path

### 9.3 Mandatory Capture Enforcement

- If the current player has any capturing move available with any of their pieces, they are forbidden from making a non-capturing move.
- They must choose a legal capturing move (possibly the first jump of a multi-jump path).
- If multiple capture paths exist, the player may choose any path, but must complete the full sequence of jumps for that chosen path.

### 9.4 Legal Move Generation Priority

On a player’s turn, the engine must determine legal actions in this order:

1. Generate all legal capture sequences for all of that player’s pieces.
2. If at least one capture sequence exists, the set of legal turns is exactly that set of capture sequences.
3. If no capture sequence exists, the set of legal turns is the set of all legal non-capturing moves for that player’s pieces.
4. If neither capture sequences nor non-capturing moves exist, the player has no legal moves (see Section 10).

### 9.5 Turn Completion

- A non-capturing turn ends immediately after the single move and any resulting promotion.
- A capturing turn ends when the chosen capture path is fully completed and no further legal continuation jump exists for that moving piece under these rules.
- After the turn ends, check for win, loss, or draw conditions before the opponent’s turn begins, and also at the start of the opponent’s turn when testing whether that opponent has any legal moves.

---

## 10. Win, Loss, and Draw Conditions

### 10.1 Wins

A player wins if any of the following is true:

1. That player has captured all of the opponent’s pieces. The opponent has zero pieces remaining on the board.
2. On the opponent’s turn, the opponent has no legal moves.
   - This includes the case where the opponent still has pieces but all of them are blocked.
   - This includes the case where the opponent has no pieces remaining.

When condition 2 is detected at the start of a player’s turn, that player loses and the opponent wins.

### 10.2 Draws

A draw is declared if either of the following is true:

1. Threefold repetition:
   - The same board position occurs three times with the same player to move.
   - A “board position” for this purpose includes:
     - The location of every piece
     - The owner of every piece
     - The type of every piece (standard or king)
     - Which player is about to move
   - The three occurrences do not need to be consecutive.

2. Forty-move rule:
   - Forty consecutive moves have been made without a capture and without a pawn (standard piece) move.
   - For this rule, “move” means one completed player turn.
   - A turn that includes a capture resets the forty-move counter to zero.
   - A turn in which a standard piece (pawn/man) makes a non-capturing move resets the forty-move counter to zero.
   - A turn that is only a king non-capturing move does not reset the counter.
   - When the counter reaches 40, the game is a draw.

### 10.3 End of Game

- When a win or draw condition is met, the game ends immediately.
- No further moves are legal after the game has ended.

---

## 11. Definitions for Implementers

### 11.1 Absolute Directions

Using Player 1’s coordinate system:

- Forward for Player 1: increasing row
- Backward for Player 1: decreasing row
- Forward for Player 2: decreasing row
- Backward for Player 2: increasing row

### 11.2 Diagonal Step

A diagonal step changes column by exactly 1 and row by exactly 1, preserving play on dark squares.

### 11.3 Jump

A jump is a diagonal move of exactly two steps in one consistent direction over an occupied intermediate square onto an empty landing square.

### 11.4 Capture Path

A capture path is an ordered sequence of one or more jumps by the same piece in one turn, where each jump after the first starts from the previous landing square, and captured pieces from earlier jumps in the path are already removed.

### 11.5 Pawn / Standard Piece Move (for Forty-Move Rule)

- Any completed turn in which the moving piece was a standard piece at the start of the turn and the turn was a non-capturing move counts as a pawn move and resets the forty-move counter.
- Capture turns reset the counter regardless of piece type.
- Non-capturing king moves do not reset the counter.

---

## 12. Formal Game State

A complete implementable game state includes:

1. The contents of all 32 dark squares (empty, or piece with owner and type)
2. The side to move (Player 1 or Player 2)
3. A history of positions for threefold-repetition detection, where each history entry stores the board contents plus side to move
4. A forty-move counter as defined in Section 10.2
5. A game-status flag: in progress, Player 1 wins, Player 2 wins, or draw

Optional but recommended for move execution:

6. Whether the piece currently mid-turn (if any) was already a king at the beginning of the turn, used to enforce Section 6.7

---

## 13. Required Engine Behavior Summary

An engine implementing these rules must:

1. Place pieces according to Section 4 at game start.
2. Generate only legal moves according to Sections 5, 6, 7, 8, and 9.
3. Force captures whenever any capture exists.
4. Require full completion of a chosen multi-jump path.
5. Promote immediately on landing on the promotion row.
6. Restrict same-turn backward jumping after mid-turn promotion for pieces that were not already kings.
7. Alternate turns starting with Player 1.
8. Detect wins by elimination and by opponent having no legal moves.
9. Detect draws by threefold repetition and by the forty-move rule.
10. Reject any action that violates these rules.

---

## 14. Notation for Moves (Recommended for Testing Interfaces)

This section does not change the rules of play. It only defines a recommended plain-text notation so humans and programs can enter and display moves.

### 14.1 Squares

- Squares are written as column letter plus row number, lowercase column preferred: a1, b2, …, h8.

### 14.2 Non-Capturing Move

- Write: `from-to`
- Example: `a3-b4`

### 14.3 Capturing Move / Multi-Jump

- Write the starting square, then each landing square, separated by `x`
- Example single jump: `c3xe5`
- Example multi-jump: `c3xe5xg7`

### 14.4 Turn Output

- After each completed turn, an implementation may print the board, side to move, forty-move counter, and game status.

---

## 15. Initial Position Checklist

Before the first move, verify all of the following:

1. Board is 8×8 with dark square at a1.
2. Player 1 has exactly 12 standard pieces on rows 1–3 dark squares listed in Section 4.1.
3. Player 2 has exactly 12 standard pieces on rows 6–8 dark squares listed in Section 4.2.
4. Rows 4–5 dark squares are empty.
5. Side to move is Player 1.
6. Forty-move counter is 0.
7. Position history contains the initial position once.
8. Game status is in progress.
