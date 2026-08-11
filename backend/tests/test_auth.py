import os
import sys
from datetime import timedelta
import pytest

# Mark environment as TESTING before importing main/database
os.environ["TESTING"] = "1"
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")

# Add parent directory to sys.path so imports work cleanly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from database import Base, get_db
import models
from main import app
from security import create_access_token, verify_password

# Use temporary SQLite file database for tests to share tables across connections
TEST_DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_temp.db")
SQLALCHEMY_TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_signup_succeeds():
    payload = {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "password": "securepassword123"
    }
    response = client.post("/auth/signup", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["email"] == "jane@example.com"
    assert data["user"]["name"] == "Jane Doe"
    assert "id" in data["user"]
    assert "created_at" in data["user"]
    assert "password_hash" not in data["user"]
    assert "password" not in data["user"]

def test_duplicate_signup_fails():
    payload = {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "password": "securepassword123"
    }
    response1 = client.post("/auth/signup", json=payload)
    assert response1.status_code == 201

    response2 = client.post("/auth/signup", json=payload)
    assert response2.status_code == 400
    assert "already registered" in response2.json()["detail"].lower()

def test_password_is_hashed():
    payload = {
        "name": "Bob Smith",
        "email": "bob@example.com",
        "password": "mysecretpassword"
    }
    response = client.post("/auth/signup", json=payload)
    assert response.status_code == 201

    db = TestingSessionLocal()
    user = db.query(models.User).filter(models.User.email == "bob@example.com").first()
    assert user is not None
    assert user.password_hash != "mysecretpassword"
    assert verify_password("mysecretpassword", user.password_hash) is True
    db.close()

def test_login_succeeds():
    signup_payload = {
        "name": "Alice Wonderland",
        "email": "alice@example.com",
        "password": "password123"
    }
    client.post("/auth/signup", json=signup_payload)

    login_payload = {
        "email": "alice@example.com",
        "password": "password123"
    }
    response = client.post("/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alice@example.com"

def test_wrong_password_fails():
    signup_payload = {
        "name": "Alice Wonderland",
        "email": "alice@example.com",
        "password": "password123"
    }
    client.post("/auth/signup", json=signup_payload)

    login_payload = {
        "email": "alice@example.com",
        "password": "wrongpassword"
    }
    response = client.post("/auth/login", json=login_payload)
    assert response.status_code == 401
    assert "invalid email or password" in response.json()["detail"].lower()

def test_auth_me_works_with_valid_jwt():
    signup_payload = {
        "name": "Charlie Brown",
        "email": "charlie@example.com",
        "password": "password123"
    }
    signup_res = client.post("/auth/signup", json=signup_payload)
    token = signup_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["email"] == "charlie@example.com"
    assert user_data["name"] == "Charlie Brown"

def test_auth_me_rejects_missing_jwt():
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_auth_me_rejects_invalid_jwt():
    headers = {"Authorization": "Bearer invalid_junk_token_value"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 401

def test_auth_me_rejects_expired_jwt():
    signup_payload = {
        "name": "David Miller",
        "email": "david@example.com",
        "password": "password123"
    }
    signup_res = client.post("/auth/signup", json=signup_payload)
    user_id = signup_res.json()["user"]["id"]

    # Generate token expired 10 minutes ago
    expired_token = create_access_token(
        {"sub": str(user_id), "user_id": user_id},
        expires_delta=timedelta(minutes=-10)
    )

    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 401

def test_password_hash_never_returned():
    payload = {
        "name": "Eve Adams",
        "email": "eve@example.com",
        "password": "password123"
    }
    signup_res = client.post("/auth/signup", json=payload)
    signup_data = signup_res.json()
    assert "password_hash" not in str(signup_data)
    assert "password" not in signup_data["user"]

    login_res = client.post("/auth/login", json={"email": "eve@example.com", "password": "password123"})
    login_data = login_res.json()
    assert "password_hash" not in str(login_data)

    token = login_data["access_token"]
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    me_data = me_res.json()
    assert "password_hash" not in me_data
    assert "password" not in me_data
