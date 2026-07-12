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
2. Log in as `admin` to add doctors, approve
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
