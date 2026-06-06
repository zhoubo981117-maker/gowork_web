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
