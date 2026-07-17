"""Basic automated checks for the game engine."""

from __future__ import annotations

from game.board import Board, Piece, PieceType, Player, is_playable, parse_square
from game.engine import Game, Move, apply_move, generate_capture_moves, generate_legal_moves


def test_initial_setup() -> None:
    board = Board.initial()
    assert board.count_for(Player.DARK) == 12
    assert board.count_for(Player.LIGHT) == 12
    assert board.get(parse_square("a1")).owner is Player.DARK
    assert board.get(parse_square("b8")).owner is Player.LIGHT
    assert board.get(parse_square("b4")) is None
    assert is_playable(0, 0)


def test_opening_quiet_moves_only() -> None:
    game = Game()
    moves = game.legal_moves()
    assert moves
    assert all(not m.is_capture for m in moves)
    # Dark men on row 3 can step to row 4
    notations = {m.notation() for m in moves}
    assert "c3-b4" in notations or "c3-d4" in notations


def test_mandatory_capture() -> None:
    board = Board(pieces={})
    # Dark man at c3, light man at d4, empty e5 -> forced capture
    board.set(parse_square("c3"), Piece(Player.DARK, PieceType.MAN))
    board.set(parse_square("d4"), Piece(Player.LIGHT, PieceType.MAN))
    game = Game(board=board, side_to_move=Player.DARK, position_history=[])
    game.position_history = [game._position_fingerprint()]
    moves = game.legal_moves()
    assert len(moves) == 1
    assert moves[0].is_capture
    assert moves[0].notation() == "c3xe5"


def test_promotion_on_quiet_move() -> None:
    board = Board(pieces={})
    board.set(parse_square("a7"), Piece(Player.DARK, PieceType.MAN))
    # Give light a piece so the opponent still exists after promotion
    board.set(parse_square("a1"), Piece(Player.LIGHT, PieceType.KING))
    game = Game(board=board, side_to_move=Player.DARK, position_history=[])
    game.position_history = [game._position_fingerprint()]
    move = next(m for m in game.legal_moves() if m.notation() == "a7-b8")
    game.play(move)
    piece = game.board.get(parse_square("b8"))
    assert piece is not None and piece.is_king


def test_multi_jump_and_win_by_elimination() -> None:
    board = Board(pieces={})
    board.set(parse_square("c3"), Piece(Player.DARK, PieceType.MAN))
    board.set(parse_square("d4"), Piece(Player.LIGHT, PieceType.MAN))
    board.set(parse_square("f6"), Piece(Player.LIGHT, PieceType.MAN))
    # Path c3xd4 land e5, then e5xf6 land g7
    game = Game(board=board, side_to_move=Player.DARK, position_history=[])
    game.position_history = [game._position_fingerprint()]
    captures = generate_capture_moves(board, Player.DARK)
    assert any(m.notation() == "c3xe5xg7" for m in captures)
    game.play_notation("c3xe5xg7")
    assert game.board.count_for(Player.LIGHT) == 0
    assert not game.status.in_progress
    assert game.status.winner is Player.DARK


def test_newly_promoted_cannot_jump_backward_same_turn() -> None:
    """Man reaches row 8 mid-multi-jump; must not gain backward jumps same turn."""
    board = Board(pieces={})
    # Dark man at f6; light at e7; after jump lands d8 and promotes.
    # Light also at c7 — a backward jump from d8 would be over c7 to b6.
    # That must NOT be legal in the same turn.
    board.set(parse_square("f6"), Piece(Player.DARK, PieceType.MAN))
    board.set(parse_square("e7"), Piece(Player.LIGHT, PieceType.MAN))
    board.set(parse_square("c7"), Piece(Player.LIGHT, PieceType.MAN))
    moves = generate_capture_moves(board, Player.DARK)
    notations = {m.notation() for m in moves}
    assert "f6xd8" in notations
    assert "f6xd8xb6" not in notations


def test_king_can_jump_backward() -> None:
    board = Board(pieces={})
    board.set(parse_square("d4"), Piece(Player.DARK, PieceType.KING))
    board.set(parse_square("c3"), Piece(Player.LIGHT, PieceType.MAN))
    moves = generate_capture_moves(board, Player.DARK)
    assert any(m.notation() == "d4xb2" for m in moves)


def run_all() -> None:
    tests = [
        test_initial_setup,
        test_opening_quiet_moves_only,
        test_mandatory_capture,
        test_promotion_on_quiet_move,
        test_multi_jump_and_win_by_elimination,
        test_newly_promoted_cannot_jump_backward_same_turn,
        test_king_can_jump_backward,
    ]
    for fn in tests:
        fn()
        print(f"PASS {fn.__name__}")
    print(f"All {len(tests)} tests passed.")


if __name__ == "__main__":
    run_all()
