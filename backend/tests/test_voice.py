import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_voice_crop_prices():
    """Verify Gemma Call Agent answers crop prices."""
    response = client.post(
        "/api/v1/voice/query",
        json={"query": "What is today's Cotton price in Akola APMC?", "language": "en", "farmer_id": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    assert data["category"] == "crop_prices"
    assert "₹7,450" in data["response_text"] or "Cotton" in data["response_text"]


def test_voice_farm_details():
    """Verify Gemma Call Agent answers farm details."""
    response = client.post(
        "/api/v1/voice/query",
        json={"query": "Tell me about my farm Gat 142 and soil health", "language": "en", "farmer_id": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    assert data["category"] == "farm_details"
    assert "142" in data["response_text"] or "4.5" in data["response_text"]


def test_voice_weather_rainfall():
    """Verify Gemma Call Agent answers weather and rainfall alerts."""
    response = client.post(
        "/api/v1/voice/query",
        json={"query": "Is there any rainfall alert for my area?", "language": "en", "farmer_id": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    assert data["category"] == "weather_rainfall"
    assert "rainfall" in data["response_text"].lower() or "rain" in data["response_text"].lower()


def test_voice_recent_bids():
    """Verify Gemma Call Agent answers recent bids and bidders."""
    response = client.post(
        "/api/v1/voice/query",
        json={"query": "Who is the highest bidder on my cotton lot?", "language": "en", "farmer_id": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    assert data["category"] == "recent_bids"
    assert "Vidarbha Cotton Mills" in data["response_text"] or "₹7,300" in data["response_text"]


def test_voice_strict_guardrail_refusal():
    """Verify Gemma Call Agent REFUSES questions outside the 4 allowed topics."""
    response = client.post(
        "/api/v1/voice/query",
        json={"query": "Who is the hero in the movie Pushpa?", "language": "en", "farmer_id": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is False
    assert data["category"] == "out_of_scope"
    assert "cannot answer queries outside these topics" in data["response_text"]
