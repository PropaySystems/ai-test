# User Prompts Log

Prompts used while building the Checkers game in this project.

---

## Prompt — 2026-07-17 14:07

**User prompt:**

I want to create a 2-player board game using only HTML, CSS, and vanilla JavaScript.

The game is played on an 8×8 board with 64 squares in total, consisting of alternating black and white squares (32 black and 32 white). Only the black squares are playable. The board should also have coordinates, with rows labeled 1 to 8 and columns labeled A to H.

Each player starts with 12 pieces placed on the black squares of the first three rows on opposite sides of the board. Since each row has four playable squares, each player has exactly 12 pieces. The middle two rows remain empty. Player A uses white pieces and Player B uses black pieces.

The objective is to capture all of your opponent's pieces or leave them with no legal moves. Players take turns moving one piece at a time. A normal piece can only move one square diagonally forward onto an empty square. Capturing is done by jumping diagonally over an adjacent opponent's piece into the empty square behind it, and the captured piece is removed immediately.

If the same piece can capture again after a jump, it must continue capturing until no more captures are available. If any capture is available anywhere on the board, capturing becomes mandatory and normal moves should not be allowed.

When a normal piece reaches the last row on the opponent's side, it should automatically become a King. A King can move only one square diagonally in any direction (forward or backward), just like a normal piece, but without the forward-only restriction. Kings capture by jumping over an adjacent opponent's piece into the empty square immediately beyond it and may continue making multiple captures during the same turn if additional captures are available. Kings do not move multiple squares in a single move.

The game engine should validate every move before allowing it. Illegal moves should never be accepted. Only the current player's pieces should be selectable, and when a piece is selected its legal moves should be highlighted. If capturing is mandatory, only capture moves should be highlighted.

After every move, the game should automatically remove captured pieces, check for additional captures, promote pieces when needed, switch turns only after the move is completely finished, and check if either player has won. Once the game is over, no more moves should be allowed until a new game is started.

The game should correctly handle edge cases such as pieces on corners or edges, multiple capture paths, multi-jump captures, mandatory captures, promotion after captures, no legal moves, attempts to move outside the board, moving onto occupied squares, moving the opponent's pieces, or making a normal move when a capture is available.

I want the project to have a clean architecture. Please don't put everything into one JavaScript file. Keep the game engine separate from the UI, organize the code into small reusable modules, and use meaningful class and function names. The game logic should be independent so it can be reused with another frontend in the future.

Before writing any code, first think through the project structure and architecture. If any rule is unclear, ask me instead of making assumptions.

**Images or references:**

None provided

---

## Prompt — 2026-07-17 14:11

**User prompt:**

1> Player A (White) moves first.
2> Yes. Player A (White) starts at the bottom of the board (rows 1–3) and moves toward row 8. Player B (Black) starts at the top (rows 6–8) and moves toward row 1.
3> If multiple captures are available, the player may choose any legal capture sequence. There is no requirement to choose the longest or maximum capture path.
4> Stop the turn on promotion
5> its in ai-test folder
6> you can add move history and sound but not undo add new game sounds good.

**Images or references:**

None provided

---

## Prompt — 2026-07-17 14:15

**User prompt:**

i mentioned It should be only html, css and js game. no python no framework no other languages.

**Images or references:**

None provided

---

## Prompt — 2026-07-17 14:22

**User prompt:**

now create a file that mention all the rules i have implimented and one other file with the proper structure of the project its files and functionality included.

**Images or references:**

None provided

---

## Prompt — 2026-07-17 14:27

**User prompt:**

also create a file that has these prompts in it

**Images or references:**

None provided
