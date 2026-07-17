"""Move generation and game rules enforcement."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .board import (
    DIAGONALS,
    Board,
    Piece,
    PieceType,
    Player,
    format_square,
    on_board,
)


@dataclass(frozen=True)
class Jump:
    over: tuple[int, int]
    land: tuple[int, int]
    direction: tuple[int, int]


@dataclass(frozen=True)
class Move:
    """A complete legal turn: either one quiet step or a full capture path."""

    start: tuple[int, int]
    path: tuple[tuple[int, int], ...]  # landing squares in order; length 1 for quiet moves
    captures: tuple[tuple[int, int], ...] = ()
    is_capture: bool = False

    @property
    def end(self) -> tuple[int, int]:
        return self.path[-1]

    def notation(self) -> str:
        start = format_square(*self.start)
        if not self.is_capture:
            return f"{start}-{format_square(*self.end)}"
        parts = [start] + [format_square(*sq) for sq in self.path]
        return "x".join(parts)


def _forward_diagonals(player: Player) -> tuple[tuple[int, int], ...]:
    fwd = player.forward_row_delta
    return tuple(d for d in DIAGONALS if d[1] == fwd)


def _move_directions(piece: Piece, was_king_at_turn_start: bool) -> tuple[tuple[int, int], ...]:
    """Directions allowed for non-capturing moves and for jumps this turn."""
    if piece.is_king and was_king_at_turn_start:
        return DIAGONALS
    if piece.is_king and not was_king_at_turn_start:
        # Promoted during this turn: keep pre-promotion (forward-only) jump dirs.
        return _forward_diagonals(piece.owner)
    return _forward_diagonals(piece.owner)


def _quiet_directions(piece: Piece) -> tuple[tuple[int, int], ...]:
    if piece.is_king:
        return DIAGONALS
    return _forward_diagonals(piece.owner)


def generate_quiet_moves(board: Board, player: Player) -> list[Move]:
    moves: list[Move] = []
    for start, piece in board.pieces_for(player):
        for dc, dr in _quiet_directions(piece):
            land = (start[0] + dc, start[1] + dr)
            if on_board(*land) and board.get(land) is None:
                # land is automatically dark if diagonal from dark
                moves.append(Move(start=start, path=(land,), captures=(), is_capture=False))
    return moves


def _find_jumps_from(
    board: Board,
    square: tuple[int, int],
    piece: Piece,
    was_king_at_turn_start: bool,
    captured_already: set[tuple[int, int]],
) -> list[Jump]:
    jumps: list[Jump] = []
    for dc, dr in _move_directions(piece, was_king_at_turn_start):
        over = (square[0] + dc, square[1] + dr)
        land = (square[0] + 2 * dc, square[1] + 2 * dr)
        if not on_board(*land):
            continue
        victim = board.get(over)
        if victim is None or victim.owner is piece.owner:
            continue
        if over in captured_already:
            continue
        if board.get(land) is not None:
            continue
        jumps.append(Jump(over=over, land=land, direction=(dc, dr)))
    return jumps


def _explore_captures(
    board: Board,
    start: tuple[int, int],
    current: tuple[int, int],
    piece: Piece,
    was_king_at_turn_start: bool,
    path: list[tuple[int, int]],
    captured: list[tuple[int, int]],
    results: list[Move],
) -> None:
    jumps = _find_jumps_from(
        board, current, piece, was_king_at_turn_start, set(captured)
    )
    if not jumps:
        if path:
            results.append(
                Move(
                    start=start,
                    path=tuple(path),
                    captures=tuple(captured),
                    is_capture=True,
                )
            )
        return

    for jump in jumps:
        # Apply jump on a temporary board
        next_board = board.copy()
        moving = next_board.get(current)
        assert moving is not None
        next_board.set(current, None)
        next_board.set(jump.over, None)
        # Immediate promotion on landing
        landed = moving
        if not landed.is_king and jump.land[1] == landed.owner.promotion_row:
            landed = landed.promoted()
        next_board.set(jump.land, landed)

        _explore_captures(
            next_board,
            start,
            jump.land,
            landed,
            was_king_at_turn_start,
            path + [jump.land],
            captured + [jump.over],
            results,
        )


def generate_capture_moves(board: Board, player: Player) -> list[Move]:
    results: list[Move] = []
    for start, piece in list(board.pieces_for(player)):
        was_king = piece.is_king
        _explore_captures(
            board,
            start,
            start,
            piece,
            was_king,
            [],
            [],
            results,
        )
    return results


def generate_legal_moves(board: Board, player: Player) -> list[Move]:
    captures = generate_capture_moves(board, player)
    if captures:
        return captures
    return generate_quiet_moves(board, player)


def apply_move(board: Board, move: Move) -> Board:
    """Return a new board after applying a complete legal move."""
    new_board = board.copy()
    piece = new_board.get(move.start)
    if piece is None:
        raise ValueError("No piece at move start")
    new_board.set(move.start, None)
    for captured_sq in move.captures:
        new_board.set(captured_sq, None)
    # Walk path for promotion: promote if final (or intermediate) land is promo row
    current_piece = piece
    for land in move.path:
        if not current_piece.is_king and land[1] == current_piece.owner.promotion_row:
            current_piece = current_piece.promoted()
    new_board.set(move.end, current_piece)
    return new_board


def parse_move_notation(text: str, legal: list[Move]) -> Move:
    """Match user notation to a legal move."""
    raw = text.strip().lower().replace(" ", "")
    for move in legal:
        if move.notation() == raw:
            return move
    # Also allow hyphen form for captures typed as c3-e5 instead of c3xe5
    alt = raw.replace("-", "x") if "x" not in raw and raw.count("-") > 1 else raw
    for move in legal:
        if move.notation() == alt:
            return move
        # Accept partial path prefixes only if unique? No — require full path.
    raise ValueError(f"Not a legal move: {text!r}")


@dataclass
class GameStatus:
    in_progress: bool = True
    winner: Optional[Player] = None
    draw_reason: Optional[str] = None

    def describe(self) -> str:
        if self.in_progress:
            return "in progress"
        if self.winner is Player.DARK:
            return "Player 1 (Dark) wins"
        if self.winner is Player.LIGHT:
            return "Player 2 (Light) wins"
        return f"draw ({self.draw_reason})"


@dataclass
class Game:
    board: Board = field(default_factory=Board.initial)
    side_to_move: Player = Player.DARK
    forty_move_counter: int = 0
    position_history: list[tuple] = field(default_factory=list)
    status: GameStatus = field(default_factory=GameStatus)
    move_log: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.position_history:
            self.position_history.append(self._position_fingerprint())

    def _position_fingerprint(self) -> tuple:
        return (self.board.position_key(), self.side_to_move.value)

    def legal_moves(self) -> list[Move]:
        if not self.status.in_progress:
            return []
        return generate_legal_moves(self.board, self.side_to_move)

    def _check_terminal_before_turn(self) -> None:
        if not self.status.in_progress:
            return
        # Opponent already eliminated
        if self.board.count_for(self.side_to_move) == 0:
            self.status = GameStatus(
                in_progress=False, winner=self.side_to_move.opponent
            )
            return
        if not generate_legal_moves(self.board, self.side_to_move):
            self.status = GameStatus(
                in_progress=False, winner=self.side_to_move.opponent
            )

    def _check_draws_after_move(self) -> None:
        # Threefold: same position (board + side to move) three times
        fp = self._position_fingerprint()
        if self.position_history.count(fp) >= 3:
            self.status = GameStatus(
                in_progress=False, draw_reason="threefold repetition"
            )
            return
        if self.forty_move_counter >= 40:
            self.status = GameStatus(
                in_progress=False, draw_reason="forty-move rule"
            )

    def play(self, move: Move) -> None:
        if not self.status.in_progress:
            raise ValueError("Game is over")
        legal = self.legal_moves()
        if move not in legal:
            # Compare by notation for safety
            if move.notation() not in {m.notation() for m in legal}:
                raise ValueError(f"Illegal move: {move.notation()}")

        moving_piece = self.board.get(move.start)
        assert moving_piece is not None
        was_man = moving_piece.kind is PieceType.MAN

        self.board = apply_move(self.board, move)
        self.move_log.append(move.notation())

        # Forty-move rule bookkeeping
        if move.is_capture or (was_man and not move.is_capture):
            self.forty_move_counter = 0
        else:
            self.forty_move_counter += 1

        # Switch side
        self.side_to_move = self.side_to_move.opponent
        self.position_history.append(self._position_fingerprint())

        # Win by capturing all pieces
        if self.board.count_for(self.side_to_move) == 0:
            self.status = GameStatus(
                in_progress=False, winner=self.side_to_move.opponent
            )
            return

        self._check_draws_after_move()
        if not self.status.in_progress:
            return

        # No legal moves for the player about to move
        self._check_terminal_before_turn()

    def play_notation(self, text: str) -> Move:
        move = parse_move_notation(text, self.legal_moves())
        self.play(move)
        return move
