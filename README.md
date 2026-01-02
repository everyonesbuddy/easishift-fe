🏥 Hospital App — Front-End README
Table of Contents

Project Overview

Folder Structure

Routing & Pages

Components

Staff/Admin Portal

Patient Portal

Context & State Management

Styling & Layout

API Integration

User Flows

Staff/Admin Flow

Patient Flow

Getting Started

1. Project Overview

This front-end is built with React and Material-UI (MUI) for styling. It supports:

Multi-tenant architecture: Each hospital is a separate tenant.

Staff/Admin portal: Manage patients, appointments, messages, and forms.

Patient portal: View assigned appointments, messages, and complete forms.

Authentication & authorization: Role-based access for staff/admin/patient.

Global state: Managed using AuthContext for authentication and tenant info.

2. Folder Structure
   src/
   ├── App.js
   ├── index.js
   ├── index.css
   ├── context/
   │ └── AuthContext.jsx # Global state for auth & user info
   ├── components/
   │ ├── Home/
   │ │ └── Home.jsx # Landing page
   │ ├── Auth/
   │ │ ├── Login.jsx # Staff login
   │ │ ├── SignupTenant.jsx # New hospital signup
   │ │ └── PatientLogin.jsx # Patient portal login
   │ ├── StaffPortal/
   │ │ ├── Dashboard/
   │ │ │ └── DashboardHome.jsx # Staff/Admin central hub
   │ │ ├── Patients/
   │ │ │ ├── PatientForm.jsx
   │ │ │ ├── PatientList.jsx
   │ │ │ └── PatientDetails.jsx
   │ │ ├── Appointments/
   │ │ │ ├── AppointmentForm.jsx
   │ │ │ └── AppointmentList.jsx
   │ │ └── Messages/
   │ │ ├── MessageList.jsx
   │ │ └── MessageComposer.jsx
   │ ├── PatientPortal/
   │ │ ├── PatientDashboard.jsx
   │ │ ├── PatientForms.jsx
   │ │ ├── FollowUpForm.jsx
   │ │ └── MessageList.jsx
   │ └── Shared/
   │ ├── ProtectedRoute.jsx # Route guard
   │ └── Loader.jsx # Loading indicator
   ├── utils/ # Helper functions (e.g., date formatting)
   └── App.css

3. Routing & Pages

Landing / Home → /

Staff Login → /login

Hospital Signup → /signup-tenant

Dashboard (Staff/Admin) → /dashboard

Patients Management → /patients

Appointments Management → /appointments

Messages / Follow-ups → /messages

Patient Login → /patient-login

Patient Portal → /patient-portal

/patient-portal/forms

/patient-portal/follow-ups

/patient-portal/messages

4. Components
   Staff/Admin Portal
   Component Purpose
   DashboardHome.jsx Central hub with summary cards for Patients, Appointments, Messages
   PatientForm.jsx Add a new patient
   PatientList.jsx List all patients
   PatientDetails.jsx View patient details
   AppointmentForm.jsx Schedule an appointment
   AppointmentList.jsx View all appointments
   MessageList.jsx View messages sent by staff
   MessageComposer.jsx Compose new message to patient
   Patient Portal
   Component Purpose
   PatientDashboard.jsx Overview of appointments, messages, forms
   PatientForms.jsx Fill pre-visit forms assigned by staff
   FollowUpForm.jsx Add additional info requested by staff
   MessageList.jsx View messages sent by hospital staff
   Shared
   Component Purpose
   ProtectedRoute.jsx Guards routes, ensuring proper auth + role
   Loader.jsx Shows loading spinner for async data
5. Context & State Management

AuthContext.jsx stores:

Logged-in user info (id, role, tenantId)

Functions: login(), logout()

Purpose:

Enables role-based rendering and access control

Makes JWT/token available for API calls

6. Styling & Layout

Material-UI (MUI) is used for forms, buttons, cards, grids.

Containers wrap pages to provide responsive padding.

Local centering via Box and flex — global body no longer forces centering.

Base styles in index.css and App.css.

Each page/component handles its own layout using MUI Grid/Box.

7. API Integration

Login/Signup: POST to /api/v1/auth/...

Tenant creation: POST /api/v1/tenants

Patients: CRUD via /api/v1/patients

Appointments: CRUD via /api/v1/appointments

Forms & Follow-ups: /api/v1/forms

Messages: /api/v1/messages

Note: API calls include JWT from AuthContext for authentication.

8. User Flows
   Staff/Admin Flow

Visit landing page → /

Staff login /login → AuthContext stores user

Redirect to /dashboard → view summary

Navigate to:

Patients → add/list/view patients

Appointments → schedule/list appointments

Messages → send notifications to patients

Patient Flow

Receives portal credentials from staff

Login at /patient-login → AuthContext stores patient info

Access /patient-portal → dashboard shows:

Appointments (read-only)

Messages from staff

Forms/follow-ups → submit additional info

Data submission saved under patient + tenant ID → secure multi-tenant data isolation

9. Getting Started

Install dependencies

npm install

Run development server

npm run dev

Environment Variables

Backend URL (REACT_APP_API_URL) if needed

JWT storage handled in cookies/localStorage (via AuthContext)

Folder conventions

Place new components inside StaffPortal or PatientPortal

Shared components (buttons, loaders, protected routes) go in /Shared
