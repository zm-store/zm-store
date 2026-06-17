"""
Backend test suite for Zm Store / Progroom Beauty.
Covers: auth (signup/signin/google/logout/me), catalog (categories/banners/products),
settings, admin CRUD, orders (user + admin), and the previously-broken PATCH /api/me bug.
"""
import os
import uuid
import requests
import pytest
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path("/app/frontend/.env"))
BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")).rstrip("/")


def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ─── Health / public catalog ────────────────────────────────────────────────
class TestPublicCatalog:
    def test_categories_seeded(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 4
        slugs = {c["slug"] for c in data}
        assert {"cosmetics", "skincare", "perfumes"}.issubset(slugs)
        for c in data:
            for k in ("id", "slug", "name_ku", "name_en", "sort_order"):
                assert k in c

    def test_banners_seeded(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/banners")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        assert data[0]["active"] is True
        assert data[0]["image_url"].startswith("http")

    def test_products_seeded(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 3
        for p in data:
            for k in ("id", "name", "price", "in_stock"):
                assert k in p

    def test_products_filter_by_category(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products", params={"category": "cosmetics"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # Seed places samples in first category (cosmetics)
        assert len(data) >= 1
        for p in data:
            assert p["category_slug"] == "cosmetics"

    def test_product_get_by_id_and_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products")
        pid = r.json()[0]["id"]
        r2 = api_client.get(f"{BASE_URL}/api/products/{pid}")
        assert r2.status_code == 200
        assert r2.json()["id"] == pid

        r3 = api_client.get(f"{BASE_URL}/api/products/prd_nonexistent_xyz")
        assert r3.status_code == 404

    def test_settings(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/settings")
        assert r.status_code == 200
        d = r.json()
        assert "delivery_fee" in d and "service_fee" in d
        assert isinstance(d["delivery_fee"], (int, float))
        assert isinstance(d["service_fee"], (int, float))


# ─── Auth (email) ───────────────────────────────────────────────────────────
class TestEmailAuth:
    def test_signup_returns_token(self, api_client):
        email = f"TEST_signup_{uuid.uuid4().hex[:8]}@example.com"
        r = api_client.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": "passw0rd", "name": "Signer"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "token" in d and len(d["token"]) > 20
        assert d["user"]["email"] == email.lower()
        assert d["user"]["is_admin"] is False
        # GET /api/me to verify token works
        me = api_client.get(f"{BASE_URL}/api/me", headers=auth(d["token"]))
        assert me.status_code == 200
        assert me.json()["email"] == email.lower()

    def test_signup_duplicate_email_400(self, api_client, regular_user):
        r = api_client.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": regular_user["email"], "password": "anything", "name": "Dup"},
        )
        assert r.status_code == 400

    def test_signin_success(self, api_client, regular_user):
        r = api_client.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": regular_user["email"], "password": regular_user["password"]},
        )
        assert r.status_code == 200
        assert "token" in r.json()
        assert r.json()["user"]["email"] == regular_user["email"].lower()

    def test_signin_wrong_password_401(self, api_client, regular_user):
        r = api_client.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": regular_user["email"], "password": "WRONG_PW"},
        )
        assert r.status_code == 401

    def test_signin_unknown_user_401(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": f"nope_{uuid.uuid4().hex[:6]}@x.com", "password": "y"},
        )
        assert r.status_code == 401

    def test_google_auth_invalid_session_401(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/google",
            json={"session_id": "invalid_session_id_xyz_12345"},
        )
        assert r.status_code == 401

    def test_logout(self, api_client):
        email = f"TEST_logout_{uuid.uuid4().hex[:8]}@example.com"
        r = api_client.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": "passw0rd", "name": "LO"},
        )
        token = r.json()["token"]
        rl = api_client.post(f"{BASE_URL}/api/auth/logout", headers=auth(token))
        assert rl.status_code == 200
        # Token should now be invalid
        me = api_client.get(f"{BASE_URL}/api/me", headers=auth(token))
        assert me.status_code == 401


# ─── /api/me ────────────────────────────────────────────────────────────────
class TestMe:
    def test_me_without_token_401(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/me")
        assert r.status_code == 401

    def test_me_with_token_200(self, api_client, regular_user):
        r = api_client.get(f"{BASE_URL}/api/me", headers=auth(regular_user["token"]))
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == regular_user["email"].lower()
        assert d["id"] == regular_user["user"]["id"]

    def test_patch_me_name_updates(self, api_client, regular_user):
        """Previously-broken 401 bug: PATCH /api/me with new name."""
        new_name = f"NewName_{uuid.uuid4().hex[:6]}"
        r = api_client.patch(
            f"{BASE_URL}/api/me",
            headers=auth(regular_user["token"]),
            json={"name": new_name},
        )
        assert r.status_code == 200, r.text
        assert r.json()["name"] == new_name
        # Verify persistence via GET
        me = api_client.get(f"{BASE_URL}/api/me", headers=auth(regular_user["token"]))
        assert me.json()["name"] == new_name

    def test_patch_me_image_https(self, api_client, regular_user):
        url = "https://example.com/avatar.png"
        r = api_client.patch(
            f"{BASE_URL}/api/me",
            headers=auth(regular_user["token"]),
            json={"image": url},
        )
        assert r.status_code == 200
        assert r.json()["image"] == url

    def test_patch_me_image_data_url(self, api_client, regular_user):
        data_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        r = api_client.patch(
            f"{BASE_URL}/api/me",
            headers=auth(regular_user["token"]),
            json={"image": data_url},
        )
        assert r.status_code == 200
        assert r.json()["image"].startswith("data:image/")

    def test_patch_me_empty_name_400(self, api_client, regular_user):
        r = api_client.patch(
            f"{BASE_URL}/api/me",
            headers=auth(regular_user["token"]),
            json={"name": "   "},
        )
        assert r.status_code == 400

    def test_patch_me_invalid_image_400(self, api_client, regular_user):
        r = api_client.patch(
            f"{BASE_URL}/api/me",
            headers=auth(regular_user["token"]),
            json={"image": "not-a-url"},
        )
        assert r.status_code == 400


# ─── Admin role and admin endpoints ─────────────────────────────────────────
class TestAdminAuthZ:
    def test_admin_email_gets_is_admin_true(self, api_client, admin_user):
        r = api_client.get(f"{BASE_URL}/api/me", headers=auth(admin_user["token"]))
        assert r.status_code == 200
        assert r.json()["is_admin"] is True

    def test_non_admin_forbidden_403(self, api_client, regular_user):
        for path in ("/api/admin/categories", "/api/admin/banners", "/api/admin/products", "/api/admin/orders", "/api/admin/settings"):
            r = api_client.get(f"{BASE_URL}{path}", headers=auth(regular_user["token"]))
            assert r.status_code == 403, f"{path} → {r.status_code}"

    def test_admin_list_endpoints(self, api_client, admin_user):
        for path in ("/api/admin/categories", "/api/admin/banners", "/api/admin/products", "/api/admin/orders"):
            r = api_client.get(f"{BASE_URL}{path}", headers=auth(admin_user["token"]))
            assert r.status_code == 200, f"{path} → {r.status_code}"
            assert isinstance(r.json(), list)

    def test_admin_settings_patch_and_restore(self, api_client, admin_user):
        # Save original
        orig = api_client.get(f"{BASE_URL}/api/settings").json()
        new_d, new_s = 4321.0, 1234.0
        r = api_client.patch(
            f"{BASE_URL}/api/admin/settings",
            headers=auth(admin_user["token"]),
            json={"delivery_fee": new_d, "service_fee": new_s},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["delivery_fee"] == new_d
        assert d["service_fee"] == new_s
        # Verify via public endpoint
        pub = api_client.get(f"{BASE_URL}/api/settings").json()
        assert pub["delivery_fee"] == new_d and pub["service_fee"] == new_s
        # Restore
        api_client.patch(
            f"{BASE_URL}/api/admin/settings",
            headers=auth(admin_user["token"]),
            json={"delivery_fee": orig["delivery_fee"], "service_fee": orig["service_fee"]},
        )


# ─── Admin CRUD: Categories ─────────────────────────────────────────────────
class TestAdminCategoriesCRUD:
    def test_create_update_delete(self, api_client, admin_user):
        h = auth(admin_user["token"])
        suffix = uuid.uuid4().hex[:6]
        # Create
        r = api_client.post(
            f"{BASE_URL}/api/admin/categories",
            headers=h,
            json={"name_en": f"TEST Cat {suffix}", "name_ku": "تاقیکردنەوە", "sort_order": 99},
        )
        assert r.status_code == 200, r.text
        cat = r.json()
        cid = cat["id"]
        assert cat["name_en"].startswith("TEST Cat")
        assert cat["sort_order"] == 99

        # Verify visible in public list
        listing = api_client.get(f"{BASE_URL}/api/categories").json()
        assert any(c["id"] == cid for c in listing)

        # Update
        r2 = api_client.patch(
            f"{BASE_URL}/api/admin/categories/{cid}",
            headers=h,
            json={"name_en": f"TEST Cat Updated {suffix}", "sort_order": 50},
        )
        assert r2.status_code == 200
        assert r2.json()["name_en"].endswith("Updated " + suffix)
        assert r2.json()["sort_order"] == 50

        # Delete
        r3 = api_client.delete(f"{BASE_URL}/api/admin/categories/{cid}", headers=h)
        assert r3.status_code == 204

        # Verify removed
        listing2 = api_client.get(f"{BASE_URL}/api/categories").json()
        assert not any(c["id"] == cid for c in listing2)

    def test_create_requires_name(self, api_client, admin_user):
        r = api_client.post(
            f"{BASE_URL}/api/admin/categories",
            headers=auth(admin_user["token"]),
            json={"sort_order": 1},
        )
        assert r.status_code == 400


# ─── Admin CRUD: Banners ────────────────────────────────────────────────────
class TestAdminBannersCRUD:
    def test_create_update_delete(self, api_client, admin_user):
        h = auth(admin_user["token"])
        r = api_client.post(
            f"{BASE_URL}/api/admin/banners",
            headers=h,
            json={"image_url": "https://example.com/test_banner.jpg", "title": "TEST Banner", "active": True},
        )
        assert r.status_code == 200, r.text
        bid = r.json()["id"]

        r2 = api_client.patch(
            f"{BASE_URL}/api/admin/banners/{bid}",
            headers=h,
            json={"title": "TEST Banner Updated", "active": False},
        )
        assert r2.status_code == 200
        assert r2.json()["title"] == "TEST Banner Updated"
        assert r2.json()["active"] is False

        # When inactive, should not appear in public banners
        pub = api_client.get(f"{BASE_URL}/api/banners").json()
        assert not any(b["id"] == bid for b in pub)

        r3 = api_client.delete(f"{BASE_URL}/api/admin/banners/{bid}", headers=h)
        assert r3.status_code == 204


# ─── Admin CRUD: Products ───────────────────────────────────────────────────
class TestAdminProductsCRUD:
    def test_create_update_delete(self, api_client, admin_user):
        h = auth(admin_user["token"])
        cats = api_client.get(f"{BASE_URL}/api/categories").json()
        cid = cats[0]["id"]

        r = api_client.post(
            f"{BASE_URL}/api/admin/products",
            headers=h,
            json={
                "category_id": cid,
                "name": "TEST Product",
                "description": "desc",
                "price": 1500.0,
                "image_url": "https://example.com/p.jpg",
                "in_stock": True,
            },
        )
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        assert r.json()["price"] == 1500.0

        # Verify GET
        g = api_client.get(f"{BASE_URL}/api/products/{pid}")
        assert g.status_code == 200

        # Update price
        r2 = api_client.patch(
            f"{BASE_URL}/api/admin/products/{pid}",
            headers=h,
            json={"price": 2000.0, "in_stock": False},
        )
        assert r2.status_code == 200
        assert r2.json()["price"] == 2000.0
        assert r2.json()["in_stock"] is False

        # Delete
        r3 = api_client.delete(f"{BASE_URL}/api/admin/products/{pid}", headers=h)
        assert r3.status_code == 204
        g2 = api_client.get(f"{BASE_URL}/api/products/{pid}")
        assert g2.status_code == 404


# ─── Orders ─────────────────────────────────────────────────────────────────
class TestOrders:
    @pytest.fixture(scope="class")
    def created_order(self, api_client, regular_user):
        products = api_client.get(f"{BASE_URL}/api/products").json()
        settings = api_client.get(f"{BASE_URL}/api/settings").json()
        p1, p2 = products[0], products[1]
        payload = {
            "customer_phone": "07501112233",
            "delivery_address": "TEST Address, Erbil",
            "notes": "Leave at door",
            "items": [
                {"product_id": p1["id"], "quantity": 2},
                {"product_id": p2["id"], "quantity": 1},
            ],
        }
        r = api_client.post(
            f"{BASE_URL}/api/orders",
            headers=auth(regular_user["token"]),
            json=payload,
        )
        assert r.status_code == 200, r.text
        return {"order": r.json(), "p1": p1, "p2": p2, "settings": settings}

    def test_create_order_totals(self, created_order):
        o = created_order["order"]
        p1, p2 = created_order["p1"], created_order["p2"]
        s = created_order["settings"]
        expected_sub = p1["price"] * 2 + p2["price"] * 1
        assert abs(o["subtotal"] - expected_sub) < 0.01
        assert abs(o["delivery_fee"] - s["delivery_fee"]) < 0.01
        assert abs(o["service_fee"] - s["service_fee"]) < 0.01
        assert abs(o["total"] - (expected_sub + s["delivery_fee"] + s["service_fee"])) < 0.01
        assert o["status"] == "pending"
        assert len(o["items"]) == 2
        assert o["status_history"][0]["status"] == "pending"

    def test_create_order_unauthenticated_401(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/orders", json={"items": [{"product_id": "x", "quantity": 1}]})
        assert r.status_code == 401

    def test_create_order_unknown_product_400(self, api_client, regular_user):
        r = api_client.post(
            f"{BASE_URL}/api/orders",
            headers=auth(regular_user["token"]),
            json={"items": [{"product_id": "prd_doesnotexist", "quantity": 1}]},
        )
        assert r.status_code == 400

    def test_list_my_orders(self, api_client, regular_user, created_order):
        r = api_client.get(f"{BASE_URL}/api/orders", headers=auth(regular_user["token"]))
        assert r.status_code == 200
        ids = [o["id"] for o in r.json()]
        assert created_order["order"]["id"] in ids

    def test_get_my_order(self, api_client, regular_user, created_order):
        oid = created_order["order"]["id"]
        r = api_client.get(f"{BASE_URL}/api/orders/{oid}", headers=auth(regular_user["token"]))
        assert r.status_code == 200
        assert r.json()["id"] == oid

    def test_other_user_cannot_get_order(self, api_client, second_user, created_order):
        oid = created_order["order"]["id"]
        r = api_client.get(f"{BASE_URL}/api/orders/{oid}", headers=auth(second_user["token"]))
        assert r.status_code == 404

    def test_admin_update_order_status(self, api_client, admin_user, created_order):
        oid = created_order["order"]["id"]
        r = api_client.patch(
            f"{BASE_URL}/api/admin/orders/{oid}",
            headers=auth(admin_user["token"]),
            json={"status": "accepted"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "accepted"
        statuses = [h["status"] for h in d["status_history"]]
        assert "pending" in statuses and "accepted" in statuses

    def test_admin_pending_count(self, api_client, admin_user):
        r = api_client.get(f"{BASE_URL}/api/admin/orders/pending-count", headers=auth(admin_user["token"]))
        assert r.status_code == 200
        assert "count" in r.json()
        assert isinstance(r.json()["count"], int)

    def test_checkout_defaults_saved(self, api_client, regular_user, created_order):
        r = api_client.get(f"{BASE_URL}/api/me/checkout-defaults", headers=auth(regular_user["token"]))
        assert r.status_code == 200
        d = r.json()
        assert d["phone"] == "07501112233"
        assert d["address"] == "TEST Address, Erbil"


# ─── Delete account ─────────────────────────────────────────────────────────
class TestDeleteAccount:
    def test_delete_me(self, api_client):
        email = f"TEST_delete_{uuid.uuid4().hex[:8]}@example.com"
        s = api_client.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": "passw0rd", "name": "Del"},
        )
        token = s.json()["token"]
        # Create an order so we exercise cascade delete
        prods = api_client.get(f"{BASE_URL}/api/products").json()
        api_client.post(
            f"{BASE_URL}/api/orders",
            headers=auth(token),
            json={"items": [{"product_id": prods[0]["id"], "quantity": 1}]},
        )
        r = api_client.delete(f"{BASE_URL}/api/me", headers=auth(token))
        assert r.status_code == 204
        # Subsequent /me must 401
        me = api_client.get(f"{BASE_URL}/api/me", headers=auth(token))
        assert me.status_code == 401
        # Signin with same email must now fail (user removed)
        si = api_client.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": email, "password": "passw0rd"},
        )
        assert si.status_code == 401
