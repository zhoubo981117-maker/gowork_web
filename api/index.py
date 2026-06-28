"""Vercel serverless entrypoint for the FastAPI backend.

The app lives at ``backend/job_search_agent/main.py`` and its modules import
each other as ``job_search_agent.*`` (i.e. they assume ``backend/`` is on
``sys.path``). We replicate that here, and point persistent storage at the only
writable location on Vercel's serverless filesystem: ``/tmp``.

NOTE: ``/tmp`` is ephemeral and not shared between invocations, so any data
(SQLite rows, uploaded files) created on Vercel will not persist across cold
starts. For durable storage, host this on a platform with a persistent disk
(Render / Railway / Fly.io) or back it with an external database + object store.
"""

import os
import sys
from pathlib import Path

# Make `job_search_agent` importable (the package root is backend/).
_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(_BACKEND_DIR))

# Vercel's filesystem is read-only except for /tmp.
os.environ.setdefault("DATA_DIR", "/tmp/job_search_data")

from job_search_agent import storage  # noqa: E402  (path set up above)
from job_search_agent.main import app  # noqa: E402

# Initialise the database once per cold start. main.py disables the ASGI
# lifespan on Vercel (it can race with the first request body), so we do it here
# at import time instead.
storage.init_db()

# Re-exported for Vercel's ASGI detection.
__all__ = ["app"]
