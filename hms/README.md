# MediCore — Hospital Management System

A full-stack HMS: Spring Boot + Spring Security (JWT) + MySQL backend, plain HTML/CSS/JS frontend.

## Folder structure

```
hms/
├── backend/    Spring Boot REST API (Maven project)
└── frontend/   Static HTML/CSS/JS site (no build step)
```

## 1. Run the backend

**Requirements:** Java 17+, Maven, MySQL running locally.

1. Create nothing manually — the app auto-creates the `hms_db` schema on first run
   (see `spring.datasource.url` in `application.properties`).
2. Edit `backend/src/main/resources/application.properties` if your MySQL
   username/password aren't `root` / `root`.
3. From `backend/`, run:
   ```
   mvn spring-boot:run
   ```
4. The API starts on **http://localhost:8080**. On first boot it seeds one
   admin account:
   - **Email:** admin@hms.com
   - **Password:** Admin@123

   Change this password immediately in any real deployment.

## 2. Run the frontend

The frontend is plain static files — no npm, no build step. Two easy ways to serve it:

- **VS Code Live Server**: right-click `frontend/index.html` → "Open with Live Server" (usually serves on `http://localhost:5500`).
- **Python**: `cd frontend && python3 -m http.server 5500`

Then open **http://localhost:5500** in your browser.

If you serve the frontend on a different port, add it to
`app.cors.allowed-origins` in `application.properties` and restart the backend.

`frontend/js/script.js` points at `API_BASE = "http://localhost:8080/api"` —
update that constant if you deploy the backend elsewhere.

## 3. Try it out

1. Open the frontend, click **Get Started**, and register as a **Patient**
   (or **Doctor** / **Billing Staff** — an admin should verify these in a
   real deployment, but any role can self-register here for demo purposes).
2. Log in as `admin@hms.com` / `Admin@123` to add doctors, approve
   appointments, issue bills, and view revenue reports.
3. Log in as the patient account you created to book an appointment and
   view bills.

## Roles

| Role          | Dashboard       | Can do |
|---------------|-----------------|--------|
| ADMIN         | `admin.html`    | Manage patients, doctors, appointments, billing, view reports |
| DOCTOR        | `staff.html`    | View assigned patients/appointments, mark visits completed |
| BILLING_STAFF | `staff.html`    | Create/edit bills, mark paid/unpaid |
| PATIENT       | `dashboard.html`| Book appointments, view own bills and visit history |

## Notes on this build

- Passwords are BCrypt-hashed; sessions are stateless JWTs (24h expiry by default).
- CORS is locked to the origins listed in `application.properties` — add
  your dev server's origin there if requests are blocked.
- The contact form on `contact.html` is front-end only (no backend endpoint
  was in scope) — it shows a confirmation toast but doesn't persist anywhere.
- Profile editing is read-only in this build; extending `PATCH /api/patients/{id}`
  /`/api/doctors/{id}` to a self-service "edit profile" form is a natural next step.

### Admin-created logins (Patients, Doctors, Billing Staff)

- On **Patients** and **Doctors**, the "Add" modal now has an optional
  email + password. Fill both in and a login account (`users` table,
  BCrypt-hashed password) is created and linked automatically. Leave them
  blank to create a record with no login access, same as before.
- **Billing Staff** now has its own admin page (`billing-staff.html`,
  linked from every admin sidebar) since billing staff have no separate
  profile entity — they're just `users` rows with `role = BILLING_STAFF`.
  Email + password are required there.

### Forgot Password

- `login.html` links to `forgot-password.html`. Submitting an email there
  calls `POST /api/auth/forgot-password`, which resets that account's
  password to a random 10-character temporary one.
- **This demo has no email server**, so the temporary password is shown
  directly on the page instead of being emailed. Before deploying this for
  real, wire `AuthService.forgotPassword()` up to an actual mail sender
  (e.g. Spring's `JavaMailSender`) and stop returning `temporaryPassword`
  in the API response.

### Full patient journey (new)

1. **Book** — patient books an appointment with a doctor (`appointment-book.html`).
2. **Accept/Reject** — the *assigned doctor* (not admin) approves or rejects it
   from `doctor-appointments.html`. The backend enforces this: a doctor can
   only act on appointments where `appointment.doctorId` matches their own
   doctor profile; admins can still override.
3. **Treat & prescribe** — once approved, the doctor marks the visit
   "Complete & Prescribe", entering the medicines given. This creates a
   `Prescription` record and notifies every billing-staff account.
4. **Bill** — billing staff see the patient in their "Awaiting Billing" queue
   (`staff.html` / linked from there) and create a bill from it.
5. **Pay** — the patient sees the bill as UNPAID and chooses **Pay Online**
   (redirects to `payment.html` — a demo QR code + UPI ID, "I've completed
   payment" marks it PAID/ONLINE) or **Pay at Office** (no status change;
   billing staff mark it PAID/OFFLINE manually once received in person).
6. Admin and billing staff can always see **which payment method** was used
   on the Billing page/history.

### Notifications

- Every role has a Notifications page, backed by `/api/notifications`.
- Notifications are generated automatically (not manually composed) on:
  booking (→ doctor), approve/reject/complete (→ patient), bill created
  (→ patient), bill paid online (→ all billing staff), treatment completed
  (→ all billing staff, so they know who to bill).

### History pages

- Patients, doctors, and billing staff each have a dedicated History page
  (`patient-history.html`, `doctor-history.html`, `billing-history.html`)
  showing past appointments/treatments/bills.

### Self-service profile

- Every role can edit their own phone (and patients: age/reason; doctors:
  specialization) and change their password from `profile.html`
  (`PUT /api/users/me`, `PUT /api/users/me/password`).
- **Name and email are intentionally locked** everywhere — they're the
  account's identity/login and aren't user-editable in this build.

### Reports export

- `reports.html` has **Export PDF** (opens the browser's print dialog with
  a print-friendly stylesheet — no PDF library needed) and **Export Excel**
  (downloads a `.csv`, which Excel/Sheets opens natively) for the monthly
  revenue table, plus a patient directory export (name + email as CSV).

### Currency

- All amounts display in ₹ (Indian Rupees) via the shared `formatCurrency()`
  helper in `js/script.js`. Amounts are stored as plain numbers in the
  database — only the display format changed.
