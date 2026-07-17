# Edge Kings — Rules Playtest Scenarios

These scenarios define the first balance and rules checks. Automated tests use equivalent positions where possible.

## Mandatory capture

1. Give a player both a normal move and a capture.
2. Confirm only the capture is legal.
3. Give two different pieces captures.
4. Confirm the player may choose either piece.

Expected result: mandatory capture creates tactical pressure without forcing the longest path.

## Chained capture choice

1. Create a capture that branches after the first jump.
2. Confirm either branch may be selected.
3. Confirm the active piece remains selected until its chain ends.
4. Confirm captured pieces disappear immediately and cannot be captured twice.

Expected result: branching chains reward planning while remaining understandable on mobile.

## Backward capture and promotion

1. Give an ordinary piece a backward capture.
2. Confirm the capture is legal while backward non-capturing movement remains illegal.
3. Continue a capture onto the promotion row.
4. Confirm promotion ends the turn even if the new King could capture again.

Expected result: backward captures increase tactical options while the promotion stop keeps chains predictable.

## Repetition and no-progress draws

1. Repeat the same position with the same player to move three times.
2. Confirm the third occurrence ends in a draw.
3. Advance 40 moves for each player without a capture or promotion.
4. Confirm a capture or promotion resets that counter.

Expected result: stalled endgames terminate consistently without ending active positions too early.

## Undo

1. Make a human move and computer reply.
2. Undo and confirm board state, turn, counters, and clocks match the prior snapshot.
3. Confirm a second undo is unavailable.
4. Confirm undo is unavailable after a completed game.

Expected result: one recovery from an input mistake is available without making computer games consequence-free.

## Pacing

Play at least three complete games at each difficulty using the 12-piece setup.

Record:

- duration;
- total turns;
- captures and promotions;
- result;
- whether the outcome felt decided significantly before the game ended; and
- whether legal-move highlighting or chain selection caused confusion.

Target result: most Easy and Medium games finish in 5–10 minutes, while Hard remains responsive and strategically demanding.
