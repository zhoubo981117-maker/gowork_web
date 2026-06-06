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
