from fastapi.testclient import TestClient

from app.main import app


def register_user(client: TestClient, email: str = "tracking@example.com") -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Tracking Operator",
            "password": "super-secure-password",
        },
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def test_create_tracking_pixel_and_record_open() -> None:
    with TestClient(app) as client:
        token = register_user(client)
        headers = {"Authorization": f"Bearer {token}"}

        create_response = client.post(
            "/api/v1/tracked-emails",
            headers=headers,
            json={"recipient_email": "client@example.com", "subject": "Sprint 2 launch"},
        )
        assert create_response.status_code == 201
        tracked_email = create_response.json()
        assert tracked_email["opens"] == 0
        assert tracked_email["pixel_html"].startswith("<img src=")

        pixel_response = client.get(tracked_email["tracking_pixel_url"])
        assert pixel_response.status_code == 200
        assert pixel_response.headers["content-type"] == "image/gif"

        summary_response = client.get("/api/v1/dashboard/summary", headers=headers)
        assert summary_response.status_code == 200
        assert summary_response.json()["tracked_emails"] == 1
        assert summary_response.json()["opens"] == 1

        list_response = client.get("/api/v1/tracked-emails", headers=headers)
        assert list_response.status_code == 200
        assert list_response.json()[0]["opens"] == 1
