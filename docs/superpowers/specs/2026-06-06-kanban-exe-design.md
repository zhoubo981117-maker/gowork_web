# Design: Job Search Kanban — Desktop EXE

**Branch**: `002-kanban-exe`
**Date**: 2026-06-06
**Status**: Approved

## Summary

Redesign the existing job-search-agent into a two-feature local desktop app packaged as a single Windows EXE. Remove all AI matching and analysis logic. Keep only: (1) a drag-and-drop kanban board for tracking job applications, and (2) a detail panel that accepts JD screenshots via clipboard paste and resume files (Word/PDF) via file upload.

Startup: double-click `JobSearchKanban.exe` → uvicorn starts on `127.0.0.1:8000` → browser opens automatically.

---

## Data Model

### JobCard

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | auto-increment |
| company | TEXT | company name |
| role | TEXT | job title |
| status | TEXT | `todo` / `applied` / `interview` / `offer` / `rejected` |
| notes | TEXT | free-form notes |
| sort_order | INTEGER | position within the column |
| created_at | DATETIME | UTC |

### Attachment

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | auto-increment |
| card_id | INTEGER FK | references JobCard |
| type | TEXT | `image` / `pdf` / `docx` |
| filename | TEXT | original filename |
| path | TEXT | path under `data/files/{card_id}/` |

---

## Architecture

```
job-search-agent/
├── backend/
│   └── job_search_agent/
│       ├── main.py          ← FastAPI app, mounts static frontend, serves data/files
│       ├── schemas.py       ← Pydantic models: JobCard, Attachment, reorder payload
│       ├── storage.py       ← SQLite init + CRUD (aiosqlite)
│       └── routers/
│           ├── cards.py     ← CRUD + drag-drop reorder
│           └── files.py     ← image/pdf/docx upload + serve + delete
├── frontend/
│   ├── index.html           ← kanban board layout (5 columns)
│   ├── app.js               ← Sortable.js + fetch calls + paste listener
│   └── styles.css
├── data/                    ← created at runtime, outside the exe
│   ├── kanban.sqlite3
│   └── files/
├── launcher.py              ← entry point: start uvicorn, open browser, wait
├── job_search.spec          ← PyInstaller spec
└── pyproject.toml           ← dependencies (trimmed)
```

**Deleted from current codebase**: `agent.py`, `services/matching.py`, `services/text_analysis.py`, all analysis schemas and endpoints.

---

## Feature 1: Kanban Drag-and-Drop

**Five fixed columns**: 待投递 → 已投递 → 面试中 → 收到Offer → 已拒绝

- Each column has an "Add card" button: prompts for company + role, creates card via `POST /api/cards`.
- Sortable.js handles drag within a column (reorder) and drag across columns (status change).
- On `dragend`, frontend calls `PATCH /api/cards/{id}` with `{ status, sort_order }`.
- Clicking a card opens a right-side detail panel (slide-in drawer).

**API (cards.py)**

```
GET    /api/cards              returns all cards grouped by status + sort_order
POST   /api/cards              { company, role, status }
PATCH  /api/cards/{id}         { status?, sort_order?, notes? }
DELETE /api/cards/{id}
```

---

## Feature 2: JD Image Paste + Resume File Upload

**JD screenshot paste**
- Detail panel has a paste zone labeled "粘贴 JD 截图 (Ctrl+V)".
- Browser listens for `paste` event on the zone, reads `clipboardData.items` for `image/*`.
- Sends image as `multipart/form-data` to `POST /api/files/upload?card_id={id}&type=image`.
- Backend saves file to `data/files/{card_id}/{uuid}.png`, inserts Attachment row.
- Frontend renders thumbnail; click → full-screen lightbox.

**Resume upload (Word / PDF)**
- Detail panel has a file input `accept=".pdf,.docx"`.
- Sends file to `POST /api/files/upload?card_id={id}&type=pdf|docx`.
- Backend stores the file, inserts Attachment row.
- PDF: displayed via `<iframe src="/api/files/{id}">` in-panel.
- DOCX: shown as filename + download link.

**API (files.py)**

```
POST   /api/files/upload       multipart: file + card_id + type
GET    /api/files/{id}         streams the file (for preview / download)
DELETE /api/files/{id}         removes file + db row
```

---

## EXE Startup Flow

```
launcher.py
  1. resolve data/ dir next to exe (sys.executable parent)
  2. set env var DATA_DIR
  3. start uvicorn as subprocess on 127.0.0.1:8000
  4. poll port until ready (max 5 s, 100 ms interval)
  5. webbrowser.open("http://127.0.0.1:8000")
  6. wait for subprocess to exit (user closes terminal or Ctrl+C)
  7. terminate uvicorn subprocess
```

Data directory lives beside the exe → upgrade exe without losing data.

### PyInstaller

```
pyinstaller job_search.spec \
  --onefile \
  --add-data "frontend;frontend" \
  --hidden-import uvicorn.logging \
  --hidden-import uvicorn.loops.auto \
  --hidden-import uvicorn.protocols.http.auto \
  --name JobSearchKanban
```

Output: `dist/JobSearchKanban.exe` (~30–50 MB).

---

## Dependencies (trimmed)

| Package | Purpose |
|---|---|
| fastapi | web framework |
| uvicorn | ASGI server |
| pydantic | schema validation |
| aiosqlite | async SQLite |
| python-multipart | file upload parsing |
| pyinstaller | exe packaging |

Removed: all AI/LLM/analysis packages.

---

## Success Criteria

1. Double-clicking `JobSearchKanban.exe` opens the kanban in a browser within 5 seconds.
2. Cards can be dragged between columns and the new status persists after browser refresh.
3. A JD screenshot pasted with Ctrl+V appears as a thumbnail in the card detail.
4. A PDF resume uploaded shows an in-panel preview; a DOCX shows a download link.
5. The `data/` directory is created automatically on first run.
