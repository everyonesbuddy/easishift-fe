# Easishift Front-End (Staff Scheduling)

This repository contains the front-end for **Easishift**, a multi-tenant workforce scheduling platform for senior care facilities.

It is now focused on:

- Staff scheduling and calendar planning
- Coverage planning by role and shift demand
- Time-off request and approval workflows
- Internal team messaging
- Subscription/paywall + seat-based tenant access

---

## Tech Stack

- **React 19 + Vite**
- **Material UI (MUI)** for UI primitives/layout
- **React Router** for app routing
- **Axios** for API integration
- **FullCalendar** for schedule/coverage calendar views
- **React Toastify** for notifications

---

## Product Direction (Current)

Easishift is a **staff/admin portal** (no patient portal in current FE scope).

### Core capabilities

1. **Authentication + tenant onboarding**
   - Staff login
   - Tenant (facility) signup
   - Forgot/reset password flow

2. **Dashboard + operational visibility**
   - Role-aware summary cards (admin vs staff)
   - Quick actions (add staff, create coverage, create schedule, message)
   - Schedule and coverage charts

3. **Coverage planning**
   - Define required role count by shift
   - View in list or calendar mode
   - Admin create/edit/delete

4. **Staff scheduling**
   - Create and manage individual schedules
   - AI-generated/bulk scheduling (admin)
   - Role/status filtering + list/calendar views

5. **Team management**
   - Staff directory with search/filter
   - Admin create/edit/delete staff members

6. **Time-off workflows**
   - Staff submit and track requests
   - Admin review/approve/deny with notes

7. **Internal messaging**
   - Inbox + sent views
   - Read-state updates, reply support, compose flow

8. **Preferences (non-admin staff)**
   - Availability and day preferences
   - Shift time preferences and related constraints

9. **Subscription and billing**
   - Tenant plan selection and upgrades
   - Stripe checkout session flow
   - Admin paywall if subscription is inactive/limited

---

## Routing (Current)

### Public routes

- `/` → Landing page
- `/login` → Staff login
- `/signup-tenant` → Tenant/facility signup
- `/reset-password` → Password reset
- `/billing` → Manage subscription
- `/billing/success` → Stripe success callback
- `/billing/cancel` → Stripe cancel callback

### Protected routes (requires authenticated user)

- `/dashboard` → Staff dashboard
- `/coverage-planning` → Coverage planning
- `/schedule` → Staff scheduling
- `/staffs` → Staff management
- `/timeoff-decisions` → Admin time-off approvals
- `/timeoff-requests` → Staff time-off requests
- `/messages` → Internal messages
- `/preferences` → Staff preferences

### Billing-only mode

If an admin tenant is inactive or seat-limited, app routing is restricted to paywall/billing flow until subscription is resolved.

---

## Role Behavior (High Level)

- **Admin users**
  - Access staff management, coverage planning, approvals, billing
  - Can create/edit/delete coverage, schedules, staff records
- **Staff users**
  - Access own schedule, messages, time-off requests, preferences
  - Limited access to admin-only management actions

Role/tenant state is managed centrally in `AuthContext`.

---

## Project Structure

```text
src/
├── App.jsx
├── main.jsx
├── index.css
├── App.css
├── config/
│   └── api.js
├── context/
│   └── AuthContext.jsx
└── components/
    ├── Auth/
    │   ├── Login.jsx
    │   ├── SignupTenant.jsx
    │   ├── ForgotPasswordModal.jsx
    │   ├── ResetPassword.jsx
    │   └── ChangePasswordModal.jsx
    ├── Home/
    │   └── Home.jsx
    ├── Shared/
    │   ├── Navbar.jsx
    │   ├── Sidebar.jsx
    │   ├── PrivateRoute.jsx
    │   └── ConfirmDialog.jsx
    └── StaffPortal/
        ├── Dashboard/
        ├── Coverage/
        ├── Schedule/
        ├── Staffs/
        ├── TimeOff/
        ├── Messages/
        ├── NoAdminPreferences/
        └── Billing/
```

---

## API Integration Notes

- Axios client is defined in `src/config/api.js` with base path `.../api/v1`.
- Runtime backend selection currently uses hostname detection:
  - localhost → local backend
  - non-localhost → production backend
- Auth token is persisted in `localStorage` and attached as `Authorization: Bearer <token>`.
- Tenant data is loaded and refreshed via `AuthContext`.

---

## Local Development

### Prerequisites

- Node.js 18+ (recommended)
- npm

### Install

```bash
npm install
```

### Run development server

```bash
npm run dev
```

### Build production bundle

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

---

## Main User Flows

### Admin flow

1. Sign up tenant or log in
2. Land on dashboard and review staffing health
3. Configure coverage requirements
4. Build schedules (manual or AI-generated)
5. Review time-off requests
6. Manage staff and subscription

### Staff flow

1. Log in
2. Check dashboard and upcoming schedule
3. Set work preferences
4. Request time off
5. Use internal messaging for coordination

---

## Notes

- This README reflects the **current scheduling product direction** and intentionally removes old patient-portal documentation.
- If architecture or routes change, update this file alongside feature work to keep onboarding accurate.
