import os
import sqlite3
from pathlib import Path
from typing import Optional


def get_data_dir() -> Path:
    d = Path(os.environ.get("DATA_DIR", "data"))
    d.mkdir(parents=True, exist_ok=True)
    return d


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(get_data_dir() / "kanban.sqlite3")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS cards (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                company    TEXT    NOT NULL,
                role       TEXT    NOT NULL,
                status     TEXT    NOT NULL DEFAULT 'todo',
                notes      TEXT    NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT    NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS attachments (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id  INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
                type     TEXT    NOT NULL,
                filename TEXT    NOT NULL,
                path     TEXT    NOT NULL
            );
        """)


# ── Cards ──────────────────────────────────────────────────────────────────

def create_card(company: str, role: str, status: str = "todo") -> dict:
    with _connect() as conn:
        row = conn.execute(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 AS nxt FROM cards WHERE status = ?",
            (status,),
        ).fetchone()
        sort_order = row["nxt"]
        cur = conn.execute(
            "INSERT INTO cards (company, role, status, sort_order) VALUES (?, ?, ?, ?)",
            (company, role, status, sort_order),
        )
        conn.commit()
    return get_card(cur.lastrowid)


def get_card(card_id: int) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM cards WHERE id = ?", (card_id,)).fetchone()
        return dict(row) if row else None


def list_cards() -> list:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM cards ORDER BY status, sort_order"
        ).fetchall()
        return [dict(r) for r in rows]


def update_card(card_id: int, **kwargs) -> Optional[dict]:
    if not kwargs:
        return get_card(card_id)
    fields = ", ".join(f"{k} = ?" for k in kwargs)
    values = list(kwargs.values()) + [card_id]
    with _connect() as conn:
        conn.execute(f"UPDATE cards SET {fields} WHERE id = ?", values)
        conn.commit()
    return get_card(card_id)


def delete_card(card_id: int) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM cards WHERE id = ?", (card_id,))
        conn.commit()
        return cur.rowcount > 0


# ── Attachments ────────────────────────────────────────────────────────────

def create_attachment(card_id: int, type_: str, filename: str, path: str) -> dict:
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO attachments (card_id, type, filename, path) VALUES (?, ?, ?, ?)",
            (card_id, type_, filename, path),
        )
        conn.commit()
    return get_attachment(cur.lastrowid)


def get_attachment(att_id: int) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM attachments WHERE id = ?", (att_id,)
        ).fetchone()
        return dict(row) if row else None


def list_attachments(card_id: int) -> list:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM attachments WHERE card_id = ?", (card_id,)
        ).fetchall()
        return [dict(r) for r in rows]


def delete_attachment(att_id: int) -> Optional[str]:
    att = get_attachment(att_id)
    if att is None:
        return None
    with _connect() as conn:
        conn.execute("DELETE FROM attachments WHERE id = ?", (att_id,))
        conn.commit()
    return att["path"]
