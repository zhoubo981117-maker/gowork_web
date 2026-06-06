import pytest
from pydantic import ValidationError
from job_search_agent.schemas import CardCreate, CardUpdate, AttachmentOut


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
