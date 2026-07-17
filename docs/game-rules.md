# Edge Kings — Game Rules

Edge Kings is a fast, mobile-first draughts game for one player against a computer opponent.

## Objective

Win by either:

- capturing every opposing piece; or
- leaving the opponent with no legal move.

## Board and setup

- The board has 8 rows and 8 columns.
- Only the 32 dark squares are playable.
- Each side starts with 12 ordinary pieces on the dark squares of its nearest three rows.
- The first player is selected randomly for the opening match and alternates in rematches.
- The human player may choose either colour or request a random side.

## Ordinary pieces

- An ordinary piece moves one empty diagonal square forward.
- It captures forward or backward by jumping an adjacent opposing piece and landing on the empty square immediately beyond it.

## Mandatory captures

- A player must capture whenever at least one capture is available.
- After a capture, the same piece must continue while it has another capture.
- If several pieces or capture paths are available, the player may choose any legal option. The longest sequence is not mandatory.
- Captured pieces are removed immediately.
- A capturing piece may revisit an empty landing square during the same sequence, but it cannot capture the same piece twice.

## Kings and promotion

- An ordinary piece becomes a King when it reaches the opponent's back row.
- Promotion immediately ends the current turn, including a capture sequence.
- A King moves one empty diagonal square in any direction.
- A King captures in any diagonal direction by jumping one adjacent opposing piece into the empty square beyond it.
- Kings follow the same mandatory chained-capture rules.

## Draws

A game is automatically drawn when:

- the exact board position, including the player to move, occurs three times; or
- both players complete 40 moves without a capture or promotion.

A capture or promotion resets the no-progress counter.

At the start of a human turn, the player may offer a draw. The computer accepts only when its position evaluation supports a draw.

## Clocks

Computer games can be Untimed or give the human player 3, 5, or 10 minutes.

- Only the human clock runs.
- If time expires after a legal piece has already been selected, the player has up to two seconds to finish that move.
- Otherwise, time expiry is an immediate loss.
- An interrupted timed game pauses for one five-minute reconnection window. Failure to return is a timeout loss.

## Undo

- The human player has one undo per match.
- Undo restores the board and clocks to the position before the player's previous move and the computer reply.
- Undo cannot be used after the match has ended.

## Resignation

A player may resign at any time. Resignation is recorded as a loss.
