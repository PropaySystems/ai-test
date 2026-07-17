"""Board squares, pieces, and coordinate helpers for the 8×8 dark-square game."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterable, Iterator, Optional


class Player(Enum):
    DARK = 1  # Player 1
    LIGHT = 2  # Player 2

    @property
    def opponent(self) -> "Player":
        return Player.LIGHT if self is Player.DARK else Player.DARK

    @property
    def forward_row_delta(self) -> int:
        """Non-capturing forward direction in row index space (0-based)."""
        return 1 if self is Player.DARK else -1

    @property
    def promotion_row(self) -> int:
        """0-based row index where this player's standard pieces promote."""
        return 7 if self is Player.DARK else 0


class PieceType(Enum):
    MAN = "man"
    KING = "king"


@dataclass(frozen=True)
class Piece:
    owner: Player
    kind: PieceType

    @property
    def is_king(self) -> bool:
        return self.kind is PieceType.KING

    def promoted(self) -> "Piece":
        return Piece(self.owner, PieceType.KING)


# Column a=0 ... h=7; Row 1=0 ... Row 8=7
FILES = "abcdefgh"


def is_playable(col: int, row: int) -> bool:
    """Dark squares are playable; a1 (0,0) is dark."""
    return 0 <= col < 8 and 0 <= row < 8 and (col + row) % 2 == 0


def parse_square(text: str) -> tuple[int, int]:
    text = text.strip().lower()
    if len(text) != 2 or text[0] not in FILES or text[1] not in "12345678":
        raise ValueError(f"Invalid square: {text!r}")
    col = FILES.index(text[0])
    row = int(text[1]) - 1
    if not is_playable(col, row):
        raise ValueError(f"Square {text} is not a playable dark square")
    return col, row


def format_square(col: int, row: int) -> str:
    return f"{FILES[col]}{row + 1}"


# Four diagonal directions: (d_col, d_row)
DIAGONALS: tuple[tuple[int, int], ...] = (
    (-1, 1),
    (1, 1),
    (-1, -1),
    (1, -1),
)


def initial_pieces() -> dict[tuple[int, int], Piece]:
    pieces: dict[tuple[int, int], Piece] = {}
    # Player 1 (Dark): rows 1-3
    for row in range(0, 3):
        for col in range(8):
            if is_playable(col, row):
                pieces[(col, row)] = Piece(Player.DARK, PieceType.MAN)
    # Player 2 (Light): rows 6-8
    for row in range(5, 8):
        for col in range(8):
            if is_playable(col, row):
                pieces[(col, row)] = Piece(Player.LIGHT, PieceType.MAN)
    return pieces


@dataclass
class Board:
    pieces: dict[tuple[int, int], Piece]

    @classmethod
    def initial(cls) -> "Board":
        return cls(initial_pieces())

    def copy(self) -> "Board":
        return Board(dict(self.pieces))

    def get(self, square: tuple[int, int]) -> Optional[Piece]:
        return self.pieces.get(square)

    def set(self, square: tuple[int, int], piece: Optional[Piece]) -> None:
        if piece is None:
            self.pieces.pop(square, None)
        else:
            self.pieces[square] = piece

    def count_for(self, player: Player) -> int:
        return sum(1 for p in self.pieces.values() if p.owner is player)

    def pieces_for(self, player: Player) -> Iterator[tuple[tuple[int, int], Piece]]:
        for sq, piece in self.pieces.items():
            if piece.owner is player:
                yield sq, piece

    def position_key(self) -> tuple:
        """Hashable snapshot of piece placement for threefold detection."""
        items = tuple(
            sorted(
                (sq, piece.owner.value, piece.kind.value)
                for sq, piece in self.pieces.items()
            )
        )
        return items

    def render(self) -> str:
        """Human-readable board. Dark playable squares show pieces; light show '.'."""
        lines = ["  a b c d e f g h", " +-----------------+"]
        for row in range(7, -1, -1):
            cells: list[str] = []
            for col in range(8):
                if not is_playable(col, row):
                    cells.append("·")
                    continue
                piece = self.get((col, row))
                if piece is None:
                    cells.append(" ")
                elif piece.owner is Player.DARK:
                    cells.append("K" if piece.is_king else "d")
                else:
                    cells.append("Q" if piece.is_king else "l")
            lines.append(f"{row + 1}| {' '.join(cells)} |{row + 1}")
        lines.append(" +-----------------+")
        lines.append("  a b c d e f g h")
        lines.append("Legend: d/l = dark/light man, K/Q = dark/light king, · = light square")
        return "\n".join(lines)


def on_board(col: int, row: int) -> bool:
    return 0 <= col < 8 and 0 <= row < 8


def iter_playable_squares() -> Iterable[tuple[int, int]]:
    for row in range(8):
        for col in range(8):
            if is_playable(col, row):
                yield col, row
