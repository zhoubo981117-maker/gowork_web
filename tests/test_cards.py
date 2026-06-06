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
