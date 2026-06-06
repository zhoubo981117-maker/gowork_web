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


_frontend = _frontend_dir()
if _frontend.exists():
    app.mount("/static", StaticFiles(directory=str(_frontend)), name="static")
