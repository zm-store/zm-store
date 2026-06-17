# Zm Store — Product Requirements

## What this is
A Kurdish (Sorani) e-commerce mobile app for beauty / grooming products ("Zm Store"). Originally built on the Rork.app / Specular sandbox; the backend on that platform was deactivated ("This branch has been merged and no longer has an active sandbox"), so authentication and profile editing stopped working with 401 errors. This project ports the entire app to the Emergent platform with a brand-new FastAPI + MongoDB backend and a fixed Google sign-in flow.

## What was migrated / fixed
1. **Backend rewritten in FastAPI + MongoDB.** All `/api/*` endpoints used by the frontend are implemented:
   - Auth: `POST /api/auth/signup`, `/api/auth/signin`, `/api/auth/google`, `/api/auth/logout`
   - Profile: `GET/PATCH/DELETE /api/me`, `GET /api/me/checkout-defaults`
   - Catalog: `GET /api/categories`, `/api/banners`, `/api/products`, `/api/products/{id}`
   - Orders: `POST/GET /api/orders`, `GET /api/orders/{id}`
   - Admin: `/api/admin/categories`, `/api/admin/banners`, `/api/admin/products`, `/api/admin/orders`, `/api/admin/settings`, `/api/admin/orders/pending-count`
2. **Google sign-in fixed.** Replaced `better-auth` (whose backend was hosted on the dead Rork sandbox) with Emergent-managed Google OAuth. Mobile uses `WebBrowser.openAuthSessionAsync`; web uses a top-level redirect. The Emergent session_id is exchanged via `POST /api/auth/google` for our own Bearer session_token.
3. **Profile 401 fixed.** The 401 errors came from the dead remote session. New backend stores sessions in MongoDB (`user_sessions` collection, 7-day TTL) and `PATCH /api/me` works again.
4. **Design polish.** Existing dark-navy theme preserved per user request ("design like it is but more beautiful"). Design guidelines (`/app/design_guidelines.json`) target a luxury / glassmorphism feel with champagne-gold (`#D4AF37`) accents.

## Tech stack
- **Mobile:** Expo SDK 54, expo-router file-based routing, React Native 0.81, RTL locked for Kurdish (`I18nManager.forceRTL(true)`)
- **Backend:** FastAPI, Motor (async MongoDB), bcrypt, httpx (for Emergent OAuth callback)
- **Storage:** MongoDB collections — `users`, `user_sessions`, `categories`, `banners`, `products`, `orders`, `settings`
- **Auth:** Emergent Google OAuth + custom email/password (bcrypt-hashed), Bearer session_token in `expo-secure-store` / localStorage

## Seeded data
On first backend startup, MongoDB is seeded with 4 categories (Cosmetics, Skincare, Perfumes, Hair Tools), 1 banner, and 3 sample products in IQD. See `server.py::startup`.

## Admin access
Admin email is hard-coded: `srtda6@gmail.com`. Anyone signing up or signing in with this email automatically gets `is_admin=true` and access to all `/api/admin/*` routes.
