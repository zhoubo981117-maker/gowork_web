import base64
import io


def _make_png() -> bytes:
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
