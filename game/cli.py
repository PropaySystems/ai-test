#!/usr/bin/env python3
"""Interactive CLI for the turn-based 8×8 dark-square board game."""

from __future__ import annotations

import sys

from .board import Player
from .engine import Game


HELP = """
Commands:
  list              Show all legal moves
  move <notation>   Play a move (examples: a3-b4  or  c3xe5  or  c3xe5xg7)
  board             Redraw the board
  status            Show side to move, counters, and result
  help              Show this help
  quit              Exit

Notation:
  Non-capture: from-to          e.g. a3-b4
  Capture:     fromxlandx...    e.g. c3xe5xg7
""".strip()


def print_state(game: Game) -> None:
    print()
    print(game.board.render())
    print()
    side = "Player 1 (Dark)" if game.side_to_move is Player.DARK else "Player 2 (Light)"
    print(f"Side to move: {side}")
    print(f"Forty-move counter: {game.forty_move_counter}")
    print(f"Status: {game.status.describe()}")
    if game.move_log:
        print(f"Last move: {game.move_log[-1]}")
    print()


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    game = Game()

    if argv and argv[0] == "--demo":
        return run_demo()

    print("Turn-based 8×8 board game")
    print("Type 'help' for commands. Player 1 (Dark) moves first.")
    print_state(game)

    while True:
        if not game.status.in_progress:
            print(f"Game over: {game.status.describe()}")
            return 0
        try:
            line = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not line:
            continue
        parts = line.split(maxsplit=1)
        cmd = parts[0].lower()
        arg = parts[1] if len(parts) > 1 else ""

        if cmd in {"quit", "exit", "q"}:
            return 0
        if cmd == "help":
            print(HELP)
            continue
        if cmd == "board":
            print_state(game)
            continue
        if cmd == "status":
            print_state(game)
            continue
        if cmd == "list":
            moves = game.legal_moves()
            if not moves:
                print("No legal moves.")
            else:
                print(f"{len(moves)} legal move(s):")
                for m in moves:
                    print(f"  {m.notation()}")
            continue
        if cmd in {"move", "play", "m"}:
            if not arg:
                print("Usage: move <notation>")
                continue
            try:
                played = game.play_notation(arg)
            except ValueError as exc:
                print(f"Error: {exc}")
                continue
            print(f"Played {played.notation()}")
            print_state(game)
            continue

        # Bare notation without 'move' prefix
        try:
            played = game.play_notation(line)
            print(f"Played {played.notation()}")
            print_state(game)
        except ValueError:
            print(f"Unknown command or illegal move: {line!r}. Type 'help'.")


def run_demo() -> int:
    """Play a short scripted sequence to prove the engine runs."""
    game = Game()
    print("Demo: each side plays its first listed legal move a few times")
    print_state(game)
    for _ in range(6):
        moves = game.legal_moves()
        if not moves or not game.status.in_progress:
            break
        notation = moves[0].notation()
        print(f"Playing {notation} ...")
        game.play_notation(notation)
        print_state(game)
    print("Demo complete. Launch without --demo for interactive play.")
    print("Legal moves now:")
    for m in game.legal_moves():
        print(f"  {m.notation()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
