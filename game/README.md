# Board Game Engine

Turn-based two-player game on an 8×8 board (32 dark playable squares).

## Documents

- [OFFICIAL_RULES.md](../OFFICIAL_RULES.md) — complete official rules (implementation source of truth)

## Run

```bash
# Interactive play
python3 -m game

# Short scripted demo
python3 -m game --demo

# Automated tests
python3 -m game.test_engine
```

## How to play (CLI)

1. Start with `python3 -m game`
2. Type `list` to see legal moves
3. Enter a move such as `c3-d4` or `c3xe5xg7`
4. Players alternate; Dark (Player 1) moves first

### Notation

| Action | Format | Example |
|--------|--------|---------|
| Quiet move | `from-to` | `a3-b4` |
| Capture / multi-jump | `fromxlandx...` | `c3xe5xg7` |

### Board legend

- `d` / `l` — Dark / Light standard piece
- `K` / `Q` — Dark / Light king
- `·` — non-playable light square
