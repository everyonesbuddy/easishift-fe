# Easishift — Frontend

Easishift is a **multi-tenant workforce scheduling and management SaaS** built for care facilities. Admins get tools to plan coverage, build schedules, manage staff, and review time-off requests. Staff members get a self-service portal for their own schedule, shift swaps, time-off, messaging, and preferences.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Getting Started](#getting-started)
4. [Environment & API Configuration](#environment--api-configuration)
5. [Authentication Flow](#authentication-flow)
6. [Role System](#role-system)
7. [App Entry Point & Routing](#app-entry-point--routing)
8. [Paywall / Billing Guard](#paywall--billing-guard)
9. [Feature Areas](#feature-areas)
   - [Dashboard](#dashboard)
   - [Coverage Planning](#coverage-planning)
   - [Schedule Builder](#schedule-builder)
   - [Staff Management](#staff-management)
   - [Time Off](#time-off)
   - [Shift Swaps](#shift-swaps)
   - [Messages](#messages)
   - [Preferences](#preferences)
   - [Billing / Subscription](#billing--subscription)
10. [Shared Components](#shared-components)
11. [Key Developer Patterns](#key-developer-patterns)
12. [Deployment](#deployment)

---

## Tech Stack

| Concern        | Library / Version                                        |
| -------------- | -------------------------------------------------------- |
| Framework      | React 19 + Vite                                          |
| UI primitives  | MUI (Material UI) v7                                     |
| Routing        | React Router DOM v7                                      |
| HTTP           | Axios (wrapped in `src/config/api.js`)                   |
| Calendar views | FullCalendar v6 (dayGrid, timeGrid, interaction plugins) |
| Charts         | Recharts + Chart.js / react-chartjs-2                    |
| Date utilities | date-fns, dayjs                                          |
| Animations     | Framer Motion                                            |
| Notifications  | react-toastify                                           |
| Icons          | react-icons (MdX and FiX icon sets)                      |
| Utility CSS    | Tailwind CSS v4 (used alongside MUI `sx` prop)           |

---

## Project Structure

```
src/
├── App.jsx                      # Root component — layout shell + full route tree
├── main.jsx                     # ReactDOM entry; wraps <App> in <AuthProvider>
├── index.css / App.css          # Global styles
│
├── config/
│   └── api.js                   # Axios instance with runtime base-URL detection
│
├── context/
│   └── AuthContext.jsx          # Global auth state (user, role, tenant, login/logout)
│
└── components/
    ├── Auth/
    │   ├── Login.jsx
    │   ├── SignupTenant.jsx
    │   ├── ForgotPasswordModal.jsx
    │   ├── ResetPassword.jsx
    │   └── ChangePasswordModal.jsx
    │
    ├── Home/
    │   ├── Home.jsx                    # Public marketing/landing page
    │   └── TurnoverRoiCalculator.jsx   # Public ROI calculator tool
    │
    ├── Shared/
    │   ├── Navbar.jsx           # Top bar (mobile hamburger, user actions)
    │   ├── Sidebar.jsx          # Persistent left navigation (role-aware menu)
    │   ├── PrivateRoute.jsx     # Auth guard HOC — redirects to /login
    │   └── ConfirmDialog.jsx    # Reusable confirmation dialog for destructive actions
    │
    └── StaffPortal/
        ├── Billing/
        │   ├── ManageSubscription.jsx
        │   ├── BillingSuccess.jsx
        │   └── BillingCancel.jsx
        │
        ├── Coverage/
        │   ├── CoveragePlanningPage.jsx   # List + calendar view of coverage slots
        │   ├── CoverageCreateForm.jsx     # New coverage record form
        │   └── CoverageEditCountForm.jsx  # Edit headcount for existing slot
        │
        ├── Dashboard/
        │   ├── StaffDashboard.jsx              # Main hub — stats, charts, quick actions
        │   ├── StatCard.jsx                    # Individual KPI card
        │   ├── ScheduleAndCoverageCharts.jsx   # Recharts/Chart.js visualisations
        │   └── Paywall.jsx                     # Billing gate rendered when subscription inactive
        │
        ├── Messages/
        │   ├── MessageList.jsx      # Conversation list + inline thread view
        │   └── MessageComposer.jsx  # Compose new message modal
        │
        ├── NoAdminPreferences/
        │   └── PreferencesPage.jsx  # Staff-only scheduling preference form
        │
        ├── Schedule/
        │   ├── ScheduleList.jsx             # Table + FullCalendar dual view
        │   ├── ScheduleForm.jsx             # Create / edit single shift
        │   ├── AutoGenerateScheduleForm.jsx # AI/bulk schedule generation form
        │   ├── ShiftSwapRequestModal.jsx    # Initiate a swap request
        │   └── ShiftSwapRequestsPage.jsx    # Inbox + sent tabs for swaps
        │
        ├── Staffs/
        │   ├── StaffList.jsx              # Searchable, filterable staff directory
        │   ├── StaffCreateAndEditForm.jsx  # Create or edit a staff record
        │   └── BulkStaffModal.jsx         # CSV bulk-import modal
        │
        └── TimeOff/
            ├── TimeOffRequestList.jsx  # Personal request list + submission for all users
            ├── TimeOffRequestModal.jsx # Submit new time-off dialog
            └── TimeOffDecision.jsx     # Admin inbox — approve or deny requests
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server (connects to localhost:5000 backend by default)
npm run dev

# Production build
npm run build

# Preview the production bundle locally
npm run preview

# Lint
npm run lint
```

---

## Environment & API Configuration

**File:** `src/config/api.js`

All HTTP calls go through a single Axios instance. The backend base URL is resolved **at runtime** without requiring a `.env` file:

```
localhost  →  http://localhost:5000
any other hostname  →  https://easishift-be-1df7f9547644.herokuapp.com
```

Every request is prefixed with `/api/v1` and `withCredentials: true` is set globally. A `Bearer <token>` `Authorization` header is attached at login and restored from `localStorage` on page refresh.

If you need to override the backend at build time, extend `api.js` to read `import.meta.env.VITE_API_BASE`.

---

## Authentication Flow

**File:** `src/context/AuthContext.jsx`

`AuthProvider` wraps the entire app in `main.jsx`. It manages:

| Export            | Type           | Description                                                                  |
| ----------------- | -------------- | ---------------------------------------------------------------------------- |
| `user`            | object \| null | Parsed user from `localStorage`                                              |
| `role`            | string         | `"admin"`, `"superadmin"`, or `"staff"`                                      |
| `tenant`          | object \| null | Tenant document fetched from the API                                         |
| `loading`         | boolean        | `true` while hydrating from localStorage on first mount                      |
| `isAdmin`         | boolean        | Derived: `role === "admin" \|\| role === "superadmin"`                       |
| `login(data)`     | function       | Normalises API response, sets user/role state + localStorage, fetches tenant |
| `logout()`        | function       | Clears all state and localStorage                                            |
| `refreshTenant()` | function       | Re-fetches tenant data and updates state                                     |

**Session persistence:**
On mount, `AuthProvider` reads `user` and `token` from `localStorage`. If a token is found it is immediately set as the Axios default header, so the very first API calls made by any child component are already authenticated without waiting for a login action.

**Route guarding:**
`PrivateRoute` (`src/components/Shared/PrivateRoute.jsx`) redirects to `/login` for unauthenticated users. It waits for `loading === false` before evaluating, preventing false redirects on hard refresh while state hydrates.

---

## Role System

Two role categories control what a user sees and can do:

| Role value                 | `isAdmin` | Sidebar & access                                                                          |
| -------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| `"admin"` / `"superadmin"` | `true`    | Admin menu: staff mgmt, coverage, schedule builder, time-off decisions, billing, messages |
| `"staff"` (or any other)   | `false`   | Staff menu: my schedule, preferences, my time-off requests, shift swaps, messages         |

Role is stored in the `role` field on the user object returned by the backend. It is mirrored in `localStorage` for persistence. Components consume it via `const { role, isAdmin } = useAuth()`.

---

## App Entry Point & Routing

**File:** `src/App.jsx`

`App` evaluates two render paths before touching the main router:

### 1. Paywall path (admin with inactive subscription)

If `isAdmin && showPaywall` is true, a stripped-down router renders **only** `/billing` and redirects everything else there. This prevents any access to operational features until the subscription is active and seat count is above 1.

### 2. Normal path

The full `<BrowserRouter>` renders with a persistent `<Sidebar>` + `<Navbar>` shell on the left/top. Every operational route is wrapped in `<PrivateRoute>`.

### Full Route Map

| Path                       | Component               | Access                      |
| -------------------------- | ----------------------- | --------------------------- |
| `/`                        | `Home`                  | Public                      |
| `/turnover-roi-calculator` | `TurnoverRoiCalculator` | Public                      |
| `/login`                   | `Login`                 | Public                      |
| `/reset-password`          | `ResetPassword`         | Public                      |
| `/signup-tenant`           | `SignupTenant`          | Public                      |
| `/billing`                 | `ManageSubscription`    | Public (internally guarded) |
| `/billing/success`         | `BillingSuccess`        | Public                      |
| `/billing/cancel`          | `BillingCancel`         | Public                      |
| `/dashboard`               | `StaffDashboard`        | Private                     |
| `/coverage-planning`       | `CoveragePlanningPage`  | Private — admin             |
| `/schedule`                | `ScheduleList`          | Private                     |
| `/swap-requests`           | `ShiftSwapRequestsPage` | Private                     |
| `/staffs`                  | `StaffList`             | Private — admin             |
| `/timeoff-decisions`       | `TimeOffDecision`       | Private — admin             |
| `/timeoff-requests`        | `TimeOffRequestList`    | Private                     |
| `/messages`                | `MessageList`           | Private                     |
| `/preferences`             | `PreferencesPage`       | Private — staff             |

> Note: `PrivateRoute` only checks authentication. Role-level restrictions (e.g. admin-only pages) are enforced by the backend API responses or by conditional rendering inside the components.

---

## Paywall / Billing Guard

**File:** `src/components/StaffPortal/Dashboard/Paywall.jsx`

An admin is shown the paywall when either condition is true:

- `tenant.subscriptionStatus !== "active"` — subscription has lapsed or was never started
- `tenant.seatLimit <= 1` — tenant is on a trial or minimal plan

While paywalled, the entire app collapses to a single `/billing` route served by `Paywall.jsx`, which prompts the admin to upgrade. Once Stripe completes the checkout and redirects to `/billing/success`, `BillingSuccess` calls `refreshTenant()` from `AuthContext`, which re-fetches the tenant and causes `showPaywall` to resolve to `false`, unlocking the full app automatically.

---

## Feature Areas

### Dashboard

**`StaffDashboard`** is the operational hub. On mount it calls `GET /api/v1/dashboard/summary` and renders:

- **`StatCard` row** — KPIs like total staff count, pending time-off count, unread messages, upcoming shifts.
- **`ScheduleAndCoverageCharts`** — Bar/line charts showing scheduled hours vs coverage requirements.
- **Quick-action modals** — Inline dialogs to add a staff member, send a message, create a coverage slot, or build/auto-generate a schedule without navigating away.

The dashboard is visible to both admins and staff, but admin sees the full summary (org-wide) while staff sees their personal snapshot.

---

### Coverage Planning

**`CoveragePlanningPage`** lets admins define minimum staffing levels per role per time window (e.g. "3 RNs needed on the night shift, Mon–Fri").

- **List view** — paginated table of all coverage records with edit/delete.
- **Calendar view** — FullCalendar time-grid showing coverage blocks as events.
- **`CoverageCreateForm`** — creates a new coverage slot (role, required count, start/end time).
- **`CoverageEditCountForm`** — quick edit to change the headcount on an existing slot.

API endpoints used: `GET /api/v1/coverage`, `POST /api/v1/coverage`, `PATCH /api/v1/coverage/:id`, `DELETE /api/v1/coverage/:id`.

---

### Schedule Builder

**`ScheduleList`** is a dual-mode shift management page.

- **Table view** — paginated list with columns for staff name, role, shift window, and status. Admins see all shifts; staff see only their own.
- **Calendar view** — FullCalendar day/week grid with colour-coded events by role (colours defined in the local `ROLE_COLORS` map).

**Creating / editing shifts:**

- `ScheduleForm` — single shift create/edit dialog.
- `AutoGenerateScheduleForm` — AI-assisted bulk generation; admin picks a date range and the backend fills gaps against the coverage plan.

**Shift swaps (staff):** Any staff member can open `ShiftSwapRequestModal` on a shift they are scheduled for to request a swap with a colleague. The swap request then appears in `ShiftSwapRequestsPage`.

---

### Staff Management

**`StaffList`** is admin-only. It provides:

- Full-text search across name and email.
- Role filter dropdown.
- Create / edit a staff member via `StaffCreateAndEditForm` (dialog form).
- **Bulk import** — `BulkStaffModal` accepts a CSV file and posts all rows to the backend in a single request.
- Delete with a `ConfirmDialog` prompt before the API call.

Staff records carry a `role` field that maps to the `ROLE_COLORS` lookup used across the schedule and coverage views.

---

### Time Off

Three components make up the time-off feature:

| Component             | Used by    | Purpose                                                                                                                                   |
| --------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `TimeOffRequestList`  | Everyone   | Lists the logged-in user's own requests grouped as Pending / Approved / Denied. Includes a "Request Time Off" button that opens the modal |
| `TimeOffRequestModal` | Everyone   | Dialog with start datetime, end datetime, and optional reason. Posts to `POST /api/v1/timeoff`                                            |
| `TimeOffDecision`     | Admin only | Shows all pending requests across the org. Admin can approve or deny each one                                                             |

**Admin sidebar links:**

- **Time Off Decisions** → `/timeoff-decisions` — org-wide approval queue
- **My Time Off Requests** → `/timeoff-requests` — admin's own personal requests

**Staff sidebar link:**

- **My Time Off Requests** → `/timeoff-requests`

---

### Shift Swaps

**`ShiftSwapRequestsPage`** has two tabs:

- **Inbox** — swap requests sent to the current user. They can accept or deny each one.
- **Sent** — requests the current user has initiated. They can cancel pending ones.

Admins see all requests org-wide. Staff see only requests they are a party to.

A new swap is initiated via `ShiftSwapRequestModal`, which lets the requester pick a colleague and propose the time window.

Status values: `pending`, `accepted`, `denied`, `cancelled`, `expired` — each maps to a MUI `Chip` colour via the `STATUS_COLOR` map.

---

### Messages

**`MessageList`** provides internal messaging within a tenant:

- Left panel: conversation list with search and unread badge counts.
- Right panel: thread view with inline reply.
- New message: `MessageComposer` modal — pick a recipient and write a message.

All messages are scoped to the tenant so staff from different facilities never see each other's data.

---

### Preferences

**`PreferencesPage`** is visible only to non-admin staff. Staff declare:

- Preferred days of the week.
- Preferred shift times.
- Any scheduling constraints.

These preferences are stored on the backend and consumed by the `AutoGenerateScheduleForm` when building schedules.

---

### Billing / Subscription

**`ManageSubscription`** is accessible from the sidebar and handles Stripe-backed plan management. The flow:

1. Admin opens `/billing` and selects a plan.
2. App calls the backend to create a Stripe Checkout session and redirects the browser to Stripe.
3. On success, Stripe redirects to `/billing/success` → `BillingSuccess` calls `refreshTenant()` → `showPaywall` resolves to `false` → full app unlocks.
4. On cancellation, Stripe redirects to `/billing/cancel` → `BillingCancel` shows a graceful message.

---

## Shared Components

| Component             | Description                                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Navbar`              | Top bar — branding, mobile hamburger (triggers Sidebar open via `mobileOpen` state lifted to `App`), user quick-actions                                                                                                     |
| `Sidebar`             | Persistent left nav drawer. Renders `adminMenuItems` or `staffMenuItems` based on `user.role`. Bottom section shows user name/email and a `...` menu for Change Password. Permanent on `sm+`, temporary (overlay) on mobile |
| `PrivateRoute`        | Wraps any route that requires auth. Renders `null` / loading text until `AuthContext.loading` settles, then redirects to `/login` if no user                                                                                |
| `ConfirmDialog`       | Generic "Are you sure?" dialog used before any destructive API call (delete staff, delete shift, etc.)                                                                                                                      |
| `ChangePasswordModal` | Auth modal accessible from the Sidebar footer menu                                                                                                                                                                          |

---

## Key Developer Patterns

### API calls

Every component imports `api` from `src/config/api.js` and calls `api.get(...)`, `api.post(...)`, etc. No component calls `axios` directly (except dead-code comments). Error handling consistently follows:

```js
try {
  const res = await api.get("/some-endpoint");
  // handle res.data
} catch (err) {
  const msg = err?.response?.data?.message || "Fallback message";
  toast.error(msg);
}
```

### Role-aware rendering

Components check `isAdmin` or `role` from `useAuth()` to show/hide UI sections rather than maintaining separate pages. For example, `TimeOffRequestList` shows admin approve/deny actions inline when `isAdmin === true`.

### Modal-first UX

Forms (create staff, create shift, request time off, compose message, etc.) are all rendered as MUI `<Dialog>` components triggered by local state (`openModal`). This avoids full page navigations for common CRUD actions.

### Inline pagination

List pages use MUI `<TablePagination>` with local `page` / `rowsPerPage` state. Data is fetched in full and sliced client-side. No cursor or server-side pagination is implemented yet.

---

## Deployment

The app is deployed to **Netlify**.

| Setting           | Value                                                                      |
| ----------------- | -------------------------------------------------------------------------- |
| Build command     | `npm run build`                                                            |
| Publish directory | `dist`                                                                     |
| SPA redirect      | `netlify.toml` + `public/_redirects` both contain `/* → /index.html (200)` |

No build-time environment variables are required — the API base URL is determined at runtime from `window.location.hostname`. To target a different backend at build time, add `VITE_API_BASE` to your Netlify environment variables and update `src/config/api.js` to read `import.meta.env.VITE_API_BASE`.
