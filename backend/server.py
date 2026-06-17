"""
Zm Store backend — FastAPI + MongoDB
Implements all endpoints used by the Expo frontend:
  - Auth (email + Emergent Google OAuth) producing a Bearer session_token
  - /api/me (GET/PATCH/DELETE) + /api/me/checkout-defaults
  - /api/settings + /api/admin/settings
  - /api/categories + /api/admin/categories CRUD
  - /api/banners + /api/admin/banners CRUD
  - /api/products + /api/admin/products CRUD
  - /api/orders (user) + /api/admin/orders (admin) with status transitions
"""
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Literal

import bcrypt
import httpx
from fastapi import FastAPI, APIRouter, Header, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("zmstore")

ADMIN_EMAILS = {"srtda6@gmail.com"}
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

app = FastAPI(title="Zm Store API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ─── helpers ────────────────────────────────────────────────────────────────
def now() -> datetime:
    return datetime.now(timezone.utc)


def make_id(prefix: str = "id") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def is_admin_email(email: Optional[str]) -> bool:
    return (email or "").lower() in ADMIN_EMAILS


async def get_session_user(authorization: Optional[str]) -> Optional[dict]:
    """Return user dict from Bearer token, or None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        return None
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    expires = session.get("expires_at")
    if isinstance(expires, datetime):
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < now():
            await db.user_sessions.delete_one({"session_token": token})
            return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user


async def require_user(authorization: Optional[str]) -> dict:
    user = await get_session_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user


async def require_admin(authorization: Optional[str]) -> dict:
    user = await require_user(authorization)
    if not (user.get("is_admin") or is_admin_email(user.get("email"))):
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


def serialize_user(user: dict) -> dict:
    return {
        "id": user["user_id"],
        "email": user["email"],
        "name": user.get("name") or "",
        "image": user.get("image"),
        "is_admin": bool(user.get("is_admin") or is_admin_email(user.get("email"))),
        "last_phone": user.get("last_phone"),
        "last_address": user.get("last_address"),
        "points_balance": int(user.get("points_balance") or 0),
    }


async def issue_session(user_id: str) -> str:
    token = uuid.uuid4().hex + uuid.uuid4().hex
    await db.user_sessions.insert_one(
        {
            "session_token": token,
            "user_id": user_id,
            "created_at": now(),
            "expires_at": now() + timedelta(days=7),
        }
    )
    return token


async def upsert_user_by_email(
    email: str, name: str = "", image: Optional[str] = None, password_hash: Optional[str] = None
) -> dict:
    existing = await db.users.find_one({"email": email.lower()}, {"_id": 0})
    if existing:
        # Update name/image if provided and missing
        updates = {}
        if name and not existing.get("name"):
            updates["name"] = name
        if image and not existing.get("image"):
            updates["image"] = image
        if updates:
            updates["updated_at"] = now()
            await db.users.update_one({"user_id": existing["user_id"]}, {"$set": updates})
            existing.update(updates)
        return existing

    user_id = make_id("user")
    doc = {
        "user_id": user_id,
        "email": email.lower(),
        "name": name or "",
        "image": image,
        "password_hash": password_hash,
        "is_admin": is_admin_email(email),
        "last_phone": None,
        "last_address": None,
        "points_balance": 0,
        "created_at": now(),
        "updated_at": now(),
    }
    await db.users.insert_one(doc)
    return doc


# ─── schemas ────────────────────────────────────────────────────────────────
class EmailSignup(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = ""


class EmailSignin(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthBody(BaseModel):
    session_id: str


class UpdateMeBody(BaseModel):
    name: Optional[str] = None
    image: Optional[str] = None


class SettingsBody(BaseModel):
    delivery_fee: Optional[float] = None
    service_fee: Optional[float] = None


class CategoryBody(BaseModel):
    slug: Optional[str] = None
    name_ku: Optional[str] = None
    name_en: Optional[str] = None
    sort_order: Optional[int] = 0
    image_url: Optional[str] = None


class BannerBody(BaseModel):
    image_url: Optional[str] = None
    title: Optional[str] = None
    link_url: Optional[str] = None
    sort_order: Optional[int] = 0
    active: Optional[bool] = True


class ProductBody(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    in_stock: Optional[bool] = True
    video_url: Optional[str] = None
    points_per_purchase: Optional[int] = 0


class OrderItemBody(BaseModel):
    product_id: str
    quantity: int = Field(ge=1)


class CreateOrderBody(BaseModel):
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    notes: Optional[str] = None
    customer_name: Optional[str] = None
    items: List[OrderItemBody]


class OrderStatusBody(BaseModel):
    status: Literal[
        "pending", "accepted", "preparing", "picked_up", "delivered", "rejected", "completed", "cancelled"
    ]


# ─── auth ───────────────────────────────────────────────────────────────────
@api.post("/auth/signup")
async def signup(body: EmailSignup):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    pw = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = await upsert_user_by_email(body.email, body.name or "", password_hash=pw)
    token = await issue_session(user["user_id"])
    return {"token": token, "user": serialize_user(user)}


@api.post("/auth/signin")
async def signin(body: EmailSignin):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(401, "Invalid email or password")
    if not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Invalid email or password")
    token = await issue_session(user["user_id"])
    return {"token": token, "user": serialize_user(user)}


@api.post("/auth/google")
async def google_auth(body: GoogleAuthBody):
    """Exchange Emergent session_id for our app session_token."""
    async with httpx.AsyncClient(timeout=20) as http:
        resp = await http.get(
            EMERGENT_SESSION_URL,
            headers={"X-Session-ID": body.session_id},
        )
    if resp.status_code != 200:
        log.warning("Emergent auth failed: %s %s", resp.status_code, resp.text[:200])
        raise HTTPException(401, "Google authentication failed")
    data = resp.json()
    email = data.get("email")
    if not email:
        raise HTTPException(401, "No email returned from Google")
    user = await upsert_user_by_email(email, name=data.get("name") or "", image=data.get("picture"))
    token = await issue_session(user["user_id"])
    return {"token": token, "user": serialize_user(user)}


@api.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_many({"session_token": token})
    return {"ok": True}


# ─── user / me ──────────────────────────────────────────────────────────────
@api.get("/me")
async def get_me(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    return serialize_user(user)


@api.patch("/me")
async def patch_me(body: UpdateMeBody, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    updates = {}
    if body.name is not None:
        trimmed = body.name.strip()
        if not trimmed:
            raise HTTPException(400, "Name cannot be empty")
        if len(trimmed) > 80:
            raise HTTPException(400, "Name exceeds 80 characters")
        updates["name"] = trimmed
    if body.image is not None:
        if body.image == "" or body.image is None:
            updates["image"] = None
        else:
            if len(body.image) > 200000:
                raise HTTPException(413, "Image too large")
            if not (body.image.startswith("http://") or body.image.startswith("https://") or body.image.startswith("data:image/")):
                raise HTTPException(400, "Invalid image value")
            updates["image"] = body.image
    if not updates:
        raise HTTPException(400, "No updatable fields provided")
    updates["updated_at"] = now()
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return serialize_user(user)


@api.get("/me/checkout-defaults")
async def checkout_defaults(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    return {"phone": user.get("last_phone"), "address": user.get("last_address")}


@api.delete("/me")
async def delete_me(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    uid = user["user_id"]
    await db.orders.delete_many({"user_id": uid})
    await db.user_sessions.delete_many({"user_id": uid})
    await db.users.delete_one({"user_id": uid})
    return JSONResponse(status_code=204, content=None)


# ─── settings ───────────────────────────────────────────────────────────────
DEFAULT_SETTINGS = {"delivery_fee": 3000, "service_fee": 1000}


async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"key": "app_settings"}, {"_id": 0})
    if not doc:
        doc = {"key": "app_settings", **DEFAULT_SETTINGS, "updated_at": now()}
        await db.settings.insert_one(doc.copy())
    return doc


@api.get("/settings")
async def get_settings():
    doc = await get_settings_doc()
    return {"delivery_fee": doc.get("delivery_fee", 0), "service_fee": doc.get("service_fee", 0)}


@api.get("/admin/settings")
async def admin_get_settings(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    return await get_settings()


@api.patch("/admin/settings")
async def admin_patch_settings(body: SettingsBody, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        updates["updated_at"] = now()
        await db.settings.update_one({"key": "app_settings"}, {"$set": updates}, upsert=True)
    return await get_settings()


# ─── categories ─────────────────────────────────────────────────────────────
def _cat_out(c: dict) -> dict:
    return {
        "id": c["category_id"],
        "slug": c.get("slug") or c["category_id"],
        "name_ku": c.get("name_ku", ""),
        "name_en": c.get("name_en", ""),
        "sort_order": c.get("sort_order", 0),
        "image_url": c.get("image_url"),
    }


@api.get("/categories")
async def list_categories():
    docs = await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    return [_cat_out(c) for c in docs]


@api.get("/admin/categories")
async def admin_list_categories(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    return await list_categories()


@api.post("/admin/categories")
async def admin_create_category(body: CategoryBody, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    if not body.name_ku and not body.name_en:
        raise HTTPException(400, "Category name required")
    cid = make_id("cat")
    doc = {
        "category_id": cid,
        "slug": (body.slug or body.name_en or cid).lower().replace(" ", "_"),
        "name_ku": body.name_ku or "",
        "name_en": body.name_en or "",
        "sort_order": body.sort_order or 0,
        "image_url": body.image_url,
        "created_at": now(),
    }
    await db.categories.insert_one(doc.copy())
    return _cat_out(doc)


@api.patch("/admin/categories/{cat_id}")
async def admin_update_category(cat_id: str, body: CategoryBody, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        await db.categories.update_one({"category_id": cat_id}, {"$set": updates})
    doc = await db.categories.find_one({"category_id": cat_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return _cat_out(doc)


@api.delete("/admin/categories/{cat_id}")
async def admin_delete_category(cat_id: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.categories.delete_one({"category_id": cat_id})
    await db.products.delete_many({"category_id": cat_id})
    return JSONResponse(status_code=204, content=None)


# ─── banners ────────────────────────────────────────────────────────────────
def _banner_out(b: dict) -> dict:
    return {
        "id": b["banner_id"],
        "image_url": b.get("image_url", ""),
        "title": b.get("title"),
        "link_url": b.get("link_url"),
        "sort_order": b.get("sort_order", 0),
        "active": bool(b.get("active", True)),
    }


@api.get("/banners")
async def list_banners():
    docs = await db.banners.find({"active": True}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return [_banner_out(b) for b in docs]


@api.get("/admin/banners")
async def admin_list_banners(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    docs = await db.banners.find({}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    return [_banner_out(b) for b in docs]


@api.post("/admin/banners")
async def admin_create_banner(body: BannerBody, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    if not body.image_url:
        raise HTTPException(400, "image_url required")
    bid = make_id("ban")
    doc = {
        "banner_id": bid,
        "image_url": body.image_url,
        "title": body.title,
        "link_url": body.link_url,
        "sort_order": body.sort_order or 0,
        "active": body.active if body.active is not None else True,
        "created_at": now(),
    }
    await db.banners.insert_one(doc.copy())
    return _banner_out(doc)


@api.patch("/admin/banners/{bid}")
async def admin_update_banner(bid: str, body: BannerBody, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        await db.banners.update_one({"banner_id": bid}, {"$set": updates})
    doc = await db.banners.find_one({"banner_id": bid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return _banner_out(doc)


@api.delete("/admin/banners/{bid}")
async def admin_delete_banner(bid: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.banners.delete_one({"banner_id": bid})
    return JSONResponse(status_code=204, content=None)


# ─── products ───────────────────────────────────────────────────────────────
async def _product_out(p: dict) -> dict:
    cat = await db.categories.find_one({"category_id": p.get("category_id")}, {"_id": 0, "slug": 1})
    return {
        "id": p["product_id"],
        "category_id": p.get("category_id"),
        "category_slug": (cat or {}).get("slug"),
        "name": p.get("name", ""),
        "description": p.get("description"),
        "price": float(p.get("price") or 0),
        "image_url": p.get("image_url"),
        "in_stock": bool(p.get("in_stock", True)),
        "created_at": (p.get("created_at") or now()).isoformat() if isinstance(p.get("created_at"), datetime) else str(p.get("created_at") or ""),
        "video_url": p.get("video_url"),
        "points_per_purchase": int(p.get("points_per_purchase") or 0),
    }


@api.get("/products")
async def list_products(category: Optional[str] = None):
    q = {}
    if category:
        cat = await db.categories.find_one({"slug": category}, {"_id": 0, "category_id": 1})
        if cat:
            q["category_id"] = cat["category_id"]
    docs = await db.products.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [await _product_out(d) for d in docs]


@api.get("/products/{pid}")
async def get_product(pid: str):
    doc = await db.products.find_one({"product_id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Product not found")
    return await _product_out(doc)


@api.post("/admin/products")
async def admin_create_product(body: ProductBody, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    if not body.name or body.price is None:
        raise HTTPException(400, "name and price required")
    pid = make_id("prd")
    doc = {
        "product_id": pid,
        "category_id": body.category_id,
        "name": body.name,
        "description": body.description,
        "price": float(body.price),
        "image_url": body.image_url,
        "in_stock": body.in_stock if body.in_stock is not None else True,
        "video_url": body.video_url,
        "points_per_purchase": body.points_per_purchase or 0,
        "created_at": now(),
    }
    await db.products.insert_one(doc.copy())
    return await _product_out(doc)


@api.patch("/admin/products/{pid}")
async def admin_update_product(pid: str, body: ProductBody, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if "price" in updates:
        updates["price"] = float(updates["price"])
    if updates:
        await db.products.update_one({"product_id": pid}, {"$set": updates})
    doc = await db.products.find_one({"product_id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return await _product_out(doc)


@api.delete("/admin/products/{pid}")
async def admin_delete_product(pid: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.products.delete_one({"product_id": pid})
    return JSONResponse(status_code=204, content=None)


# ─── orders ─────────────────────────────────────────────────────────────────
def _order_out(o: dict) -> dict:
    return {
        "id": o["order_id"],
        "status": o.get("status", "pending"),
        "subtotal": float(o.get("subtotal") or 0),
        "delivery_fee": float(o.get("delivery_fee") or 0),
        "service_fee": float(o.get("service_fee") or 0),
        "total": float(o.get("total") or 0),
        "customer_name": o.get("customer_name", ""),
        "customer_phone": o.get("customer_phone"),
        "delivery_address": o.get("delivery_address"),
        "notes": o.get("notes"),
        "created_at": o["created_at"].isoformat() if isinstance(o.get("created_at"), datetime) else str(o.get("created_at") or ""),
        "updated_at": o["updated_at"].isoformat() if isinstance(o.get("updated_at"), datetime) else str(o.get("updated_at") or ""),
        "items": o.get("items", []),
        "status_history": [
            {"status": h["status"], "created_at": h["created_at"].isoformat() if isinstance(h.get("created_at"), datetime) else str(h.get("created_at") or "")}
            for h in o.get("status_history", [])
        ],
    }


@api.post("/orders")
async def create_order(body: CreateOrderBody, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    if not body.items:
        raise HTTPException(400, "No items in order")
    settings = await get_settings_doc()
    items_out = []
    subtotal = 0.0
    for it in body.items:
        prod = await db.products.find_one({"product_id": it.product_id}, {"_id": 0})
        if not prod:
            raise HTTPException(400, f"Product {it.product_id} not found")
        line = float(prod.get("price") or 0) * it.quantity
        subtotal += line
        items_out.append(
            {
                "id": make_id("oitm"),
                "product_id": it.product_id,
                "product_name": prod.get("name"),
                "product_image_url": prod.get("image_url"),
                "unit_price": float(prod.get("price") or 0),
                "quantity": it.quantity,
            }
        )
    delivery_fee = float(settings.get("delivery_fee") or 0)
    service_fee = float(settings.get("service_fee") or 0)
    total = subtotal + delivery_fee + service_fee
    customer_name = body.customer_name or user.get("name") or user.get("email", "Customer")
    oid = make_id("ord")
    doc = {
        "order_id": oid,
        "user_id": user["user_id"],
        "status": "pending",
        "subtotal": subtotal,
        "delivery_fee": delivery_fee,
        "service_fee": service_fee,
        "total": total,
        "customer_name": customer_name,
        "customer_phone": body.customer_phone,
        "delivery_address": body.delivery_address,
        "notes": body.notes,
        "items": items_out,
        "status_history": [{"status": "pending", "created_at": now()}],
        "created_at": now(),
        "updated_at": now(),
    }
    await db.orders.insert_one(doc.copy())
    # Save last_phone/address to user
    profile_updates = {}
    if body.customer_phone:
        profile_updates["last_phone"] = body.customer_phone
    if body.delivery_address:
        profile_updates["last_address"] = body.delivery_address
    if profile_updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": profile_updates})
    return _order_out(doc)


@api.get("/orders")
async def list_my_orders(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    docs = await db.orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [_order_out(d) for d in docs]


@api.get("/orders/{oid}")
async def get_my_order(oid: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    doc = await db.orders.find_one({"order_id": oid, "user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Order not found")
    return _order_out(doc)


@api.get("/admin/orders/pending-count")
async def admin_pending_count(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    n = await db.orders.count_documents({"status": "pending"})
    return {"count": n}


@api.get("/admin/orders")
async def admin_list_orders(status: Optional[str] = None, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    q = {}
    if status and status != "all":
        q["status"] = status
    docs = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [_order_out(d) for d in docs]


@api.get("/admin/orders/{oid}")
async def admin_get_order(oid: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    doc = await db.orders.find_one({"order_id": oid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Order not found")
    return _order_out(doc)


@api.patch("/admin/orders/{oid}")
async def admin_update_order_status(oid: str, body: OrderStatusBody, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    doc = await db.orders.find_one({"order_id": oid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Order not found")
    history = doc.get("status_history", [])
    history.append({"status": body.status, "created_at": now()})
    await db.orders.update_one(
        {"order_id": oid},
        {"$set": {"status": body.status, "status_history": history, "updated_at": now()}},
    )
    doc = await db.orders.find_one({"order_id": oid}, {"_id": 0})
    return _order_out(doc)


# ─── seed ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    # Ensure indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.categories.create_index("category_id", unique=True)
    await db.categories.create_index("slug")
    await db.banners.create_index("banner_id", unique=True)
    await db.products.create_index("product_id", unique=True)
    await db.products.create_index("category_id")
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index("user_id")

    # Seed minimal data if empty
    if await db.categories.count_documents({}) == 0:
        cats = [
            ("جوانکاری", "Cosmetics", "https://images.unsplash.com/photo-1522335789203-aaa2f8aa8d51?w=400"),
            ("پاراستنی پێست", "Skincare", "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400"),
            ("بۆنە", "Perfumes", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400"),
            ("ئامێری سەلمانی", "Hair Tools", "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400"),
        ]
        for i, (ku, en, img) in enumerate(cats):
            await db.categories.insert_one(
                {
                    "category_id": make_id("cat"),
                    "slug": en.lower().replace(" ", "_"),
                    "name_ku": ku,
                    "name_en": en,
                    "sort_order": i,
                    "image_url": img,
                    "created_at": now(),
                }
            )
    if await db.banners.count_documents({}) == 0:
        await db.banners.insert_one(
            {
                "banner_id": make_id("ban"),
                "image_url": "https://images.unsplash.com/photo-1766941288512-94a057e71d43?w=1200",
                "title": "Zm Store - بەخێربێیت",
                "link_url": None,
                "sort_order": 0,
                "active": True,
                "created_at": now(),
            }
        )
    if await db.products.count_documents({}) == 0:
        cat = await db.categories.find_one({}, {"_id": 0})
        if cat:
            samples = [
                ("سکارا بۆ چاو", "Mascara waterproof premium", 12000,
                 "https://images.unsplash.com/photo-1631214540242-8c2b4b1e9b2e?w=400"),
                ("کرێمی پاراستنی پێست", "Premium skincare cream", 25000,
                 "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400"),
                ("بۆنە لۆکس", "Luxury perfume", 65000,
                 "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400"),
            ]
            for name, desc, price, img in samples:
                await db.products.insert_one(
                    {
                        "product_id": make_id("prd"),
                        "category_id": cat["category_id"],
                        "name": name,
                        "description": desc,
                        "price": float(price),
                        "image_url": img,
                        "in_stock": True,
                        "video_url": None,
                        "points_per_purchase": 10,
                        "created_at": now(),
                    }
                )
    log.info("Startup complete; %s categories, %s products",
             await db.categories.count_documents({}),
             await db.products.count_documents({}))


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)


@app.get("/")
async def root():
    return {"service": "Zm Store API", "status": "ok"}
