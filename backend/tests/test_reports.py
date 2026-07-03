from fastapi.testclient import TestClient

from app.main import app


def register_user(client: TestClient, email: str = "reports@example.com") -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Reports Operator",
            "password": "super-secure-password",
        },
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def test_report_preferences_can_be_read_and_updated() -> None:
    with TestClient(app) as client:
        token = register_user(client)
        headers = {"Authorization": f"Bearer {token}"}

        read_response = client.get("/api/v1/reports/preferences", headers=headers)
        assert read_response.status_code == 200
        assert read_response.json()["recipient_email"] == "reports@example.com"
        assert read_response.json()["daily_enabled"] is False

        update_response = client.put(
            "/api/v1/reports/preferences",
            headers=headers,
            json={
                "recipient_email": "alerts@example.com",
                "daily_enabled": True,
                "weekly_enabled": True,
                "immediate_open_enabled": True,
                "immediate_click_enabled": False,
                "immediate_download_enabled": True,
            },
        )
        assert update_response.status_code == 200
        preferences = update_response.json()
        assert preferences["recipient_email"] == "alerts@example.com"
        assert preferences["daily_enabled"] is True
        assert preferences["weekly_enabled"] is True
        assert preferences["immediate_download_enabled"] is True


def test_send_now_returns_preview_when_smtp_is_not_configured() -> None:
    with TestClient(app) as client:
        token = register_user(client, "preview@example.com")
        headers = {"Authorization": f"Bearer {token}"}

        email_response = client.post(
            "/api/v1/tracked-emails",
            headers=headers,
            json={"recipient_email": "client@example.com", "subject": "Report launch"},
        )
        assert email_response.status_code == 201
        client.get(email_response.json()["tracking_pixel_url"])

        send_response = client.post("/api/v1/reports/send-now", headers=headers)
        assert send_response.status_code == 200
        result = send_response.json()
        assert result["sent"] is False
        assert result["message"] == "SMTP is not configured. Preview generated only."
        assert "Tracking notification" in result["subject"]
        assert "Tracking Notification" in result["preview_text"]
        assert "Opens: 1" in result["preview_text"]
        assert "OPEN TRACKING REPORT" in result["preview_html"]

        history_response = client.get("/api/v1/reports/history", headers=headers)
        assert history_response.status_code == 200
        assert history_response.json() == []
