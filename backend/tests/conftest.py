import os
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env for EXPO_PUBLIC_BACKEND_URL
load_dotenv(Path("/app/frontend/.env"))

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
)
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not set"
BASE_URL = BASE_URL.rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _signup(api_client, email, password, name="TEST User"):
    return api_client.post(
        f"{BASE_URL}/api/auth/signup",
        json={"email": email, "password": password, "name": name},
    )


def _signin(api_client, email, password):
    return api_client.post(
        f"{BASE_URL}/api/auth/signin",
        json={"email": email, "password": password},
    )


def _ensure_user(api_client, email, password, name="TEST User"):
    r = _signin(api_client, email, password)
    if r.status_code == 200:
        return r.json()
    r = _signup(api_client, email, password, name)
    assert r.status_code == 200, f"signup failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def regular_user(api_client):
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
    password = "testpass123"
    data = _ensure_user(api_client, email, password, name="TEST Regular")
    return {"email": email, "password": password, "token": data["token"], "user": data["user"]}


@pytest.fixture(scope="session")
def second_user(api_client):
    email = f"TEST_user2_{uuid.uuid4().hex[:8]}@example.com"
    password = "testpass123"
    data = _ensure_user(api_client, email, password, name="TEST Second")
    return {"email": email, "password": password, "token": data["token"], "user": data["user"]}


@pytest.fixture(scope="session")
def admin_user(api_client):
    # Hardcoded admin email per backend ADMIN_EMAILS
    email = "srtda6@gmail.com"
    password = "admin123"
    data = _ensure_user(api_client, email, password, name="Admin")
    return {"email": email, "password": password, "token": data["token"], "user": data["user"]}


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
