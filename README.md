# WiserShifts — Frontend

WiserShifts is a **multi-tenant workforce scheduling and management SaaS** built for care facilities. Admins get tools to plan coverage, build schedules, manage staff, and review time-off requests. Staff members get a self-service portal for their own schedule, shift swaps, time-off, messaging, and preferences.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Getting Started](#getting-started)
4. [Environment & API Configuration](#environment--api-configuration)
5. [Authentication & Session Lifecycle](#authentication--session-lifecycle)
6. [Role System](#role-system)
7. [Date & Timezone Architecture](#date--timezone-architecture)
8. [App Entry Point & Routing](#app-entry-point--routing)
9. [Paywall / Billing Guard](#paywall--billing-guard)
10. [Feature Areas](#feature-areas)

- [Facility Preferences & Timezone](#facility-preferences--timezone)
- [Dashboard](#dashboard)
- [Coverage Planning](#coverage-planning)
- [Schedule Builder & Roster](#schedule-builder--roster)
- [Staff Management](#staff-management)
- [Time Off](#time-off)
- [Shift Swaps](#shift-swaps)
- [Messages](#messages)
- [Staff Preferences](#staff-preferences)
- [Billing / Subscription](#billing--subscription)

11. [Interactive Guide Tours](#interactive-guide-tours)
12. [Shared Components](#shared-components)
13. [Key Developer Patterns](#key-developer-patterns)
14. [Performance Optimizations](#performance-optimizations)
15. [Recent Major Changes](#recent-major-changes)
16. [Deployment](#deployment)

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
        │   ├── StaffDashboard.jsx              # Main hub — stats, charts, profile actions
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

## Authentication & Session Lifecycle

**File:** `src/context/AuthContext.jsx`

`AuthProvider` wraps the entire app in `main.jsx`. It manages:

| Export                | Type           | Description                                                                  |
| --------------------- | -------------- | ---------------------------------------------------------------------------- |
| `user`                | object \| null | Parsed user from `localStorage`                                              |
| `role`                | string         | `"admin"`, `"superadmin"`, or `"staff"`                                      |
| `tenant`              | object \| null | Tenant document fetched from the API                                         |
| `facilityPreferences` | object \| null | Facility-level configuration and policy                                      |
| `loading`             | boolean        | `true` while hydrating from localStorage on first mount                      |
| `isAdmin`             | boolean        | Derived: `role === "admin" \|\| role === "superadmin"`                       |
| `login(data)`         | function       | Normalises API response, sets user/role state + localStorage, fetches tenant |
| `logout()`            | function       | Clears all state, active tokens, and localStorage                            |
| `refreshTenant()`     | function       | Re-fetches tenant data and updates state                                     |
| `can(permission)`     | function       | Granular permission check helper                                             |

**Session persistence & JWT Validation:**

- On mount, `AuthProvider` validates stored JWT expiration (`isTokenExpired`) using client-side decoding (`parseJwt`). Expired sessions trigger an immediate clean logout.
- If a valid token is found, it is immediately attached as the Axios default `Authorization` header so all child components are authenticated on initial render.
- An Axios response interceptor monitors 401 Unauthorized responses. It checks whether the stored token is genuinely expired/missing before logging out, preventing false-positive logouts from unrelated permission-denied errors.

**Route guarding:**
`PrivateRoute` (`src/components/Shared/PrivateRoute.jsx`) redirects unauthenticated users to `/login`. It waits for `loading === false` before evaluating to avoid false redirects on hard refresh. Authenticated users landing on `/`, `/login`, or `/signup-tenant` are automatically routed to `/dashboard`.

---

## Role System

Two role categories control what a user sees and can do:

| Role value                 | `isAdmin` | Sidebar & access                                                                          |
| -------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| `"admin"` / `"superadmin"` | `true`    | Admin menu: staff mgmt, coverage, schedule builder, time-off decisions, billing, messages |
| `"staff"` (or any other)   | `false`   | Staff menu: my schedule, preferences, my time-off requests, shift swaps, messages         |

Role is stored in the `role` field on the user object returned by the backend. It is mirrored in `localStorage` for persistence. Components consume it via `const { role, isAdmin, can } = useAuth()`.

---

## Date & Timezone Architecture

WiserShifts uses a strict, unambiguous timezone architecture designed for multi-facility operations where administrators, schedulers, and healthcare staff may work in different timezones.

### The Storage Invariant: UTC Instants

All timestamps across MongoDB models (`Coverage`, `Schedule`, `TimeOff`, `TimeTracking`) are persisted exclusively as absolute **UTC Date instants** (ISO 8601 strings over the API, e.g. `2026-09-01T11:00:00.000Z`). Database storage is completely timezone-agnostic.

### Write-Time: Local Clock to UTC Instant

When human users define shifts (e.g. "7:00 AM – 3:00 PM"), that clock time must be interpreted in a specific timezone to compute the absolute UTC instant:

1. **Confirmed Facility Timezone (Primary / Optimal Path):**
   - When an admin configures and confirms an IANA timezone in Facility Preferences (e.g., `America/New_York` or `America/Chicago`), `facilityTimezoneConfirmed: true` is set.
   - For slot-based coverage requirements (`shiftType` + `shiftTag`), `CoverageCreateForm` sends an array of dates (`dates: activeDates`) along with the shift taxonomy.
   - The backend resolves the slot's `startLocalTime`/`endLocalTime` against the facility's confirmed timezone using Luxon. A 7:00 AM shift in `America/New_York` becomes `11:00:00.000Z` in summer (EDT) and `12:00:00.000Z` in winter (EST), handling DST transitions automatically.
   - This ensures that a corporate scheduler in California creating shifts for a facility in Georgia produces the exact 7:00 AM local start time needed at the Georgia facility.

2. **Device-Local Fallback (Unconfirmed / Manual Time Entry):**
   - If the facility timezone has not been confirmed (`facilityTimezoneConfirmed: false`), or if the scheduler manually enters custom start/end clock times without a shift slot, the frontend uses `toUTCISOString` / `toUTC`.
   - The browser calculates the absolute UTC instant using the device's local clock (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and sends per-date requests with explicit UTC timestamps.

### Read-Time & UI Display: Dynamic Timezone Labeling

- **Client-Side Rendering:** All viewing components (`ScheduleList`, `CoveragePlanningPage`, `AutoGenerateScheduleForm`, `ScheduleForm`, `TimeOffDecision`) parse the stored UTC instant via `new Date(utcString)` and format it locally using standard browser localization (`toLocaleTimeString` / `toLocaleDateString`).
- **Dynamic Timezone Abbreviations:** Using the `getLocalTimeZoneAbbreviation` utility (`src/utils/timeZone.js`), displayed shift ranges explicitly show the active DST-aware zone abbreviation (e.g. `7:00 AM - 3:00 PM EDT` or `6:00 AM - 2:00 PM CDT`).
- **Backend Notifications:** Email and SMS alerts format timestamps in the facility's configured timezone using `timezoneUtils.js` (`formatRangeInFacilityZone`), avoiding UTC label confusion in operational messages.

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

### Facility Preferences & Timezone

`FacilityPreferencesPage` drives the central taxonomy and operational rules:

- **Facility Timezone Picker:** Full IANA timezone autocomplete (`Intl.supportedValuesOf('timeZone')`). Saving a timezone sets `facilityTimezoneConfirmed: true` in MongoDB, enabling clean multi-date coverage generation and facility-accurate time resolution.
- **Taxonomy Model:** `roleFamilies`, `unitAreas`, `shiftTypes`, `shiftTypeDefinitions` (with time slots e.g. `day_am 07:00-15:00`), and `certificationTags`.
- **Scheduling Policy & Workload:** Configures rotation patterns (`balance`, `4_on_4_off`, `2_2_3`, `panama`, `fixed_5_2`, `rotating_3`, `custom`), weekly overtime thresholds, and fairness lookback windows.
- **Time Tracking:** Supports open or QR-code based attendance with clock in/out grace minutes and rounding intervals.

Values are normalized to `snake_case` for database persistence and rendered as human-friendly labels in the UI.

---

### Dashboard

**`StaffDashboard`** is the operational hub. On mount it calls `GET /api/v1/dashboard/summary` and renders:

- **`StatCard` row** — KPIs like total staff count, pending time-off count, unread messages, upcoming shifts.
- **`ScheduleAndCoverageCharts`** — Bar/line charts showing scheduled hours vs coverage requirements.
- **Profile section** — Avatar + self-service profile picture upload.

The dashboard is visible to both admins and staff, with operational metrics for managers and personal metrics for staff.

---

### Coverage Planning

**`CoveragePlanningPage`** lets admins define minimum staffing levels per role per time window (e.g. "3 RNs needed on the day shift, Mon–Fri").

- **List view** — Paginated table with multi-select filtering across Roles, Fill Statuses, and Unit Areas, plus live text search.
- **Calendar view** — FullCalendar view showing coverage blocks color-coded by role and staffing status.
- **`CoverageCreateForm`** — Planner-style creation flow:
  - Supports start date, horizon, and repeat patterns (every day, weekdays, custom days).
  - Natural Language ("Describe with AI") dictation/text parser to generate requirements.
  - Generates coverage via a single bulk `POST /coverage` call when the facility timezone is confirmed, with a fallback to per-date browser resolution for custom times.
  - Offers **Save Requirement Only** or **Save Requirements and Generate Draft Schedule**.
- **`CoverageEditCountForm`** — Quick dialog to edit required headcount for an existing slot.

---

### Schedule Builder & Roster

**`ScheduleList`** is a multi-mode shift management and roster planning page.

- **Table view** — Paginated list with multi-select filters (Roles, Statuses, Unit Areas, Shift Times), persistent active-filter chips, and newest-first ordering.
- **Calendar view** — FullCalendar month grid with color-coded shift blocks.
- **Roster view** — Interactive grid grouped by staff and unit/shift. Supports smooth native HTML5 drag-and-drop staff reordering. The reordered roster sequence is saved in `localStorage` keyed by month (`YYYY-MM`) and scoped per user.
- **PDF & Excel Exports** — Export calendar summaries, monthly roster grids, or open shift sign-up sheets.

**Creating / editing shifts:**

- `ScheduleForm` — Single shift creation/editing. Includes `coverageId` linking to open coverage slots, role compatibility checks, and overlap conflict detection. Supports staff self-service pickup mode.
- `AutoGenerateScheduleForm` — Draft schedule workspace with AI candidate ranking, assignment overrides, conflict warnings, and selective/bulk publishing.

---

### Staff Management

**`StaffList`** provides:

- Full-text search across name, email, and roles.
- Role filter dropdown.
- Single staff creation and editing via `StaffCreateAndEditForm`.
- **Bulk import** — `BulkStaffModal` for CSV imports.
- Direct password reset link dispatching for staff members.

Staff capabilities & preferences managed by admin:

- Capabilities (hard constraints): `allowedAreas`, `allowedShiftTags`, `allowedShiftTypes`, and `certificationTags`.
- Scheduling preferences (soft signals): `preferredDaysOfWeek`, `avoidDaysOfWeek`, `targetHoursPerWeek`, `maxShiftsPerWeek`, `maxConsecutiveDays`, `wantsOvertime`, and biweekly rotation (`worksEveryOtherWeek` + `rotationAnchorDate`).

---

### Time Off

Three components manage the time-off workflow:

| Component             | Used by    | Purpose                                                                                                   |
| --------------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `TimeOffRequestList`  | Everyone   | Lists the user's time-off requests (Pending / Approved / Denied) with status cards and days count.        |
| `TimeOffRequestModal` | Everyone   | Dialog with start/end `datetime-local` inputs properly converted to UTC instants via `toUTC()`.           |
| `TimeOffDecision`     | Admin only | Admin approval inbox to review, approve, or deny requests with reviewer notes and timezone-labeled times. |

Approved time-off records strictly prevent staff from being auto-scheduled or picking up overlapping shifts.

---

### Shift Swaps

**`ShiftSwapRequestsPage`** has two tabs:

- **Inbox** — Swap requests sent to the current user (accept or deny).
- **Sent** — Requests the current user initiated (cancel pending).

Admins see all requests org-wide. A new swap is initiated via `ShiftSwapRequestModal` on any scheduled shift.

---

### Staff Preferences

**`PreferencesPage`** is the self-service portal for non-admin staff to set their availability:

- **Preferred Days** — Weekdays the staff member wants to work.
- **Days to Avoid** — Weekdays the staff member prefers to have off.
- **Open to Overtime** — Switch indicating willingness to take overtime hours without penalty in AI ranking.
- **Notification Preferences** — Email and SMS alert toggles.

Internal administrative controls (target hours, max shifts, consecutive days, rotation) are strictly hidden from the staff view and managed exclusively by administrators in `StaffCreateAndEditForm`.

---

### Billing / Subscription

**`ManageSubscription`** handles Stripe plan upgrades, seat limits, and portal management with paywall protection.

---

## Interactive Guide Tours

WiserShifts features an in-app interactive tour system built on `GuideTourContext` and `GuideTourOverlay`:

- **Zero External Dependencies:** Implemented using standard React context and dynamic DOM spotlight rendering.
- **Smart Auto-Launch:** When a user visits a page or opens a form for the first time, the interactive tour automatically starts, introducing key actions step-by-step.
- **Per-User Persistence:** Seen states are saved in `localStorage` under `wisershifts_guide_seen_<tourId>_<userScopeId>`, ensuring tours only auto-launch once per user per browser.
- **Manual "Take tour" Button:** Embedded consistently across all 9 major views and 3 modal forms using the `GuideHelpButton` component for on-demand replay.
- **Role-Aware Steps:** Step definitions dynamically adapt based on permissions (`canManageSchedules`, `canManageStaff`, etc.), so staff never see tour steps pointing to administrative actions they cannot access.

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
| `GuideHelpButton`     | Consistent "Take tour" button triggering the interactive walkthrough for the active view/form.                                                                                                                              |
| `GuideTourOverlay`    | Global spotlight overlay rendering step tooltips with back/next/skip controls. Mounted once in `App.jsx`.                                                                                                                   |
| `ChangePasswordModal` | Auth modal accessible from the Sidebar footer menu                                                                                                                                                                          |

---

## Key Developer Patterns

### Taxonomy-driven role/options model

Role options and related taxonomy should come from facility preferences first, with industry fallback only when preferences are unavailable.

- Primary source: `facilityPreferences`
- Fallback: industry defaults

Use helper utilities in `src/constants/industryRoles.js`:

- `getRoleOptionsFromFacilityPreferences(...)`
- `getRoleOptionsForIndustry(...)`
- `isRoleCompatible(...)`

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

Components check `isAdmin`, `role`, or `can(permission)` from `useAuth()` to show/hide UI sections rather than maintaining separate pages.

### Modal-first UX

Forms (create staff, create shift, request time off, compose message, etc.) are all rendered as MUI `<Dialog>` components triggered by local state (`openModal`). This avoids full page navigations for common CRUD actions.

### Multi-Select & Filter Persistence

- Filter states across `ScheduleList` and `CoveragePlanningPage` are multi-select enabled.
- State is persisted to `localStorage` scoped per user (`wisershifts_<feature>_filters_<userId>`) with legacy key fallback.

---

## Performance Optimizations

1. **Server-Side Coverage Aggregation:**
   - The backend `GET /coverage` endpoint attaches pre-calculated `assignedCount` and `remaining` using an indexed MongoDB `$group` aggregation (`countAssignmentsByCoverage`).
   - `CoveragePlanningPage` no longer fetches all schedules just to count fill levels, eliminating extra network load and client-side nested aggregation loops.

2. **Foreign Key Slot Linking (`coverageId`):**
   - Shift schedules store the direct `coverageId` FK of the coverage slot they fulfill.
   - Schedule and coverage matching is $O(1)$ via Map lookups in memory with graceful signature fallback for legacy records.

3. **Multi-Date Bulk Creation:**
   - For confirmed facilities, `CoverageCreateForm` creates full recurring coverage patterns across all active dates in a single `POST /coverage` request instead of looping per-date requests.

4. **Client-Side Memoization:**
   - Heavy calendar day matrices, roster staff rows, and filter chains use targeted `useMemo` dependencies to prevent re-computations on unrelated state updates.

---

## Recent Major Changes

1. **Timezone Correctness & Dynamic Labeling:**
   - Established facility timezone confirmation flow with strict UTC instant database invariants and client-side dynamic timezone abbreviations (e.g. `EDT`, `CDT`).
   - Hardened `TimeOffRequestModal` with `toUTC` conversion to prevent wall-clock skew on time-off submissions.

2. **Interactive Guide Tour System:**
   - Built a lightweight, custom tour engine (`GuideTourContext`, `GuideTourOverlay`, `GuideHelpButton`) deployed across 9 major portal pages and 3 core forms.
   - Replaced standalone video dialogs with clean, inline interactive tours that auto-launch once per user and support on-demand replay.

3. **Coverage Planning Performance & Headcount Alignment:**
   - Removed duplicate `/schedules` fetch from `CoveragePlanningPage`, switching to direct backend-computed `assignedCount` and `remaining`.
   - Enabled single-request multi-date coverage generation for confirmed facilities.

4. **Preferences & Scheduling Expansion:**
   - Added support for `avoidDaysOfWeek`, `wantsOvertime`, `targetHoursPerWeek`, `maxShiftsPerWeek`, `maxConsecutiveDays`, and biweekly rotation (`worksEveryOtherWeek` + `rotationAnchorDate`).
   - Refactored `PreferencesPage` for staff self-service by exposing only personal availability preferences (preferred days, days to avoid, overtime switch) while keeping administrative policy controls in `StaffCreateAndEditForm`.

5. **Session & Security Hardening:**
   - Added client-side JWT expiration validation on mount to cleanly expire stale sessions.
   - Implemented an intelligent Axios 401 response interceptor that only logs out when tokens are genuinely expired or missing.
   - Added authenticated redirects preventing logged-in users from viewing public landing pages inside the app shell.

6. **Roster Drag-and-Drop & Multi-Select Filters:**
   - Multi-select filters for roles, statuses, unit areas, and shift times with active-chip removal.
   - Native HTML5 drag-and-drop roster reordering with month-keyed (`YYYY-MM`) and user-scoped `localStorage` persistence.
   - Complete rebrand of storage keys to `wisershifts_*` with backward-compatible legacy key fallbacks.

---

## Deployment

The app is deployed to **Netlify**.

| Setting           | Value                                                                      |
| ----------------- | -------------------------------------------------------------------------- |
| Build command     | `npm run build`                                                            |
| Publish directory | `dist`                                                                     |
| SPA redirect      | `netlify.toml` + `public/_redirects` both contain `/* → /index.html (200)` |

No build-time environment variables are required — the API base URL is determined at runtime from `window.location.hostname`. To target a different backend at build time, add `VITE_API_BASE` to your Netlify environment variables and update `src/config/api.js` to read `import.meta.env.VITE_API_BASE`.
