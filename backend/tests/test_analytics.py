from fastapi.testclient import TestClient

from app.main import app


def register_user(client: TestClient, email: str = "analytics@example.com") -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Analytics Operator",
            "password": "super-secure-password",
        },
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def test_analytics_overview_rolls_up_tracking_events() -> None:
    with TestClient(app) as client:
        token = register_user(client)
        headers = {"Authorization": f"Bearer {token}"}

        email_response = client.post(
            "/api/v1/tracked-emails",
            headers=headers,
            json={"recipient_email": "client@example.com", "subject": "Analytics launch"},
        )
        assert email_response.status_code == 201
        client.get(email_response.json()["tracking_pixel_url"])

        link_response = client.post(
            "/api/v1/tracked-links",
            headers=headers,
            json={"label": "Read brief", "destination_url": "https://example.com/brief"},
        )
        assert link_response.status_code == 201
        client.get(link_response.json()["tracking_url"], follow_redirects=False)

        attachment_response = client.post(
            "/api/v1/tracked-attachments",
            headers=headers,
            data={"label": "Download brief"},
            files={"file": ("brief.txt", b"analytics", "text/plain")},
        )
        assert attachment_response.status_code == 201
        client.get(attachment_response.json()["download_url"])

        overview_response = client.get("/api/v1/analytics/overview", headers=headers)
        assert overview_response.status_code == 200
        overview = overview_response.json()

        assert overview["totals"]["opens"] == 1
        assert overview["totals"]["clicks"] == 1
        assert overview["totals"]["downloads"] == 1
        assert overview["totals"]["total_events"] == 3
        assert overview["rates"]["open_rate"] == 100.0
        assert overview["rates"]["click_rate"] == 100.0
        assert overview["rates"]["download_rate"] == 100.0
        assert len(overview["series"]) == 7
        assert len(overview["recent_activity"]) == 3
        assert len(overview["top_items"]) == 3
