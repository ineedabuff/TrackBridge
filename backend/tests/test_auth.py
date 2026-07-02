from fastapi.testclient import TestClient

from app.main import app


def test_health_check() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_register_login_and_me() -> None:
    payload = {
        "email": "founder@example.com",
        "full_name": "TrackBridge Admin",
        "password": "super-secure-password",
    }

    with TestClient(app) as client:
        register_response = client.post("/api/v1/auth/register", json=payload)
        assert register_response.status_code == 201
        token = register_response.json()["access_token"]

        me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_response.status_code == 200
        assert me_response.json()["email"] == payload["email"]

        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": payload["email"], "password": payload["password"]},
        )
        assert login_response.status_code == 200
        assert login_response.json()["token_type"] == "bearer"
