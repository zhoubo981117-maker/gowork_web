# Job Search Kanban EXE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the project into a two-feature Windows EXE — drag-and-drop kanban board + JD image paste / resume file upload — auto-launching in a browser on double-click.

**Architecture:** FastAPI backend with stdlib sqlite3, vanilla JS frontend with Sortable.js for kanban drag-and-drop, and a threading-based launcher that starts uvicorn then opens the browser. PyInstaller bundles everything into a single `JobSearchKanban.exe`.

**Tech Stack:** Python 3.11, FastAPI, Uvicorn, Pydantic v2, python-multipart, Sortable.js, PyInstaller

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `pyproject.toml` | Modify | Trim deps to minimal set |
| `tests/test_matching.py` | Delete | Old analysis tests, replaced |
| `tests/conftest.py` | Create | pytest fixtures: tmp DB + TestClient |
| `tests/test_cards.py` | Create | Cards CRUD API tests |
| `tests/test_files.py` | Create | File upload/serve/delete tests |
| `backend/job_search_agent/__init__.py` | Keep | Package marker |
| `backend/job_search_agent/schemas.py` | Create | Pydantic models |
| `backend/job_search_agent/storage.py` | Create | SQLite CRUD (stdlib sqlite3) |
| `backend/job_search_agent/routers/__init__.py` | Create | Router package marker |
| `backend/job_search_agent/routers/cards.py` | Create | Cards API endpoints |
| `backend/job_search_agent/routers/files.py` | Create | File upload/serve/delete endpoints |
| `backend/job_search_agent/main.py` | Create | FastAPI app + static files + lifespan |
| `frontend/index.html` | Create | Kanban HTML (5 columns + detail panel) |
| `frontend/styles.css` | Create | Board + card + panel styles |
| `frontend/app.js` | Create | Sortable.js + fetch + paste handler |
| `frontend/sortable.min.js` | Create | Vendored Sortable.js (offline support) |
| `launcher.py` | Create | Entry point: start uvicorn thread, open browser |
| `job_search.spec` | Create | PyInstaller single-file spec |

---

## Task 0: Clean Up and Update Dependencies

**Files:**
- Modify: `pyproject.toml`
- Delete: `tests/test_matching.py`

- [ ] **Step 1: Delete old test file**

```powershell
Remove-Item "d:\AI相关\找工作Agent\job-search-agent\tests\test_matching.py"
```

- [ ] **Step 2: Rewrite pyproject.toml**

Replace entire file with:

```toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "job-search-kanban"
version = "0.2.0"
description = "Local-first job search kanban with drag-and-drop and file attachments."
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.115.0",
  "uvicorn[standard]>=0.30.0",
  "pydantic>=2.7.0",
  "python-multipart>=0.0.9",
]

[project.optional-dependencies]
dev = [
  "httpx>=0.27.0",
  "pytest>=8.0.0",
  "pytest-asyncio>=0.23.0",
  "ruff>=0.6.0",
]
build = [
  "pyinstaller>=6.0.0",
]

[tool.setuptools]
package-dir = {"" = "backend"}

[tool.setuptools.packages.find]
where = ["backend"]

[tool.pytest.ini_options]
pythonpath = ["backend"]
testpaths = ["tests"]

[tool.ruff]
line-length = 100
target-version = "py311"
```

- [ ] **Step 3: Install updated dependencies**

```powershell
cd "d:\AI相关\找工作Agent\job-search-agent"
.\.venv\Scripts\pip install -e ".[dev]"
```

Expected: packages install without errors.

- [ ] **Step 4: Commit**

```powershell
git add pyproject.toml
git commit -m "chore: trim deps to kanban-only set"
```

---

## Task 1: Schemas

**Files:**
- Create: `backend/job_search_agent/schemas.py`
- Create: `tests/test_schemas.py`

- [ ] **Step 1: Write failing schema test**

Create `tests/test_schemas.py`:

```python
import pytest
from pydantic import ValidationError
from job_search_agent.schemas import CardCreate, CardUpdate, CardOut, AttachmentOut

def test_card_create_valid():
    c = CardCreate(company="Google", role="SWE")
    assert c.status == "todo"

def test_card_create_rejects_bad_status():
    with pytest.raises(ValidationError):
        CardCreate(company="Google", role="SWE", status="bogus")

def test_card_update_all_optional():
    u = CardUpdate()
    assert u.company is None

def test_attachment_out_fields():
    a = AttachmentOut(id=1, card_id=2, type="image", filename="jd.png")
    assert a.type == "image"
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
cd "d:\AI相关\找工作Agent\job-search-agent"
.\.venv\Scripts\pytest tests/test_schemas.py -v 2>&1 | head -30
```

Expected: ImportError or similar — schemas module does not exist yet.

- [ ] **Step 3: Write schemas.py**

Create `backend/job_search_agent/schemas.py`:

```python
from typing import Optional, Literal
from pydantic import BaseModel

VALID_STATUSES = Literal["todo", "applied", "interview", "offer", "rejected"]


class CardCreate(BaseModel):
    company: str
    role: str
    status: VALID_STATUSES = "todo"


class CardUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    status: Optional[VALID_STATUSES] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None


class CardOut(BaseModel):
    id: int
    company: str
    role: str
    status: str
    notes: str
    sort_order: int
    created_at: str


class AttachmentOut(BaseModel):
    id: int
    card_id: int
    type: str
    filename: str
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
.\.venv\Scripts\pytest tests/test_schemas.py -v
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/job_search_agent/schemas.py tests/test_schemas.py
git commit -m "feat: add Pydantic schemas for cards and attachments"
```

---

## Task 2: Storage Layer

**Files:**
- Create: `backend/job_search_agent/storage.py`
- Create: `tests/test_storage.py`

- [ ] **Step 1: Write failing storage tests**

Create `tests/test_storage.py`:

```python
import os
import pytest
from job_search_agent import storage


@pytest.fixture(autouse=True)
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    storage.init_db()


def test_create_and_get_card():
    card = storage.create_card("Alibaba", "Backend Engineer")
    assert card["id"] == 1
    assert card["company"] == "Alibaba"
    assert card["status"] == "todo"
    assert storage.get_card(1) == card


def test_list_cards_empty_then_populated():
    assert storage.list_cards() == []
    storage.create_card("ByteDance", "Infra SWE")
    assert len(storage.list_cards()) == 1


def test_update_card_status():
    storage.create_card("Tencent", "PM")
    updated = storage.update_card(1, status="applied")
    assert updated["status"] == "applied"


def test_delete_card():
    storage.create_card("Meituan", "SRE")
    assert storage.delete_card(1) is True
    assert storage.get_card(1) is None
    assert storage.delete_card(1) is False


def test_attachment_crud(tmp_path):
    storage.create_card("JD", "Dev")
    att = storage.create_attachment(1, "image", "jd.png", str(tmp_path / "jd.png"))
    assert att["card_id"] == 1
    assert storage.get_attachment(att["id"]) == att
    assert len(storage.list_attachments(1)) == 1
    path = storage.delete_attachment(att["id"])
    assert path == str(tmp_path / "jd.png")
    assert storage.get_attachment(att["id"]) is None


def test_sort_order_increments_within_status():
    c1 = storage.create_card("A", "Dev", "todo")
    c2 = storage.create_card("B", "Dev", "todo")
    assert c2["sort_order"] == c1["sort_order"] + 1
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
.\.venv\Scripts\pytest tests/test_storage.py -v 2>&1 | head -20
```

Expected: ImportError — storage module not found.

- [ ] **Step 3: Write storage.py**

Create `backend/job_search_agent/storage.py`:

```python
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


def list_cards() -> list[dict]:
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


def list_attachments(card_id: int) -> list[dict]:
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
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
.\.venv\Scripts\pytest tests/test_storage.py -v
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/job_search_agent/storage.py tests/test_storage.py
git commit -m "feat: add SQLite storage layer for cards and attachments"
```

---

## Task 3: Cards Router

**Files:**
- Create: `backend/job_search_agent/routers/__init__.py`
- Create: `backend/job_search_agent/routers/cards.py`
- Create: `tests/conftest.py`
- Create: `tests/test_cards.py`

- [ ] **Step 1: Create router package and conftest**

Create `backend/job_search_agent/routers/__init__.py` (empty file).

Create `tests/conftest.py`:

```python
import os
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    # Import after env var is set so storage picks up tmp_path
    from job_search_agent.main import app
    with TestClient(app) as c:
        yield c
```

- [ ] **Step 2: Write failing cards tests**

Create `tests/test_cards.py`:

```python
def test_list_cards_empty(client):
    r = client.get("/api/cards")
    assert r.status_code == 200
    assert r.json() == []


def test_create_card(client):
    r = client.post("/api/cards", json={"company": "Google", "role": "SWE"})
    assert r.status_code == 201
    data = r.json()
    assert data["company"] == "Google"
    assert data["status"] == "todo"
    assert data["id"] == 1


def test_create_card_bad_status(client):
    r = client.post("/api/cards", json={"company": "X", "role": "Y", "status": "bogus"})
    assert r.status_code == 422


def test_update_card_status(client):
    client.post("/api/cards", json={"company": "Meta", "role": "PM"})
    r = client.patch("/api/cards/1", json={"status": "applied"})
    assert r.status_code == 200
    assert r.json()["status"] == "applied"


def test_update_card_not_found(client):
    r = client.patch("/api/cards/99", json={"notes": "hi"})
    assert r.status_code == 404


def test_delete_card(client):
    client.post("/api/cards", json={"company": "Amazon", "role": "DE"})
    r = client.delete("/api/cards/1")
    assert r.status_code == 204
    assert client.get("/api/cards").json() == []


def test_delete_card_not_found(client):
    r = client.delete("/api/cards/99")
    assert r.status_code == 404
```

- [ ] **Step 3: Run tests to verify they fail**

```powershell
.\.venv\Scripts\pytest tests/test_cards.py -v 2>&1 | head -20
```

Expected: errors about missing modules.

- [ ] **Step 4: Write cards.py**

Create `backend/job_search_agent/routers/cards.py`:

```python
from fastapi import APIRouter, HTTPException
from job_search_agent.schemas import CardCreate, CardUpdate, CardOut
from job_search_agent import storage

router = APIRouter(prefix="/api/cards", tags=["cards"])


@router.get("", response_model=list[CardOut])
def list_cards():
    return storage.list_cards()


@router.post("", response_model=CardOut, status_code=201)
def create_card(body: CardCreate):
    return storage.create_card(body.company, body.role, body.status)


@router.patch("/{card_id}", response_model=CardOut)
def update_card(card_id: int, body: CardUpdate):
    card = storage.update_card(card_id, **body.model_dump(exclude_none=True))
    if card is None:
        raise HTTPException(404, "Card not found")
    return card


@router.delete("/{card_id}", status_code=204)
def delete_card(card_id: int):
    if not storage.delete_card(card_id):
        raise HTTPException(404, "Card not found")
```

- [ ] **Step 5: Write main.py (needed for TestClient in conftest)**

Create `backend/job_search_agent/main.py`:

```python
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from job_search_agent import storage
from job_search_agent.routers import cards, files


def _frontend_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / "frontend"  # type: ignore[attr-defined]
    return Path(__file__).parent.parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    storage.init_db()
    yield


app = FastAPI(title="Job Search Kanban", lifespan=lifespan)

app.include_router(cards.router)
app.include_router(files.router)


@app.get("/")
def index():
    return FileResponse(str(_frontend_dir() / "index.html"))


frontend = _frontend_dir()
if frontend.exists():
    app.mount("/static", StaticFiles(directory=str(frontend)), name="static")
```

- [ ] **Step 6: Run cards tests to verify they pass**

```powershell
.\.venv\Scripts\pytest tests/test_cards.py -v
```

Expected: 7 tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add backend/job_search_agent/routers/ backend/job_search_agent/main.py tests/conftest.py tests/test_cards.py
git commit -m "feat: add cards CRUD router and FastAPI app skeleton"
```

---

## Task 4: Files Router

**Files:**
- Create: `backend/job_search_agent/routers/files.py`
- Create: `tests/test_files.py`

- [ ] **Step 1: Write failing file tests**

Create `tests/test_files.py`:

```python
import io


def _make_png() -> bytes:
    # Minimal 1x1 PNG bytes
    import base64
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
        "YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    )


def test_upload_image(client):
    client.post("/api/cards", json={"company": "A", "role": "B"})
    png = _make_png()
    r = client.post(
        "/api/files/upload?card_id=1&type=image",
        files={"file": ("jd.png", io.BytesIO(png), "image/png")},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["type"] == "image"
    assert data["filename"] == "jd.png"
    assert data["card_id"] == 1


def test_upload_rejects_wrong_extension(client):
    client.post("/api/cards", json={"company": "A", "role": "B"})
    r = client.post(
        "/api/files/upload?card_id=1&type=image",
        files={"file": ("resume.pdf", io.BytesIO(b"data"), "application/pdf")},
    )
    assert r.status_code == 400


def test_upload_rejects_missing_card(client):
    png = _make_png()
    r = client.post(
        "/api/files/upload?card_id=999&type=image",
        files={"file": ("jd.png", io.BytesIO(png), "image/png")},
    )
    assert r.status_code == 404


def test_serve_file(client):
    client.post("/api/cards", json={"company": "A", "role": "B"})
    png = _make_png()
    r = client.post(
        "/api/files/upload?card_id=1&type=image",
        files={"file": ("jd.png", io.BytesIO(png), "image/png")},
    )
    att_id = r.json()["id"]
    r2 = client.get(f"/api/files/{att_id}")
    assert r2.status_code == 200
    assert r2.content == png


def test_list_card_files(client):
    client.post("/api/cards", json={"company": "A", "role": "B"})
    png = _make_png()
    client.post(
        "/api/files/upload?card_id=1&type=image",
        files={"file": ("jd.png", io.BytesIO(png), "image/png")},
    )
    r = client.get("/api/files/card/1")
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_delete_file(client):
    client.post("/api/cards", json={"company": "A", "role": "B"})
    png = _make_png()
    r = client.post(
        "/api/files/upload?card_id=1&type=image",
        files={"file": ("jd.png", io.BytesIO(png), "image/png")},
    )
    att_id = r.json()["id"]
    r2 = client.delete(f"/api/files/{att_id}")
    assert r2.status_code == 204
    r3 = client.get(f"/api/files/{att_id}")
    assert r3.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
.\.venv\Scripts\pytest tests/test_files.py -v 2>&1 | head -20
```

Expected: errors — files router not imported in main.py yet (we already have the import, so it will be ImportError on files.py missing).

- [ ] **Step 3: Write files.py**

Create `backend/job_search_agent/routers/files.py`:

```python
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse

from job_search_agent.schemas import AttachmentOut
from job_search_agent import storage

router = APIRouter(prefix="/api/files", tags=["files"])

_ALLOWED: dict[str, list[str]] = {
    "image": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    "pdf": [".pdf"],
    "docx": [".docx"],
}


def _file_dir(card_id: int) -> Path:
    d = storage.get_data_dir() / "files" / str(card_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


@router.post("/upload", response_model=AttachmentOut, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    card_id: int = Query(...),
    type: str = Query(...),
):
    if type not in _ALLOWED:
        raise HTTPException(400, f"Unknown type '{type}'")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in _ALLOWED[type]:
        raise HTTPException(400, f"Extension '{suffix}' not valid for type '{type}'")
    if storage.get_card(card_id) is None:
        raise HTTPException(404, "Card not found")

    dest = _file_dir(card_id) / f"{uuid.uuid4()}{suffix}"
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    return storage.create_attachment(card_id, type, file.filename or dest.name, str(dest))


@router.get("/card/{card_id}", response_model=list[AttachmentOut])
def list_card_files(card_id: int):
    if storage.get_card(card_id) is None:
        raise HTTPException(404, "Card not found")
    return storage.list_attachments(card_id)


@router.get("/{att_id}")
def serve_file(att_id: int):
    att = storage.get_attachment(att_id)
    if att is None:
        raise HTTPException(404, "Attachment not found")
    path = Path(att["path"])
    if not path.exists():
        raise HTTPException(404, "File missing from disk")
    return FileResponse(path, filename=att["filename"])


@router.delete("/{att_id}", status_code=204)
def delete_file(att_id: int):
    path_str = storage.delete_attachment(att_id)
    if path_str is None:
        raise HTTPException(404, "Attachment not found")
    p = Path(path_str)
    if p.exists():
        p.unlink()
```

Also update `storage.py` to export `get_data_dir` (it already is a function, just ensure it's importable):

The function `get_data_dir()` is already defined in `storage.py` — no change needed.

- [ ] **Step 4: Run tests to verify they pass**

```powershell
.\.venv\Scripts\pytest tests/test_files.py -v
```

Expected: 6 tests PASS.

- [ ] **Step 5: Run full test suite**

```powershell
.\.venv\Scripts\pytest tests/ -v
```

Expected: all tests PASS (test_schemas + test_storage + test_cards + test_files).

- [ ] **Step 6: Commit**

```powershell
git add backend/job_search_agent/routers/files.py tests/test_files.py
git commit -m "feat: add file upload/serve/delete router"
```

---

## Task 5: Frontend — Sortable.js

**Files:**
- Create: `frontend/sortable.min.js`

- [ ] **Step 1: Download Sortable.js**

```powershell
New-Item -ItemType Directory -Force "d:\AI相关\找工作Agent\job-search-agent\frontend" | Out-Null
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js" -OutFile "d:\AI相关\找工作Agent\job-search-agent\frontend\sortable.min.js"
```

- [ ] **Step 2: Verify download**

```powershell
(Get-Item "d:\AI相关\找工作Agent\job-search-agent\frontend\sortable.min.js").Length
```

Expected: > 10000 bytes.

- [ ] **Step 3: Commit**

```powershell
git add frontend/sortable.min.js
git commit -m "chore: vendor Sortable.js 1.15.2 for offline use"
```

---

## Task 6: Frontend — HTML + CSS

**Files:**
- Create: `frontend/index.html`
- Create: `frontend/styles.css`

- [ ] **Step 1: Write index.html**

Create `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>求职看板</title>
  <link rel="stylesheet" href="/static/styles.css" />
</head>
<body>
  <header class="app-header">
    <h1>求职看板</h1>
  </header>

  <main class="board" id="board">
    <div class="column" data-status="todo">
      <div class="col-header">
        <span class="col-title">待投递</span>
        <button class="add-btn" data-status="todo">＋</button>
      </div>
      <div class="card-list" id="col-todo" data-status="todo"></div>
    </div>
    <div class="column" data-status="applied">
      <div class="col-header">
        <span class="col-title">已投递</span>
        <button class="add-btn" data-status="applied">＋</button>
      </div>
      <div class="card-list" id="col-applied" data-status="applied"></div>
    </div>
    <div class="column" data-status="interview">
      <div class="col-header">
        <span class="col-title">面试中</span>
        <button class="add-btn" data-status="interview">＋</button>
      </div>
      <div class="card-list" id="col-interview" data-status="interview"></div>
    </div>
    <div class="column" data-status="offer">
      <div class="col-header">
        <span class="col-title">收到 Offer</span>
        <button class="add-btn" data-status="offer">＋</button>
      </div>
      <div class="card-list" id="col-offer" data-status="offer"></div>
    </div>
    <div class="column" data-status="rejected">
      <div class="col-header">
        <span class="col-title">已拒绝</span>
        <button class="add-btn" data-status="rejected">＋</button>
      </div>
      <div class="card-list" id="col-rejected" data-status="rejected"></div>
    </div>
  </main>

  <!-- ── Detail panel ──────────────────────────────────────── -->
  <aside class="detail-panel" id="detail-panel" hidden>
    <div class="panel-header">
      <span id="panel-title">岗位详情</span>
      <button id="close-panel" title="关闭">✕</button>
    </div>
    <div class="panel-body">
      <div class="form-group">
        <label>公司</label>
        <input id="edit-company" type="text" />
      </div>
      <div class="form-group">
        <label>岗位</label>
        <input id="edit-role" type="text" />
      </div>
      <div class="form-group">
        <label>备注</label>
        <textarea id="edit-notes" rows="4"></textarea>
      </div>
      <div class="panel-actions">
        <button id="save-card" class="btn-primary">保存</button>
        <button id="delete-card" class="btn-danger">删除</button>
      </div>

      <hr />

      <div class="section-title">JD 截图</div>
      <div class="paste-zone" id="paste-zone" tabindex="0">
        点击此处，然后 Ctrl+V 粘贴截图
      </div>
      <div class="attachments-grid" id="images-grid"></div>

      <div class="section-title" style="margin-top:16px;">简历文件</div>
      <label class="file-label">
        选择文件（PDF / Word）
        <input type="file" id="file-input" accept=".pdf,.docx" />
      </label>
      <div class="files-list" id="files-list"></div>
    </div>
  </aside>

  <!-- ── Add card modal ──────────────────────────────────────── -->
  <div class="modal-overlay" id="modal-overlay" hidden>
    <div class="modal">
      <h3>新建岗位</h3>
      <input id="new-company" type="text" placeholder="公司名称" />
      <input id="new-role" type="text" placeholder="岗位名称" />
      <div class="modal-actions">
        <button id="confirm-add" class="btn-primary">创建</button>
        <button id="cancel-add">取消</button>
      </div>
    </div>
  </div>

  <script src="/static/sortable.min.js"></script>
  <script src="/static/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write styles.css**

Create `frontend/styles.css`:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f0f2f5;
  color: #1a1a2e;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  background: #1a1a2e;
  color: #fff;
  padding: 12px 24px;
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
}

/* ── Board ── */
.board {
  display: flex;
  gap: 12px;
  padding: 16px;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
}

.column {
  background: #e8eaf0;
  border-radius: 10px;
  width: 220px;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.col-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  font-weight: 600;
  font-size: 14px;
  color: #555;
}

.add-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #888;
  line-height: 1;
  padding: 0 4px;
}
.add-btn:hover { color: #333; }

.card-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 8px;
  min-height: 60px;
}

/* ── Card ── */
.card {
  background: #fff;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
  transition: box-shadow .15s;
  user-select: none;
}
.card:hover { box-shadow: 0 3px 8px rgba(0,0,0,.15); }
.card.sortable-ghost { opacity: .4; }
.card.sortable-chosen { box-shadow: 0 6px 16px rgba(0,0,0,.2); }

.card-company { font-size: 12px; color: #888; margin-bottom: 2px; }
.card-role    { font-size: 14px; font-weight: 600; }

/* ── Detail panel ── */
.detail-panel {
  position: fixed;
  right: 0; top: 0; bottom: 0;
  width: 360px;
  background: #fff;
  box-shadow: -4px 0 20px rgba(0,0,0,.12);
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  font-weight: 600;
}

#close-panel {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #888;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 12px; color: #888; margin-bottom: 4px; }
.form-group input,
.form-group textarea {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
}
.form-group input:focus,
.form-group textarea:focus { border-color: #4a90e2; }

.panel-actions { display: flex; gap: 8px; margin-bottom: 16px; }

hr { border: none; border-top: 1px solid #eee; margin: 12px 0; }

.section-title { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px; }

/* ── Paste zone ── */
.paste-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: #aaa;
  font-size: 13px;
  cursor: pointer;
  transition: border-color .2s, background .2s;
  outline: none;
}
.paste-zone:focus,
.paste-zone.active { border-color: #4a90e2; background: #f0f6ff; color: #4a90e2; }

.attachments-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.att-thumb {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #eee;
}
.att-thumb img {
  width: 100%; height: 100%; object-fit: cover; cursor: zoom-in;
}
.att-thumb .del-btn {
  position: absolute; top: 2px; right: 2px;
  background: rgba(0,0,0,.5); color: #fff;
  border: none; border-radius: 50%;
  width: 18px; height: 18px;
  font-size: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

/* ── File label ── */
.file-label {
  display: inline-block;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 8px;
}
.file-label input { display: none; }

.files-list { display: flex; flex-direction: column; gap: 6px; }
.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #f9f9f9;
  border-radius: 6px;
  font-size: 13px;
}
.file-item a { flex: 1; color: #4a90e2; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-item a:hover { text-decoration: underline; }
.file-item .del-btn {
  background: none; border: none; cursor: pointer; color: #aaa; font-size: 14px;
}
.file-item .del-btn:hover { color: #e74c3c; }

/* ── Buttons ── */
.btn-primary {
  background: #4a90e2; color: #fff;
  border: none; border-radius: 6px;
  padding: 8px 16px; font-size: 14px; cursor: pointer;
}
.btn-primary:hover { background: #357abd; }

.btn-danger {
  background: #fff; color: #e74c3c;
  border: 1px solid #e74c3c; border-radius: 6px;
  padding: 8px 16px; font-size: 14px; cursor: pointer;
}
.btn-danger:hover { background: #fdf0f0; }

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
}

.modal {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 320px;
  box-shadow: 0 8px 32px rgba(0,0,0,.2);
}
.modal h3 { margin-bottom: 16px; font-size: 16px; }
.modal input {
  width: 100%; border: 1px solid #ddd; border-radius: 6px;
  padding: 8px 10px; font-size: 14px; margin-bottom: 10px; outline: none;
}
.modal input:focus { border-color: #4a90e2; }
.modal-actions { display: flex; gap: 8px; margin-top: 4px; }

/* ── Lightbox ── */
.lightbox {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.85);
  display: flex; align-items: center; justify-content: center;
  z-index: 300; cursor: zoom-out;
}
.lightbox img { max-width: 90vw; max-height: 90vh; border-radius: 4px; }
```

- [ ] **Step 3: Commit HTML + CSS**

```powershell
git add frontend/index.html frontend/styles.css
git commit -m "feat: add kanban HTML layout and styles"
```

---

## Task 7: Frontend — JavaScript

**Files:**
- Create: `frontend/app.js`

- [ ] **Step 1: Write app.js**

Create `frontend/app.js`:

```javascript
// ── State ──────────────────────────────────────────────────────────────────
let currentCardId = null;

const COLUMNS = ["todo", "applied", "interview", "offer", "rejected"];

// ── API helpers ────────────────────────────────────────────────────────────
const api = {
  async getCards() {
    const r = await fetch("/api/cards");
    return r.json();
  },
  async createCard(company, role, status) {
    const r = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, role, status }),
    });
    return r.json();
  },
  async updateCard(id, data) {
    const r = await fetch(`/api/cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return r.json();
  },
  async deleteCard(id) {
    await fetch(`/api/cards/${id}`, { method: "DELETE" });
  },
  async getAttachments(cardId) {
    const r = await fetch(`/api/files/card/${cardId}`);
    return r.json();
  },
  async uploadFile(cardId, type, file) {
    const form = new FormData();
    form.append("file", file);
    const r = await fetch(`/api/files/upload?card_id=${cardId}&type=${type}`, {
      method: "POST",
      body: form,
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async deleteAttachment(attId) {
    await fetch(`/api/files/${attId}`, { method: "DELETE" });
  },
};

// ── Render helpers ─────────────────────────────────────────────────────────
function renderCards(cards) {
  COLUMNS.forEach((status) => {
    const list = document.getElementById(`col-${status}`);
    list.innerHTML = "";
  });

  cards.forEach((card) => {
    const list = document.getElementById(`col-${card.status}`);
    if (!list) return;
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.cardId = card.id;
    el.innerHTML = `
      <div class="card-company">${esc(card.company)}</div>
      <div class="card-role">${esc(card.role)}</div>
    `;
    el.addEventListener("click", () => openPanel(card));
    list.appendChild(el);
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Load all cards ─────────────────────────────────────────────────────────
async function loadCards() {
  const cards = await api.getCards();
  renderCards(cards);
}

// ── Sortable ───────────────────────────────────────────────────────────────
function initSortable() {
  COLUMNS.forEach((status) => {
    const el = document.getElementById(`col-${status}`);
    Sortable.create(el, {
      group: "kanban",
      animation: 150,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      onEnd: async (evt) => {
        const cardId = parseInt(evt.item.dataset.cardId);
        const newStatus = evt.to.dataset.status;
        const newOrder = evt.newIndex;
        await api.updateCard(cardId, { status: newStatus, sort_order: newOrder });
        await loadCards();
      },
    });
  });
}

// ── Detail panel ───────────────────────────────────────────────────────────
async function openPanel(card) {
  currentCardId = card.id;
  document.getElementById("panel-title").textContent = `${card.company} · ${card.role}`;
  document.getElementById("edit-company").value = card.company;
  document.getElementById("edit-role").value = card.role;
  document.getElementById("edit-notes").value = card.notes || "";
  document.getElementById("detail-panel").hidden = false;
  await loadAttachments();
}

function closePanel() {
  document.getElementById("detail-panel").hidden = true;
  currentCardId = null;
}

// ── Save card ──────────────────────────────────────────────────────────────
document.getElementById("save-card").addEventListener("click", async () => {
  if (!currentCardId) return;
  await api.updateCard(currentCardId, {
    company: document.getElementById("edit-company").value.trim(),
    role: document.getElementById("edit-role").value.trim(),
    notes: document.getElementById("edit-notes").value,
  });
  await loadCards();
  // Refresh panel title
  const cards = await api.getCards();
  const card = cards.find((c) => c.id === currentCardId);
  if (card) document.getElementById("panel-title").textContent = `${card.company} · ${card.role}`;
});

// ── Delete card ────────────────────────────────────────────────────────────
document.getElementById("delete-card").addEventListener("click", async () => {
  if (!currentCardId || !confirm("确认删除这张卡片？")) return;
  await api.deleteCard(currentCardId);
  closePanel();
  await loadCards();
});

document.getElementById("close-panel").addEventListener("click", closePanel);

// ── Add card modal ─────────────────────────────────────────────────────────
let pendingStatus = "todo";

document.querySelectorAll(".add-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    pendingStatus = btn.dataset.status;
    document.getElementById("new-company").value = "";
    document.getElementById("new-role").value = "";
    document.getElementById("modal-overlay").hidden = false;
    document.getElementById("new-company").focus();
  });
});

document.getElementById("confirm-add").addEventListener("click", async () => {
  const company = document.getElementById("new-company").value.trim();
  const role = document.getElementById("new-role").value.trim();
  if (!company || !role) return;
  document.getElementById("modal-overlay").hidden = true;
  await api.createCard(company, role, pendingStatus);
  await loadCards();
});

document.getElementById("cancel-add").addEventListener("click", () => {
  document.getElementById("modal-overlay").hidden = true;
});

document.getElementById("modal-overlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.hidden = true;
});

// Enter key in modal inputs
["new-company", "new-role"].forEach((id) => {
  document.getElementById(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("confirm-add").click();
  });
});

// ── Attachments ────────────────────────────────────────────────────────────
async function loadAttachments() {
  if (!currentCardId) return;
  const atts = await api.getAttachments(currentCardId);
  renderImages(atts.filter((a) => a.type === "image"));
  renderFiles(atts.filter((a) => a.type !== "image"));
}

function renderImages(atts) {
  const grid = document.getElementById("images-grid");
  grid.innerHTML = "";
  atts.forEach((att) => {
    const wrap = document.createElement("div");
    wrap.className = "att-thumb";
    wrap.innerHTML = `
      <img src="/api/files/${att.id}" alt="${esc(att.filename)}" />
      <button class="del-btn" title="删除">✕</button>
    `;
    wrap.querySelector("img").addEventListener("click", () => showLightbox(`/api/files/${att.id}`));
    wrap.querySelector(".del-btn").addEventListener("click", async () => {
      await api.deleteAttachment(att.id);
      await loadAttachments();
    });
    grid.appendChild(wrap);
  });
}

function renderFiles(atts) {
  const list = document.getElementById("files-list");
  list.innerHTML = "";
  atts.forEach((att) => {
    const item = document.createElement("div");
    item.className = "file-item";
    item.innerHTML = `
      <a href="/api/files/${att.id}" target="_blank">${esc(att.filename)}</a>
      <button class="del-btn" title="删除">✕</button>
    `;
    item.querySelector(".del-btn").addEventListener("click", async () => {
      await api.deleteAttachment(att.id);
      await loadAttachments();
    });
    list.appendChild(item);
  });
}

// ── Paste zone ────────────────────────────────────────────────────────────
const pasteZone = document.getElementById("paste-zone");

pasteZone.addEventListener("focus", () => pasteZone.classList.add("active"));
pasteZone.addEventListener("blur", () => pasteZone.classList.remove("active"));

document.addEventListener("paste", async (e) => {
  if (!currentCardId) return;
  const items = Array.from(e.clipboardData.items || []);
  const imageItem = items.find((i) => i.type.startsWith("image/"));
  if (!imageItem) return;
  const file = imageItem.getAsFile();
  if (!file) return;
  const named = new File([file], `jd_${Date.now()}.png`, { type: file.type });
  try {
    await api.uploadFile(currentCardId, "image", named);
    await loadAttachments();
  } catch (err) {
    alert("图片上传失败：" + err.message);
  }
});

// ── File input ────────────────────────────────────────────────────────────
document.getElementById("file-input").addEventListener("change", async (e) => {
  if (!currentCardId || !e.target.files.length) return;
  const file = e.target.files[0];
  const ext = file.name.split(".").pop().toLowerCase();
  const type = ext === "pdf" ? "pdf" : "docx";
  try {
    await api.uploadFile(currentCardId, type, file);
    await loadAttachments();
  } catch (err) {
    alert("文件上传失败：" + err.message);
  }
  e.target.value = "";
});

// ── Lightbox ──────────────────────────────────────────────────────────────
function showLightbox(src) {
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = `<img src="${src}" alt="preview" />`;
  lb.addEventListener("click", () => lb.remove());
  document.body.appendChild(lb);
}

// ── Boot ──────────────────────────────────────────────────────────────────
initSortable();
loadCards();
```

- [ ] **Step 2: Commit**

```powershell
git add frontend/app.js
git commit -m "feat: add kanban frontend with drag-and-drop, paste, and file upload"
```

---

## Task 8: Launcher

**Files:**
- Create: `launcher.py`

- [ ] **Step 1: Write launcher.py**

Create `launcher.py`:

```python
"""Entry point: start uvicorn in a background thread, then open the browser."""

import os
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path


HOST = "127.0.0.1"
PORT = 8000


def _wait_for_port(timeout: float = 10.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((HOST, PORT), timeout=0.1):
                return True
        except OSError:
            time.sleep(0.1)
    return False


def _data_dir() -> Path:
    if getattr(sys, "frozen", False):
        base = Path(sys.executable).parent
    else:
        base = Path(__file__).parent
    d = base / "data"
    d.mkdir(exist_ok=True)
    return d


def main() -> None:
    os.environ["DATA_DIR"] = str(_data_dir())

    import uvicorn
    from job_search_agent.main import app

    thread = threading.Thread(
        target=lambda: uvicorn.run(app, host=HOST, port=PORT, log_level="warning"),
        daemon=True,
    )
    thread.start()

    if not _wait_for_port():
        print("ERROR: server did not start within 10 seconds", file=sys.stderr)
        sys.exit(1)

    webbrowser.open(f"http://{HOST}:{PORT}")
    print(f"求职看板已启动: http://{HOST}:{PORT}")
    print("关闭此窗口即可停止服务。")

    try:
        thread.join()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Test launcher in dev mode**

```powershell
cd "d:\AI相关\找工作Agent\job-search-agent"
.\.venv\Scripts\python launcher.py
```

Expected: browser opens at `http://127.0.0.1:8000`, kanban board visible. Press Ctrl+C to stop.

- [ ] **Step 3: Commit**

```powershell
git add launcher.py
git commit -m "feat: add launcher entry point for exe startup"
```

---

## Task 9: PyInstaller Build

**Files:**
- Create: `job_search.spec`

- [ ] **Step 1: Install PyInstaller**

```powershell
.\.venv\Scripts\pip install pyinstaller>=6.0.0
```

- [ ] **Step 2: Write job_search.spec**

Create `job_search.spec`:

```python
# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

block_cipher = None

a = Analysis(
    ["launcher.py"],
    pathex=[str(Path("backend").resolve())],
    binaries=[],
    datas=[
        ("frontend", "frontend"),
    ],
    hiddenimports=[
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "uvicorn.lifespan.off",
        "multipart",
        "multipart.multipart",
        "starlette.routing",
        "starlette.staticfiles",
        "anyio",
        "anyio._backends._asyncio",
        "email.mime.text",
        "email.mime.multipart",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "numpy", "PIL"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="JobSearchKanban",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
```

- [ ] **Step 3: Build the exe**

```powershell
cd "d:\AI相关\找工作Agent\job-search-agent"
.\.venv\Scripts\pyinstaller job_search.spec --clean
```

Expected: `dist/JobSearchKanban.exe` created, build completes without errors.

- [ ] **Step 4: Test the exe**

```powershell
& ".\dist\JobSearchKanban.exe"
```

Expected: console window opens, browser launches at `http://127.0.0.1:8000`, kanban board loads. A `data/` folder appears next to the exe.

- [ ] **Step 5: Commit**

```powershell
git add job_search.spec
git commit -m "build: add PyInstaller spec for single-file exe"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run full test suite**

```powershell
cd "d:\AI相关\找工作Agent\job-search-agent"
.\.venv\Scripts\pytest tests/ -v
```

Expected: all tests PASS.

- [ ] **Step 2: Smoke test exe**

1. Double-click `dist/JobSearchKanban.exe`
2. Verify browser opens and kanban renders
3. Add a card via "＋" button
4. Drag it to another column — verify status persists after refresh
5. Click card → paste a screenshot → verify thumbnail appears
6. Upload a PDF resume → verify download link appears

- [ ] **Step 3: Final commit**

```powershell
git add -A
git commit -m "chore: complete kanban exe delivery"
```
