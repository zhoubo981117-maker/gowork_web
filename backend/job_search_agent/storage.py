"""Data access layer.

Dual-mode storage:

* **Cloud (Vercel):** when ``TURSO_DATABASE_URL`` is set, connect to a remote
  Turso / libSQL database so rows persist across serverless invocations.
* **Local / desktop build:** otherwise fall back to a local SQLite file under
  ``DATA_DIR`` (default ``data/``) — unchanged behaviour for dev and the
  PyInstaller ``.exe``.

The SQL is written to work on both backends: explicit column lists (no reliance
on ``row_factory``), ``RETURNING`` instead of ``lastrowid``/``rowcount``, and
individual statements instead of ``executescript``.
"""

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

_TURSO_URL = os.environ.get("TURSO_DATABASE_URL") or ""
_TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN") or ""
USE_TURSO = bool(_TURSO_URL)

_CARD_COLS = ("id", "company", "role", "status", "notes", "sort_order", "created_at")
_ATT_COLS = ("id", "card_id", "type", "filename", "path")
_CARD_SEL = ", ".join(_CARD_COLS)
_ATT_SEL = ", ".join(_ATT_COLS)


def get_data_dir() -> Path:
    d = Path(os.environ.get("DATA_DIR", "data"))
    d.mkdir(parents=True, exist_ok=True)
    return d


def _connect():
    if USE_TURSO:
        import libsql  # imported lazily so local/dev does not need the package

        return libsql.connect(database=_TURSO_URL, auth_token=_TURSO_TOKEN)
    conn = sqlite3.connect(str(get_data_dir() / "kanban.sqlite3"))
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def _conn():
    conn = _connect()
    try:
        yield conn
    finally:
        try:
            conn.close()
        except Exception:
            pass


def _one(cur, cols) -> Optional[dict]:
    row = cur.fetchone()
    return dict(zip(cols, row)) if row is not None else None


def _all(cur, cols) -> list:
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def init_db() -> None:
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS cards (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                company    TEXT    NOT NULL,
                role       TEXT    NOT NULL,
                status     TEXT    NOT NULL DEFAULT 'todo',
                notes      TEXT    NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT    NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS attachments (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id  INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
                type     TEXT    NOT NULL,
                filename TEXT    NOT NULL,
                path     TEXT    NOT NULL
            )
            """
        )
        conn.commit()


# ── Cards ──────────────────────────────────────────────────────────────────

def create_card(company: str, role: str, status: str = "todo") -> dict:
    with _conn() as conn:
        nxt = conn.execute(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM cards WHERE status = ?",
            (status,),
        ).fetchone()[0]
        new_id = conn.execute(
            "INSERT INTO cards (company, role, status, sort_order) "
            "VALUES (?, ?, ?, ?) RETURNING id",
            (company, role, status, nxt),
        ).fetchone()[0]
        conn.commit()
    return get_card(new_id)


def get_card(card_id: int) -> Optional[dict]:
    with _conn() as conn:
        cur = conn.execute(
            f"SELECT {_CARD_SEL} FROM cards WHERE id = ?", (card_id,)
        )
        return _one(cur, _CARD_COLS)


def list_cards() -> list:
    with _conn() as conn:
        cur = conn.execute(
            f"SELECT {_CARD_SEL} FROM cards ORDER BY status, sort_order"
        )
        return _all(cur, _CARD_COLS)


def update_card(card_id: int, **kwargs) -> Optional[dict]:
    if not kwargs:
        return get_card(card_id)
    fields = ", ".join(f"{k} = ?" for k in kwargs)
    values = list(kwargs.values()) + [card_id]
    with _conn() as conn:
        conn.execute(f"UPDATE cards SET {fields} WHERE id = ?", values)
        conn.commit()
    return get_card(card_id)


def delete_card(card_id: int) -> bool:
    with _conn() as conn:
        # Remove children explicitly so we don't depend on FK cascade being
        # enforced on the remote backend.
        conn.execute("DELETE FROM attachments WHERE card_id = ?", (card_id,))
        deleted = conn.execute(
            "DELETE FROM cards WHERE id = ? RETURNING id", (card_id,)
        ).fetchone()
        conn.commit()
        return deleted is not None


# ── Attachments ────────────────────────────────────────────────────────────

def create_attachment(card_id: int, type_: str, filename: str, path: str) -> dict:
    with _conn() as conn:
        new_id = conn.execute(
            "INSERT INTO attachments (card_id, type, filename, path) "
            "VALUES (?, ?, ?, ?) RETURNING id",
            (card_id, type_, filename, path),
        ).fetchone()[0]
        conn.commit()
    return get_attachment(new_id)


def get_attachment(att_id: int) -> Optional[dict]:
    with _conn() as conn:
        cur = conn.execute(
            f"SELECT {_ATT_SEL} FROM attachments WHERE id = ?", (att_id,)
        )
        return _one(cur, _ATT_COLS)


def list_attachments(card_id: int) -> list:
    with _conn() as conn:
        cur = conn.execute(
            f"SELECT {_ATT_SEL} FROM attachments WHERE card_id = ?", (card_id,)
        )
        return _all(cur, _ATT_COLS)


def delete_attachment(att_id: int) -> Optional[str]:
    att = get_attachment(att_id)
    if att is None:
        return None
    with _conn() as conn:
        conn.execute("DELETE FROM attachments WHERE id = ?", (att_id,))
        conn.commit()
    return att["path"]
