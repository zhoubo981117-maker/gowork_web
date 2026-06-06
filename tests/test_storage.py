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
