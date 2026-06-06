from typing import Literal, Optional

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
