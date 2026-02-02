# Vercel Deploy Notes (Converted from PHP)

This version is **safe to deploy on Vercel**:
- Frontend stays **static** (index.html + css/js/images).
- PHP is **removed** and replaced with **Vercel Serverless Functions** under `/api`.

## What changed
- `/api/gamesData.php` -> rewrite to `/api/gamesData` (serverless)
- `/api/pricing.php` -> rewrite to `/api/pricing` (serverless, MySQL)
- `/api/reviews.php` -> rewrite to `/api/reviews` (serverless, MySQL)
- Admin:
  - `/admin` serves `/admin/index.html`
  - Admin CRUD APIs are under `/api/admin/*` (cookie JWT auth + IP allowlist + stealth 404)

## Required Environment Variables (Vercel → Project → Settings → Environment Variables)

### MySQL (for pricing/reviews)
Set either `DATABASE_URL` **or** the split vars:

- DATABASE_URL = mysql://USER:PASSWORD@HOST:PORT/DBNAME

OR

- MYSQL_HOST
- MYSQL_PORT (optional, default 3306)
- MYSQL_DATABASE
- MYSQL_USER
- MYSQL_PASSWORD

### Admin Security
- ADMIN_JWT_SECRET (random 32+ chars)
- ADMIN_USER
- ADMIN_PASS_HASH (bcrypt hash)  ← use bcryptjs to generate, or any bcrypt generator
- ADMIN_ALLOWLIST (comma-separated IPs), example: `154.238.160.118,127.0.0.1`

Optional:
- CORS_ALLOW_ORIGINS (comma-separated origins). If omitted, same-origin only.

## Admin URLs
- Login: `/admin`
- Dashboard: `/admin/dashboard`

Admin pages are served through serverless functions to keep **stealth 404** for unauthorized users.

> Note: On Vercel you cannot use `.htaccess`. This build enforces the "stealth 404" behavior **inside the serverless APIs**.
