# Vernita Backend — API Documentation

Centralized Node.js (Express + MongoDB) backend that powers three websites:

- **Website #1** — Main app: subscriptions, courses, webinars, coaching, productivity trackers
- **Website #2** — Marketing site: free consultation requests
- **Website #3** — Inquiry portal

All endpoints are mounted under **`/api/v1`**.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Variables](#environment-variables)
3. [Conventions](#conventions)
4. [Authentication](#1-authentication)
5. [User Profile](#2-user-profile)
6. [Subscriptions & Plans](#3-subscriptions--plans)
7. [Courses & Lessons](#4-courses--lessons)
8. [Webinars](#5-webinars)
9. [Coaching](#6-coaching)
10. [Productivity Trackers](#7-productivity-trackers)
11. [Goals, Tasks, Projects](#8-goals-tasks-projects)
12. [Notifications](#9-notifications)
13. [Inquiries & Consultations](#10-inquiries--consultations)
14. [File Uploads](#11-file-uploads)
15. [Payments (Stripe)](#12-payments-stripe)
16. [Admin Endpoints](#13-admin-endpoints)
17. [Reports & Dashboard](#14-reports--dashboard)
18. [Error Reference](#error-reference)
19. [Architecture](#architecture)

---

## Quick Start

```bash
git clone https://github.com/nizam-app/vernita-backend.git
cd vernita-backend
cp .env.example .env       # then fill in real values
npm install
npm run dev                # http://localhost:5000
```

| Env | Local |
|---|---|
| `npm run dev` | nodemon on `5000` |
| `npm start` | production node |

Production (Render): `https://vernita-backend.onrender.com/api/v1`

Health check:
```
GET /api/v1/health  →  { status: "ok", database: "connected" }
```

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `development` / `production` |
| `PORT` | no (Render injects) | local default 5000 |
| `HOST` | no (cloud auto = 0.0.0.0) | leave unset on Render |
| `MONGODB_URL` | yes | Atlas connection string |
| `JWT_SECRET` | yes | long random secret |
| `JWT_EXPIRES_IN` | no | default `7d` |
| `BCRYPT_SALT_ROUNDS` | no | default 10 |
| `CLIENT_URL` | yes (prod) | frontend origin for Stripe redirects |
| `CORS_ORIGIN` | yes | comma-separated allowed origins |
| `STRIPE_SECRET_KEY` | yes | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | yes | `whsec_...` from the Stripe destination |
| `CLOUDINARY_CLOUD_NAME` | yes | uploads |
| `CLOUDINARY_API_KEY` | yes | uploads |
| `CLOUDINARY_API_SECRET` | yes | uploads |
| `CLOUDINARY_FOLDER` | no | default `vernita/uploads` |
| `SMTP_*` | optional | consultation email alerts |

---

## Conventions

### Base URL
```
{{base_url}} = http://localhost:5000/api/v1
             | https://vernita-backend.onrender.com/api/v1
```

### Auth header
```
Authorization: Bearer <jwt_token>
```

### Standard success response
```json
{
  "status": "success",
  "message": "Human-readable message.",
  "data":    { ... } | [ ... ],
  "meta":    { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

### Standard error response
```json
{
  "status": "fail",
  "message": "Description of the failure."
}
```

### Pagination & filtering (common query params)
- `page` (default 1)
- `limit` (default 10, max 100)
- `search`
- `sortBy`, `sortOrder` (`asc | desc | 1 | -1`)
- module-specific filters: `category`, `status`, `accessType`, `isPublished`, etc.

---

## 1. Authentication

Base path: `/auth`

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Create new user |
| POST | `/auth/login` | public | User login |
| POST | `/auth/admin/login` | public | Admin login (separate flow) |
| POST | `/auth/logout` | user | Invalidate session |
| PATCH | `/auth/password` | user | Change password |

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "name": "Alice Doe",
  "email": "alice@example.com",
  "password": "12341234"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{ "email": "alice@example.com", "password": "12341234" }
```

Response:
```json
{
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": "...", "name": "Alice", "email": "...", "role": "user" }
  }
}
```

### Update password
```http
PATCH /auth/password
Authorization: Bearer <token>

{ "currentPassword": "old", "newPassword": "new1234" }
```

---

## 2. User Profile

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/users/me` | user | Current user profile |

---

## 3. Subscriptions & Plans

Base path: `/subscriptions`

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/subscriptions/plans` | public | List available plans |
| GET | `/subscriptions/plans/compare` | public | Plan comparison table |
| GET | `/subscriptions/current` | user | Get my active subscription |
| POST | `/subscriptions/checkout` | user | Start Stripe checkout for a plan |
| PATCH | `/subscriptions/cancel` | user | Cancel subscription |
| PATCH | `/subscriptions/change-plan` | user | Upgrade/downgrade |
| GET | `/subscriptions/history` | user | My past subscription orders |

### Checkout a plan
```http
POST /subscriptions/checkout
Authorization: Bearer <user_token>

{ "planId": "<plan_id>" }
```

Response includes `checkoutUrl` to redirect the user to Stripe.

---

## 4. Courses & Lessons

Course access types: **`free`**, **`paid`** (Stripe).

### Public

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/courses` | List published courses |
| GET | `/courses/featured` | List featured |
| GET | `/courses/:id` | Course detail (lessons hidden behind enrollment) |

### User

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/courses/my` | My enrollments |
| POST | `/courses/:id/enroll` | Enroll (free) |
| POST | `/courses/:id/checkout` | Start Stripe checkout (paid) |
| GET | `/courses/:id/lessons` | All lessons (requires enrollment) |
| GET | `/courses/:id/progress` | Overall progress |
| GET | `/lessons/:id` | One lesson detail |
| PATCH | `/lessons/:id/progress` | `{ "watchedSeconds": 42 }` |
| PATCH | `/lessons/:id/complete` | Mark lesson complete |

### Enrollment flow — FREE
```http
POST /courses/:id/enroll
Authorization: Bearer <token>
```
→ enrollment created with `paymentStatus: "free"`; lessons immediately accessible.

### Enrollment flow — PAID (Stripe)
```http
POST /courses/:id/checkout
Authorization: Bearer <token>
```
Response:
```json
{
  "data": {
    "requiresPayment": true,
    "checkoutUrl": "https://checkout.stripe.com/...",
    "enrollment": { "paymentStatus": "pending", ... },
    "order": { "status": "pending", ... }
  }
}
```
User opens `checkoutUrl` → pays with Stripe → webhook fires → `paymentStatus` flips to `"paid"`.

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

---

## 5. Webinars

Webinar fields: `isPaid: boolean`, `price`, `status: draft | upcoming | live | completed | canceled`.

### Public

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/webinars` | List published webinars |
| GET | `/webinars/categories` | Unique category list |
| GET | `/webinars/:id` | Detail |

### User

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/webinars/my` | My webinar registrations |
| POST | `/webinars/:id/register` | Register (free or paid) |
| POST | `/webinars/:id/checkout` | Start Stripe checkout (paid only) |
| GET | `/webinars/:id/join` | Get join link (requires payment for paid) |

### Free vs Paid

| isPaid | After `POST /register` | After `POST /checkout` (paid) |
|---|---|---|
| false | `registrationStatus: registered`, `paymentStatus: not_required` | n/a |
| true | `registrationStatus: pending_payment`, `paymentStatus: pending` | returns `checkoutUrl` → on success: `paymentStatus: completed` |

---

## 6. Coaching

Coaching access types: **`free`**, **`paid`**.

### Public

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/coaching/packages` | List published packages |
| GET | `/coaching/packages/featured` | Featured |
| GET | `/coaching/packages/:id` | Package detail |

### User

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/coaching/packages/:id/purchase` | Buy a package (free or paid) |
| GET | `/coaching/my` | My purchases |
| GET | `/coaching/my/:purchaseId` | Purchase detail |
| POST | `/coaching/my/:purchaseId/schedule` | Book a session |
| GET | `/coaching/my/:purchaseId/sessions` | List my sessions for this purchase |

### Schedule body
```json
{
  "scheduledAt": "2026-06-20T15:00:00.000Z",
  "durationMinutes": 30,
  "meetingLink": "https://zoom.us/j/...",
  "notes": "Career goals"
}
```

---

## 7. Productivity Trackers

All routes are user-authenticated.

### Finance — `/finance`
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/finance/dashboard` | Summary KPIs |
| GET/PATCH | `/finance/budget` | Monthly budget |
| GET/POST | `/finance/transactions` | List/create |
| GET | `/finance/transactions/recent` | Latest N |
| GET | `/finance/transactions/stats/summary` | Aggregate stats |
| GET/PATCH/DELETE | `/finance/transactions/:id` | One transaction |
| GET/POST | `/finance/goals` | Savings goals |
| PATCH | `/finance/goals/:id/progress` | Update progress |
| PATCH | `/finance/goals/:id/archive` / `unarchive` | Toggle archive |
| GET/PATCH/DELETE | `/finance/goals/:id` | One goal |

### Fitness — `/fitness`
| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/fitness` | List/create entries |
| GET | `/fitness/recent/activity` | Recent |
| GET | `/fitness/stats/weekly` | Weekly stats |
| GET/PATCH/DELETE | `/fitness/:id` | One entry |

### Self-care — `/self-care`
| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST/PATCH | `/self-care/today` | Today's entry |
| GET | `/self-care/history` | History |
| GET | `/self-care/stats/weekly` | Weekly stats |
| GET | `/self-care/stats/summary` | Aggregate |
| GET/DELETE | `/self-care/:id` | One entry |

### Reflections — `/reflections`
| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/reflections` | List/create |
| GET | `/reflections/by-date/:date` | One date |
| GET/PATCH/DELETE | `/reflections/:id` | One entry |

---

## 8. Goals, Tasks, Projects

### Goals — `/goals` (user)
| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/goals` | List/create |
| GET/PATCH/DELETE | `/goals/:id` | One goal |
| POST | `/goals/:id/milestones` | Add milestone |
| PATCH/DELETE | `/goals/:id/milestones/:milestoneId` | Update/delete |
| PATCH | `/goals/:id/recalculate-progress` | Recompute progress |
| PATCH | `/goals/:id/archive` / `unarchive` | Toggle archive |

### Tasks — `/tasks` (user)
| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/tasks` | List/create |
| GET | `/tasks/summary/counts` | Status counts |
| PATCH | `/tasks/:id/complete` | Mark done |
| GET/PATCH/DELETE | `/tasks/:id` | One task |

### Projects — `/projects`
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/projects` | user | List |
| POST | `/projects` | admin | Create |
| GET | `/projects/:projectId` | user | Detail |
| PATCH/DELETE | `/projects/:projectId` | admin | Update/delete |

---

## 9. Notifications

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/notifications` | user | My notifications |
| POST | `/notifications/read-all` | user | Mark all read |
| POST | `/notifications/:id/read` | user | Mark one read |

---

## 10. Inquiries & Consultations

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/inquiries` | public | Submit inquiry (Website #3) |
| POST | `/consultations` | public (rate-limited) | Schedule free consultation (Website #2) |

Consultation payload example:
```json
{
  "fullName": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1-555-0000",
  "service": "Coaching",
  "preferredDate": "2026-07-01",
  "message": "I'd like to learn more."
}
```

---

## 11. File Uploads

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/upload/image` | user | Upload a single image (multipart `image=<file>`) |

Most domain endpoints (courses, webinars, coaching, lessons) accept their own multipart uploads — see the individual sections.

---

## 12. Payments (Stripe)

### Webhook endpoint
```
POST /api/v1/payments/webhook
```
- Receives signed events from Stripe.
- Dispatches by `metadata.itemType`:
  - `course` → `handleCourseStripeWebhook`
  - `coaching` → `handleCoachingStripeWebhook`
  - `webinar` → `handleWebinarStripeWebhook`
  - (default) → `handleSubscriptionStripeWebhook`
- Returns `400 Invalid Stripe webhook signature` to any request without a valid `Stripe-Signature` header. **This is by design** — only Stripe can call this endpoint successfully.

### Required Stripe Dashboard setup

1. Developers → Webhooks → Add endpoint
   - URL: `https://YOUR-DOMAIN/api/v1/payments/webhook`
   - Events:
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
2. Copy the destination's **Signing secret** (`whsec_...`).
3. Set as `STRIPE_WEBHOOK_SECRET` in your server env.
4. Make sure your `STRIPE_SECRET_KEY` belongs to the same Stripe account/mode (test vs live).

### Common test card
```
4242 4242 4242 4242  | any future expiry | any CVC
```

### End-to-end flow (any paid product)
```
1. POST /<product>/checkout       → backend creates Stripe Session, returns checkoutUrl
2. user opens checkoutUrl, pays   → Stripe processes payment
3. Stripe → POST /payments/webhook (server-to-server)
4. backend marks Order + entity as paid
5. user can access the product
```

---

## 13. Admin Endpoints

All admin endpoints are mounted under **`/admin`** and require `protect + authorizeAdmin` (admin role + JWT).

### 13.1 Users
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/users` | Paginated list (search, subscription badge) |
| GET | `/admin/users/:userId` | Profile incl. enrollments/registrations/purchases |
| PATCH | `/admin/users/:userId` | Update user |
| DELETE | `/admin/users/:userId` | Delete user |

### 13.2 Courses
| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/admin/courses` | List / create (multipart banner) |
| GET/PATCH/DELETE | `/admin/courses/:id` | Detail / update / soft-delete |
| PATCH | `/admin/courses/:id/publish` | `{ "isPublished": true }` |
| PATCH | `/admin/courses/:id/feature` | `{ "isFeatured": true }` |
| GET | `/admin/courses/:id/enrollments` | All enrolled users |
| PATCH | `/admin/courses/:courseId/enrollments/:enrollmentId/complete-payment` | Manual mark paid |
| POST | `/admin/courses/:courseId/lessons` | Create lesson (multipart) |
| GET | `/admin/courses/:courseId/lessons` | List lessons |
| GET/PATCH/DELETE | `/admin/lessons/:id` | Lesson CRUD |
| PATCH | `/admin/lessons/reorder` | Reorder lessons |
| PATCH | `/admin/lessons/:id/publish` | Publish toggle |

### 13.3 Webinars
| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/admin/webinars` | List / create (multipart) |
| GET/PATCH/DELETE | `/admin/webinars/:id` | Detail / update / soft-delete |
| PATCH | `/admin/webinars/:id/publish` | `{ "isPublished": true }` |
| PATCH | `/admin/webinars/:id/status` | `{ "status": "live" }` |
| GET | `/admin/webinars/:id/registrations` | All registrations |
| PATCH | `/admin/webinars/:id/registrations/:registrationId/complete-payment` | Manual mark paid |

### 13.4 Coaching
| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/admin/coaching/packages` | List / create (multipart) |
| GET/PATCH/DELETE | `/admin/coaching/packages/:id` | Detail / update / soft-delete |
| PATCH | `/admin/coaching/packages/:id/publish` | `{ "publish": true }` |
| PATCH | `/admin/coaching/packages/:id/feature` | `{ "featured": true }` |
| GET | `/admin/coaching/packages/:id/purchases` | All purchases |

### 13.5 Plans (subscription plans)
| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/admin/plans` | List / create |
| GET/PATCH/DELETE | `/admin/plans/:id` | Detail / update / delete |
| PATCH | `/admin/plans/:id/status` | Activate/deactivate |
| PATCH | `/admin/plans/:id/recommended` | Toggle "recommended" |

### 13.6 Subscriptions & Payments
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/subscriptions/management` | Combined plans + analytics + revenue pulse |
| GET | `/admin/subscriptions` | List all subscriptions |
| GET | `/admin/subscriptions/:userId` | One user's subscription |
| GET | `/admin/payments` | All subscription/course/coaching/webinar payments |
| GET | `/admin/payments/:orderId` | Payment detail |

### 13.7 Orders (universal)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/orders` | Filterable: `itemType`, `status`, `from`, `to` |
| GET | `/admin/orders/reports/revenue` | Aggregate revenue |
| GET | `/admin/orders/:orderId` | Order detail |

### 13.8 Inquiries & Consultations
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/inquiries` | List inquiries |
| GET | `/admin/inquiries/:id` | One inquiry |
| GET | `/admin/consultations` | List consultations |
| GET | `/admin/consultations/:id` | One consultation |

### 13.9 Notifications (admin authoring)
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/admin/notifications/system` | Send a system notification |
| POST | `/admin/notifications/course-announcement` | Send course announcement |

---

## 14. Reports & Dashboard

Base path: `/admin/reports`. Admin only.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/reports/dashboard` | KPIs + 3 charts (default 6 months) |
| GET | `/admin/reports/overview` | Full reports page payload (4 charts) |
| GET | `/admin/reports/users-growth` | User growth time series |
| GET | `/admin/reports/revenue` | Revenue (filter `itemType=all\|subscription\|course\|webinar\|coaching`) |
| GET | `/admin/reports/courses` | Course performance + revenue |
| GET | `/admin/reports/webinars` | Webinar performance + revenue |
| GET | `/admin/reports/coaching-sales` | Coaching sales totals & series |

### KPIs returned by `/admin/reports/dashboard`
- `totalUsers` — total users + % change vs last month
- `activeSubscriptions` — `User.subscription.isActive=true && status=active`
- `webinarRegistrations` — registrations within range + next webinar
- `courseEnrollments` — enrollments within range + top course
- `coachingPurchases` — paid coaching orders + average ticket
- `revenueSummary` — sum of `Order.amount` where `status=paid` in trailing 30 days

> **Note:** revenue counts only `Order.status === "paid"`. The Stripe webhook is what flips this. If revenue stays at $0 despite payments, check Stripe Dashboard → Webhooks → Event deliveries for the most recent event status code.

Common query params: `from=2026-01-01&to=2026-05-31&currency=USD&top=10`.

---

## Error Reference

| Status | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad request (validation, business rule) |
| 401 | Missing/invalid JWT |
| 403 | Forbidden (role, blocked user, locked content) |
| 404 | Not found |
| 409 | Conflict (duplicate, seat full, already enrolled) |
| 422 | Unprocessable entity |
| 429 | Too many requests (rate limit) |
| 500 | Server error (env, DB) |
| 503 | Database connection failed |

All errors share the shape:
```json
{ "status": "fail", "message": "..." }
```

---

## Architecture

```
Browser/Postman → server.js → app.js → routes/index.js → module router
                                                        → controller → service → model (Mongo) → response
```

- **server.js** — bootstraps Mongo, starts HTTP listener (binds `0.0.0.0` on cloud)
- **app.js** — Helmet, CORS, Stripe webhook (raw body), JSON parser, `/api/v1` routes
- **modules/** — feature folders: `auth`, `user`, `course`, `webinar`, `coaching`, `subscription`, `plan`, `payment`, `order`, `report`, `inquiry`, `consultation`, `notification`, `goal`, `task`, `project`, `tracker/*`
- **config/** — `db.js`, `env.js`, `stripe.js`
- **middlewares/** — `auth`, `admin`, `upload`, `rateLimiter`, `notFound`, `globalError`
- **services/** — `upload.service.js` (Cloudinary), `notification.scheduler.js`, `mailer.js`

### Deploy targets
- **Render** — `render.yaml` blueprint, `npm start`, healthcheck `/api/v1/health`
- **Railway** — `railway.toml`, `npm start`, healthcheck `/api/v1/health`

### Local quick test order
1. `POST /auth/register` → `POST /auth/login` (save token)
2. `POST /admin/courses` (admin) — create paid course
3. `POST /courses/:id/checkout` (user) — get Stripe URL
4. Pay with `4242 4242 4242 4242`
5. `GET /courses/my` → `paymentStatus: "paid"`
6. `GET /admin/reports/dashboard` → revenue ticks up
