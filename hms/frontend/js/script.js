/* =========================================================================
   MediCore HMS — shared frontend logic
   Loaded on every page. Provides:
     - API_BASE + api() fetch wrapper (attaches JWT, parses errors)
     - Auth helpers (session storage, logout, role guarding, redirects)
     - Toast notifications
     - Small UI utilities (mobile nav, sidebar, dark mode, modals)
   Page-specific data logic lives in an inline <script> at the bottom of
   each HTML file and calls into the helpers below.
   ========================================================================= */

const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8080/api"
  : `http://${window.location.hostname || "127.0.0.1"}:8080/api`;

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout

/* ------------------------------- Session ------------------------------- */
const Auth = {
  getToken() {
    if (!this.checkSessionActivity()) return null;
    return sessionStorage.getItem("hms_token");
  },
  getUser() {
    if (!this.checkSessionActivity()) return null;
    const raw = sessionStorage.getItem("hms_user");
    return raw ? JSON.parse(raw) : null;
  },
  checkSessionActivity() {
    const token = sessionStorage.getItem("hms_token");
    if (!token) return false;
    const lastActive = Number(sessionStorage.getItem("hms_last_active") || 0);
    if (lastActive && (Date.now() - lastActive > SESSION_TIMEOUT_MS)) {
      this.clearSession();
      return false;
    }
    return true;
  },
  recordActivity() {
    if (sessionStorage.getItem("hms_token")) {
      sessionStorage.setItem("hms_last_active", Date.now().toString());
    }
  },
  setSession(authResponse) {
    sessionStorage.setItem("hms_token", authResponse.token);
    sessionStorage.setItem("hms_user", JSON.stringify({
      userId: authResponse.userId,
      name: authResponse.name,
      email: authResponse.email,
      role: authResponse.role
    }));
    sessionStorage.setItem("hms_last_active", Date.now().toString());
    // Clear any legacy persistent storage so it doesn't linger across browser restarts
    try {
      localStorage.removeItem("hms_token");
      localStorage.removeItem("hms_user");
      localStorage.removeItem("hms_last_active");
    } catch (e) {}
  },
  // Caches the profile photo (and any refreshed name/phone) alongside the
  // session so the sidebar avatar doesn't flash back to initials on every
  // page load while the background refresh in renderUserChip() completes.
  setPhotoCache(photoData) {
    const user = this.getUser();
    if (!user) return;
    user.photoData = photoData;
    sessionStorage.setItem("hms_user", JSON.stringify(user));
  },
  clearSession() {
    try {
      sessionStorage.removeItem("hms_token");
      sessionStorage.removeItem("hms_user");
      sessionStorage.removeItem("hms_last_active");
      localStorage.removeItem("hms_token");
      localStorage.removeItem("hms_user");
      localStorage.removeItem("hms_last_active");
    } catch (e) {}
  },
  logout() {
    this.clearSession();
    window.location.replace("login.html");
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  // Redirect to the dashboard that matches the account's role
  redirectToDashboard() {
    const user = this.getUser();
    if (!user) return window.location.replace("login.html");
    const map = { ADMIN: "admin.html", DOCTOR: "staff.html", BILLING_STAFF: "staff.html", PATIENT: "dashboard.html" };
    window.location.replace(map[user.role] || "dashboard.html");
  },
  // Call at the top of any protected page. Redirects to login if not
  // authenticated, or to the correct dashboard if the role doesn't match.
  requireRole(allowedRoles) {
    if (!this.isLoggedIn()) {
      if (document.documentElement) document.documentElement.style.display = "none";
      window.location.replace("login.html");
      return null;
    }
    const user = this.getUser();
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      this.redirectToDashboard();
      return null;
    }
    return user;
  }
};

// Activity listeners to refresh active session timestamp on user interaction
let activityThrottleTimer = null;
function handleUserActivity() {
  if (!activityThrottleTimer) {
    Auth.recordActivity();
    activityThrottleTimer = setTimeout(() => {
      activityThrottleTimer = null;
    }, 10000);
  }
}
window.addEventListener("click", handleUserActivity, { passive: true });
window.addEventListener("keydown", handleUserActivity, { passive: true });
window.addEventListener("scroll", handleUserActivity, { passive: true });

// Route guard: Immediately prevent unauthorized access to protected pages
const PUBLIC_PAGES = new Set([
  "",
  "index.html",
  "about.html",
  "contact.html",
  "services.html",
  "login.html",
  "register.html",
  "forgot-password.html"
]);

function enforcePageGuard() {
  // Purge any legacy persistent sessions stored in localStorage
  try {
    localStorage.removeItem("hms_token");
    localStorage.removeItem("hms_user");
    localStorage.removeItem("hms_last_active");
  } catch (e) {}

  const page = window.location.pathname.split("/").pop() || "";
  if (!PUBLIC_PAGES.has(page)) {
    if (!Auth.isLoggedIn()) {
      if (document.documentElement) document.documentElement.style.display = "none";
      window.location.replace("login.html");
      return false;
    }
  }
  return true;
}

// Enforce guard immediately upon script load
enforcePageGuard();

/* -------------------------------- API ----------------------------------- */
async function api(path, { method = "GET", body = null, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && Auth.getToken()) {
    headers["Authorization"] = "Bearer " + Auth.getToken();
  }

  let response;
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    throw new Error("Can't reach the server. Is the backend running on localhost:8080?");
  }

  if (response.status === 204) return null;

  let data = null;
  const text = await response.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!response.ok) {
    if (response.status === 401) {
      Auth.logout();
    }
    const message = (data && data.message) ? data.message : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

/* ------------------------------- Toasts ---------------------------------- */
function ensureToastContainer() {
  let el = document.getElementById("toast-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast-container";
    document.body.appendChild(el);
  }
  return el;
}

function toast(message, type = "info", duration = 3800) {
  const container = ensureToastContainer();
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icon = { success: "✅", error: "⚠️", info: "ℹ️" }[type] || "ℹ️";
  el.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    el.style.opacity = "0";
    el.style.transform = "translateX(20px)";
    setTimeout(() => el.remove(), 300);
  }, duration);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* --------------------------- Form validation ------------------------------ */
function showFieldError(fieldEl, message) {
  fieldEl.classList.add("has-error");
  const errEl = fieldEl.querySelector(".error-text");
  if (errEl) errEl.textContent = message;
}
function clearFieldError(fieldEl) {
  fieldEl.classList.remove("has-error");
}
function clearAllErrors(formEl) {
  formEl.querySelectorAll(".field").forEach(clearFieldError);
}

function initPublicNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
  }

  const navActions = document.querySelector(".public-nav .nav-actions");
  if (navActions && Auth.isLoggedIn()) {
    const user = Auth.getUser();
    const map = { ADMIN: "admin.html", DOCTOR: "staff.html", BILLING_STAFF: "staff.html", PATIENT: "dashboard.html" };
    const dashHref = (user && map[user.role]) || "dashboard.html";
    navActions.innerHTML = `
      <a href="${dashHref}" class="btn btn-primary btn-sm">Dashboard</a>
      <a href="#" class="btn btn-outline btn-sm logout-btn">Log out</a>
      <button class="nav-toggle" aria-label="Toggle menu">☰</button>
    `;
    navActions.querySelector(".logout-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      Auth.logout();
    });
    navActions.querySelector(".nav-toggle")?.addEventListener("click", () => links?.classList.toggle("open"));
  }
}

/* =========================================================================
   HMSComponents — Reusable Navigation & Healthcare UI System
   ========================================================================= */

const HMSIcons = {
  HospitalCross: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16m-8-8h16"/></svg>`,
  LayoutDashboard: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
  Users: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  Stethoscope: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`,
  UserCog: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><circle cx="19" cy="11" r="2"/><path d="M19 8v1m0 4v1m-2.6-4.5.87.5m3.46 2 .87.5m-5.2 0 .87-.5m3.46-2 .87-.5"/></svg>`,
  CalendarDays: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4m8-4v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01m3.99 0h.01m3.99 0h.01m-8 4h.01m3.99 0h.01m3.99 0h.01"/></svg>`,
  Building2: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>`,
  Bed: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>`,
  Pill: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
  FlaskConical: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31L4.1 19.4A2 2 0 0 0 5.8 22h12.4a2 2 0 0 0 1.7-2.6L14 9.31V2"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 0 0-4 0"/><path d="M5.52 16h12.96"/></svg>`,
  CreditCard: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
  FileText: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  BarChart3: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  Bell: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7-3 9-3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  Settings: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  LogOut: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  Menu: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>`,
  ChevronLeft: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  ChevronDown: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  Search: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>`
};

const HMSComponents = {
  NAV_ITEMS: {
    ADMIN: [
      { id: "dashboard", href: "admin.html", label: "Dashboard", icon: "LayoutDashboard" },
      { id: "patients", href: "patients.html", label: "Patients", icon: "Users" },
      { id: "doctors", href: "doctors.html", label: "Doctors", icon: "Stethoscope" },
      { id: "staff", href: "staff-management.html", label: "Staff", icon: "UserCog" },
      { id: "appointments", href: "appointments.html", label: "Appointments", icon: "CalendarDays" },
      { id: "reception", href: "reception.html", label: "Departments", icon: "Building2" },
      { id: "admissions", href: "admissions.html", label: "Bed Management", icon: "Bed" },
      { id: "pharmacy", href: "pharmacy.html", label: "Pharmacy", icon: "Pill" },
      { id: "laboratory", href: "laboratory.html", label: "Laboratory", icon: "FlaskConical" },
      { id: "billing", href: "billing.html", label: "Billing & Payments", icon: "CreditCard" },
      { id: "reports", href: "reports.html", label: "Reports", icon: "BarChart3" },
      { id: "notifications", href: "notifications.html", label: "Notifications", icon: "Bell", badge: true },
      { id: "profile", href: "profile.html", label: "Settings", icon: "Settings" }
    ],
    DOCTOR: [
      { id: "dashboard", href: "staff.html", label: "Dashboard", icon: "LayoutDashboard" },
      { id: "appointments", href: "doctor-appointments.html", label: "My Appointments", icon: "CalendarDays" },
      { id: "reception", href: "reception.html", label: "Departments", icon: "Building2" },
      { id: "laboratory", href: "laboratory.html", label: "Laboratory", icon: "FlaskConical" },
      { id: "history", href: "doctor-history.html", label: "Medical Records", icon: "FileText" },
      { id: "notifications", href: "notifications.html", label: "Notifications", icon: "Bell", badge: true },
      { id: "profile", href: "profile.html", label: "Settings", icon: "Settings" }
    ],
    BILLING_STAFF: [
      { id: "dashboard", href: "staff.html", label: "Dashboard", icon: "LayoutDashboard" },
      { id: "reception", href: "reception.html", label: "Departments", icon: "Building2" },
      { id: "admissions", href: "admissions.html", label: "Bed Management", icon: "Bed" },
      { id: "pharmacy", href: "pharmacy.html", label: "Pharmacy", icon: "Pill" },
      { id: "laboratory", href: "laboratory.html", label: "Laboratory", icon: "FlaskConical" },
      { id: "billing", href: "billing.html", label: "Billing & Payments", icon: "CreditCard" },
      { id: "history", href: "billing-history.html", label: "Billing History", icon: "FileText" },
      { id: "notifications", href: "notifications.html", label: "Notifications", icon: "Bell", badge: true },
      { id: "profile", href: "profile.html", label: "Settings", icon: "Settings" }
    ],
    PATIENT: [
      { id: "dashboard", href: "dashboard.html", label: "Dashboard", icon: "LayoutDashboard" },
      { id: "book", href: "appointment-book.html", label: "Book Appointment", icon: "CalendarDays" },
      { id: "laboratory", href: "laboratory.html", label: "My Lab Tests", icon: "FlaskConical" },
      { id: "billing", href: "billing.html", label: "My Bills & Payments", icon: "CreditCard" },
      { id: "history", href: "patient-history.html", label: "Medical Records", icon: "FileText" },
      { id: "notifications", href: "notifications.html", label: "Notifications", icon: "Bell", badge: true },
      { id: "profile", href: "profile.html", label: "Settings", icon: "Settings" }
    ]
  },

  PAGE_META: {
    "admin.html": { title: "Admin Dashboard", section: "Administration" },
    "dashboard.html": { title: "Patient Dashboard", section: "Patient Portal" },
    "staff.html": { title: "Staff Dashboard", section: "Clinical" },
    "patients.html": { title: "Patients", section: "Clinical" },
    "doctors.html": { title: "Doctors", section: "Staff" },
    "staff-management.html": { title: "Staff", section: "Staff" },
    "billing-staff.html": { title: "Billing Staff", section: "Staff" },
    "appointments.html": { title: "Appointments", section: "Clinical" },
    "appointment-book.html": { title: "Book Appointment", section: "Appointments" },
    "doctor-appointments.html": { title: "Doctor Appointments", section: "Appointments" },
    "reception.html": { title: "Reception", section: "Operations" },
    "admissions.html": { title: "Bed Management", section: "Inpatient / Outpatient" },
    "pharmacy.html": { title: "Pharmacy", section: "Pharmacy" },
    "laboratory.html": { title: "Laboratory", section: "Diagnostics" },
    "billing.html": { title: "Billing & Payments", section: "Finance" },
    "billing-history.html": { title: "Billing History", section: "Finance" },
    "payment.html": { title: "Payment Processing", section: "Finance" },
    "patient-history.html": { title: "Medical Records", section: "Records" },
    "doctor-history.html": { title: "Medical Records", section: "Records" },
    "reports.html": { title: "Reports", section: "Analytics" },
    "notifications.html": { title: "Notifications", section: "Alerts" },
    "profile.html": { title: "Settings", section: "Settings" }
  },

  SidebarItem({ href, label, icon, active, badge, tooltip }) {
    const iconSvg = HMSIcons[icon] || HMSIcons.LayoutDashboard;
    const activeClass = active ? "active" : "";
    const tooltipText = tooltip || label;
    return `
      <li>
        <a href="${href}" class="${activeClass}" data-tooltip="${escapeHtml(tooltipText)}">
          ${iconSvg}
          <span class="nav-label">${escapeHtml(label)}</span>
          ${badge ? `<span class="nav-badge" style="display:none;"></span>` : ""}
        </a>
      </li>
    `;
  },

  Breadcrumbs({ items }) {
    if (!items || items.length === 0) return "";
    return `
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        ${items.map((crumb, idx) => {
          const isLast = idx === items.length - 1;
          if (isLast) {
            return `<span class="crumb-current">${escapeHtml(crumb.label)}</span>`;
          }
          return `
            <a href="${crumb.href || '#'}" class="crumb-root">${escapeHtml(crumb.label)}</a>
            <span class="crumb-separator">/</span>
          `;
        }).join("")}
      </nav>
    `;
  },

  UserMenu({ user }) {
    if (!user) return "";
    const initials = user.name ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "U";
    const avatarInner = user.photoData ? `<img src="${user.photoData}" alt="${escapeHtml(user.name)}">` : initials;
    const formattedRole = (user.role || "").replace("_", " ").toLowerCase();

    return `
      <div class="user-menu-wrap">
        <button class="user-menu-btn" id="user-menu-btn" aria-expanded="false" aria-haspopup="true">
          <div class="topbar-avatar" id="topbar-user-avatar">${avatarInner}</div>
          <div class="topbar-user-info">
            <span class="topbar-user-name" id="topbar-user-name">${escapeHtml(user.name || "User")}</span>
            <span class="topbar-user-role" id="topbar-user-role">${escapeHtml(formattedRole)}</span>
          </div>
          <span class="chevron-icon">${HMSIcons.ChevronDown}</span>
        </button>

        <div class="user-dropdown-menu" id="user-dropdown-menu">
          <div class="user-dropdown-header">
            <div class="user-dropdown-name" id="menu-user-name">${escapeHtml(user.name || "")}</div>
            <div class="user-dropdown-email" id="menu-user-email">${escapeHtml(user.email || "")}</div>
            <span class="user-dropdown-role-badge" id="menu-user-role">${escapeHtml(user.role || "")}</span>
          </div>
          <a href="profile.html" class="dropdown-item">
            ${HMSIcons.Settings}
            Settings & Profile
          </a>
          <a href="notifications.html" class="dropdown-item">
            ${HMSIcons.Bell}
            Notifications
          </a>
          <div class="dropdown-divider"></div>
          <a href="#" class="dropdown-item danger logout-btn">
            ${HMSIcons.LogOut}
            Log out
          </a>
        </div>
      </div>
    `;
  },

  NotificationMenu() {
    return `
      <div class="notif-menu-wrap">
        <button class="topbar-icon-btn notif-btn" id="topbar-notif-btn" aria-label="Notifications" title="Notifications">
          ${HMSIcons.Bell}
          <span class="topbar-notif-badge" id="topbar-notif-badge" style="display:none;"></span>
        </button>
        <div class="notif-dropdown" id="notif-dropdown">
          <div class="notif-dropdown-head">
            <h4>Notifications</h4>
            <a href="notifications.html" class="view-all-link">View all</a>
          </div>
          <div class="notif-dropdown-list" id="notif-dropdown-list">
            <div class="notif-empty">Loading notifications...</div>
          </div>
        </div>
      </div>
    `;
  },

  DashboardCard({ type = "blue", label, value, icon, subtext = "", href = "" }) {
    const iconSvg = (typeof icon === "string" && HMSIcons[icon]) ? HMSIcons[icon] : (icon || HMSIcons.LayoutDashboard);
    return `
      <div class="stat-card ${type}" ${href ? `onclick="window.location.href='${href}'" style="cursor:pointer;"` : ''}>
        <div class="top-row">
          <div class="icon-badge">${iconSvg}</div>
          ${subtext ? `<span style="font-size:0.75rem;font-weight:700;color:var(--secondary-text);">${escapeHtml(subtext)}</span>` : ''}
        </div>
        <div class="value">${escapeHtml(String(value))}</div>
        <div class="label">${escapeHtml(label)}</div>
      </div>
    `;
  },

  Sidebar({ role, currentFile, isCollapsed, user }) {
    const dashHref = { ADMIN: "admin.html", DOCTOR: "staff.html", BILLING_STAFF: "staff.html", PATIENT: "dashboard.html" }[role] || "dashboard.html";
    const items = HMSComponents.NAV_ITEMS[role] || HMSComponents.NAV_ITEMS.PATIENT;

    const itemsHtml = items.map(item => {
      let isActive = (item.href === currentFile);
      if (!isActive) {
        if (currentFile === "appointment-book.html" && item.id === "book") isActive = true;
        if (currentFile === "appointments.html" && item.id === "appointments") isActive = true;
        if (currentFile === "doctor-appointments.html" && item.id === "appointments") isActive = true;
        if (currentFile === "billing-history.html" && (item.id === "history" || item.id === "billing")) isActive = true;
        if (currentFile === "billing-staff.html" && item.id === "staff") isActive = true;
        if (currentFile === "doctor-history.html" && item.id === "history") isActive = true;
        if (currentFile === "patient-history.html" && item.id === "history") isActive = true;
        if (currentFile === "payment.html" && item.id === "billing") isActive = true;
        if (currentFile === "doctors.html" && item.id === "doctors") isActive = true;
      }
      return HMSComponents.SidebarItem({
        href: item.href,
        label: item.label,
        icon: item.icon,
        active: isActive,
        badge: item.badge,
        tooltip: item.label
      });
    }).join("");

    const initials = user && user.name ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "U";
    const avatarInner = user && user.photoData ? `<img src="${user.photoData}" alt="${escapeHtml(user.name)}">` : initials;
    const formattedRole = user && user.role ? user.role.replace("_", " ").toLowerCase() : "";

    return `
      <div class="sidebar-header">
        <a href="${dashHref}" class="sidebar-brand" id="brand-link" title="Hospital Management System">
          <div class="brand-logo-badge">
            ${HMSIcons.HospitalCross}
          </div>
          <div class="brand-text">
            <span class="brand-title">Hospital Management System</span>
            <span class="brand-sub">MediCore Healthcare</span>
          </div>
        </a>
        <button class="sidebar-collapse-btn" id="sidebar-collapse-btn" title="Toggle compact sidebar" aria-label="Toggle compact sidebar">
          ${HMSIcons.ChevronLeft}
        </button>
        <button class="sidebar-close-mobile-btn" id="sidebar-close-mobile" aria-label="Close menu">&times;</button>
      </div>

      <div class="sidebar-nav-container">
        <div class="nav-section-label">Main Navigation</div>
        <ul class="side-nav" id="side-nav">
          ${itemsHtml}
        </ul>
      </div>

      <div class="sidebar-foot">
        <a href="profile.html" class="user-chip" id="user-chip" title="Account Settings">
          <div class="avatar" id="sidebar-avatar">${avatarInner}</div>
          <div class="info">
            <div class="name" id="sidebar-user-name">${escapeHtml(user ? user.name : "User")}</div>
            <div class="role" id="sidebar-user-role">${escapeHtml(formattedRole)}</div>
          </div>
        </a>
        <a href="#" class="sidebar-logout-btn logout-btn" title="Log out" data-tooltip="Log out" aria-label="Log out">
          ${HMSIcons.LogOut}
          <span class="logout-label">Log out</span>
        </a>
      </div>
    `;
  },

  TopNavbar({ title, breadcrumbs, user }) {
    return `
      <div class="topbar-left">
        <button class="sidebar-toggle" id="sidebar-toggle-btn" aria-label="Toggle navigation menu" title="Toggle navigation">
          ${HMSIcons.Menu}
        </button>
        ${HMSComponents.Breadcrumbs({ items: breadcrumbs })}
      </div>

      <div class="topbar-center">
        <div class="topbar-search">
          ${HMSIcons.Search}
          <input type="text" id="topbar-search-input" placeholder="Search patients, doctors, records..." aria-label="Search">
          <span class="search-kbd">⌘K</span>
        </div>
      </div>

      <div class="topbar-right">
        ${HMSComponents.NotificationMenu()}
        <button class="topbar-icon-btn dark-toggle" id="dark-toggle-btn" aria-label="Toggle dark mode" title="Toggle theme">
          ${document.body.classList.contains("dark-mode") ? "☀️" : "🌙"}
        </button>
        ${HMSComponents.UserMenu({ user })}
      </div>
    `;
  },

  initLayout() {
    const user = Auth.getUser();
    const appShell = document.querySelector(".app-shell");
    const sidebar = document.querySelector(".sidebar");
    const topbar = document.querySelector(".topbar");
    if (!appShell || !sidebar) return;

    const currentFile = window.location.pathname.split("/").pop() || "index.html";
    const meta = HMSComponents.PAGE_META[currentFile] || { title: document.title.split("—")[0].trim() || "Dashboard", section: "Hospital" };
    const role = (user && user.role) ? user.role : (currentFile.includes("admin") ? "ADMIN" : "PATIENT");
    const dashHref = { ADMIN: "admin.html", DOCTOR: "staff.html", BILLING_STAFF: "staff.html", PATIENT: "dashboard.html" }[role] || "dashboard.html";

    // Restore collapsed preference
    const isCollapsed = localStorage.getItem("hms_sidebar_collapsed") === "1";
    if (isCollapsed) appShell.classList.add("sidebar-collapsed");

    // Render Sidebar
    sidebar.innerHTML = HMSComponents.Sidebar({
      role,
      currentFile,
      isCollapsed,
      user
    });

    // Ensure mobile backdrop exists
    let backdrop = document.querySelector(".sidebar-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "sidebar-backdrop";
      appShell.appendChild(backdrop);
    }

    // Render Topbar
    if (topbar) {
      const breadcrumbs = [
        { label: "HMS", href: dashHref },
        { label: meta.section, href: "#" },
        { label: meta.title, href: currentFile }
      ];
      topbar.innerHTML = HMSComponents.TopNavbar({
        title: meta.title,
        breadcrumbs,
        user
      });
    }

    // Wire Interactive Event Listeners
    this.wireListeners(appShell, sidebar, topbar);

    // Initial data refresh for user chip and notifications badge
    if (user) {
      renderUserChip();
      loadNotifBadge();
    }
  },

  wireListeners(appShell, sidebar, topbar) {
    // Desktop Collapse toggle
    const collapseBtn = document.getElementById("sidebar-collapse-btn");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        appShell.classList.toggle("sidebar-collapsed");
        const collapsed = appShell.classList.contains("sidebar-collapsed");
        localStorage.setItem("hms_sidebar_collapsed", collapsed ? "1" : "0");
      });
    }

    // Mobile Sidebar Drawer toggle
    const toggleBtn = document.getElementById("sidebar-toggle-btn") || document.querySelector(".sidebar-toggle");
    const backdrop = document.querySelector(".sidebar-backdrop");
    const closeMobileBtn = document.getElementById("sidebar-close-mobile");

    const openDrawer = () => {
      sidebar.classList.add("open");
      backdrop?.classList.add("active");
      document.body.style.overflow = "hidden";
    };
    const closeDrawer = () => {
      sidebar.classList.remove("open");
      backdrop?.classList.remove("active");
      document.body.style.overflow = "";
    };

    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        if (window.innerWidth > 960) {
          appShell.classList.toggle("sidebar-collapsed");
          const collapsed = appShell.classList.contains("sidebar-collapsed");
          localStorage.setItem("hms_sidebar_collapsed", collapsed ? "1" : "0");
        } else {
          if (sidebar.classList.contains("open")) closeDrawer();
          else openDrawer();
        }
      });
    }

    backdrop?.addEventListener("click", closeDrawer);
    closeMobileBtn?.addEventListener("click", closeDrawer);

    // User Dropdown toggle
    const userMenuBtn = document.getElementById("user-menu-btn");
    const userDropdown = document.getElementById("user-dropdown-menu");
    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = userDropdown.classList.contains("open");
        document.querySelectorAll(".notif-dropdown.open, .user-dropdown-menu.open").forEach(el => el.classList.remove("open"));
        if (!isOpen) {
          userDropdown.classList.add("open");
          userMenuBtn.setAttribute("aria-expanded", "true");
        } else {
          userMenuBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Notification Dropdown toggle
    const notifBtn = document.getElementById("topbar-notif-btn");
    const notifDropdown = document.getElementById("notif-dropdown");
    if (notifBtn && notifDropdown) {
      notifBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = notifDropdown.classList.contains("open");
        document.querySelectorAll(".notif-dropdown.open, .user-dropdown-menu.open").forEach(el => el.classList.remove("open"));
        if (!isOpen) {
          notifDropdown.classList.add("open");
          loadNotifDropdownPreview();
        }
      });
    }

    // Close dropdowns on outside click
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".user-menu-wrap")) {
        userDropdown?.classList.remove("open");
        userMenuBtn?.setAttribute("aria-expanded", "false");
      }
      if (!e.target.closest(".notif-menu-wrap")) {
        notifDropdown?.classList.remove("open");
      }
    });

    // Dark Mode toggle
    const darkBtn = document.getElementById("dark-toggle-btn") || document.querySelector(".dark-toggle");
    if (darkBtn) {
      darkBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("hms_dark", isDark ? "1" : "0");
        document.querySelectorAll(".dark-toggle").forEach(b => b.textContent = isDark ? "☀️" : "🌙");
      });
    }

    // Topbar Search sync with page search input
    const topSearch = document.getElementById("topbar-search-input");
    if (topSearch) {
      topSearch.addEventListener("input", (e) => {
        const val = e.target.value;
        const pageSearch = document.getElementById("search-input");
        if (pageSearch) {
          pageSearch.value = val;
          pageSearch.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
      // Enter in topbar search navigates to relevant search page if no search on current page
      topSearch.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const pageSearch = document.getElementById("search-input");
          const query = topSearch.value.trim();
          if (!pageSearch && query) {
            const u = Auth.getUser();
            const target = (u && u.role === "ADMIN") ? "patients.html" : (u && u.role === "DOCTOR" ? "doctor-appointments.html" : "billing.html");
            window.location.href = `${target}?search=${encodeURIComponent(query)}`;
          }
        }
      });
      // Global shortcut Ctrl+K or / to focus search
      window.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          topSearch.focus();
        } else if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
          e.preventDefault();
          topSearch.focus();
        }
      });

      // Restore search term from URL query (?search=...)
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get("search");
        if (searchParam) {
          topSearch.value = searchParam;
          const pageSearch = document.getElementById("search-input");
          if (pageSearch) {
            pageSearch.value = searchParam;
            setTimeout(() => {
              pageSearch.dispatchEvent(new Event("input", { bubbles: true }));
            }, 100);
          }
        }
      } catch (e) {}
    }

    // Wire all logout buttons
    document.querySelectorAll(".logout-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        Auth.logout();
      });
    });
  },

  renderSidebar() {
    this.initLayout();
  }
};

window.HMSIcons = HMSIcons;
window.HMSComponents = HMSComponents;
function buildSidebar() { HMSComponents.renderSidebar(); }

function initSidebar() {
  HMSComponents.initLayout();
}

function initDarkModeToggle() {
  const stored = localStorage.getItem("hms_dark") === "1";
  if (stored) document.body.classList.add("dark-mode");
  document.querySelectorAll(".dark-toggle").forEach(btn => {
    btn.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
  });
}

// Renders the sidebar user chip + wires the logout button, used across all dashboards
function renderUserChip() {
  const chip = document.getElementById("user-chip");
  const user = Auth.getUser();
  if (user) {
    paintUserChip(chip, user);
  }
  document.querySelectorAll(".logout-btn").forEach(btn => {
    btn.addEventListener("click", (e) => { e.preventDefault(); Auth.logout(); });
  });

  // Background refresh to reflect uploaded photo or edited name
  if (user) {
    api("/users/me").then(fresh => {
      const merged = { ...user, name: fresh.name, phone: fresh.phone, photoData: fresh.photoData };
      Auth.setPhotoCache(fresh.photoData);
      paintUserChip(chip, merged);
    }).catch(() => {});
  }
}

function paintUserChip(chip, user) {
  if (!user) return;
  const initials = user.name ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "U";
  const avatarInner = user.photoData ? `<img src="${user.photoData}" alt="${escapeHtml(user.name)}">` : initials;
  const formattedRole = (user.role || "").replace("_", " ").toLowerCase();

  // Sidebar chip
  if (chip) {
    const avatarEl = chip.querySelector(".avatar") || chip.querySelector("#sidebar-avatar");
    const nameEl = chip.querySelector(".name") || chip.querySelector("#sidebar-user-name");
    const roleEl = chip.querySelector(".role") || chip.querySelector("#sidebar-user-role");
    if (avatarEl) avatarEl.innerHTML = avatarInner;
    if (nameEl) nameEl.textContent = user.name || "User";
    if (roleEl) roleEl.textContent = formattedRole;
  }

  // Topbar user menu elements
  const topAvatar = document.getElementById("topbar-user-avatar");
  const topName = document.getElementById("topbar-user-name");
  const topRole = document.getElementById("topbar-user-role");
  if (topAvatar) topAvatar.innerHTML = avatarInner;
  if (topName) topName.textContent = user.name || "User";
  if (topRole) topRole.textContent = formattedRole;

  // Dropdown menu header elements
  const menuName = document.getElementById("menu-user-name");
  const menuEmail = document.getElementById("menu-user-email");
  const menuRole = document.getElementById("menu-user-role");
  if (menuName) menuName.textContent = user.name || "";
  if (menuEmail) menuEmail.textContent = user.email || "";
  if (menuRole) menuRole.textContent = user.role || "";
}

function openModal(id) { document.getElementById(id)?.classList.add("open"); }
function closeModal(id) { document.getElementById(id)?.classList.remove("open"); }
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) e.target.classList.remove("open");
  if (e.target.matches("[data-close-modal]")) closeModal(e.target.getAttribute("data-close-modal"));
});

function statusBadgeClass(status) {
  const map = {
    APPROVED: "badge-green", PAID: "badge-green", COMPLETED: "badge-green",
    PENDING: "badge-warning", UNPAID: "badge-warning",
    REJECTED: "badge-danger"
  };
  return map[status] || "badge-gray";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatCurrency(n) {
  return "\u20B9" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function skeletonRows(count, columns) {
  return Array.from({ length: count }).map(() =>
    `<tr><td colspan="${columns}"><div class="skeleton skel-row"></div></td></tr>`
  ).join("");
}

// Highlights the current page in the sidebar / navbar based on filename
function highlightActiveNav() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".side-nav a, .nav-links a").forEach(a => {
    const href = a.getAttribute("href");
    if (href === current) a.classList.add("active");
  });
}

// Wires every [data-toggle-password] button to flip its target input
// between type="password" and type="text", swapping the eye icon.
function initPasswordToggles() {
  document.querySelectorAll(".password-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-toggle-password");
      const input = document.getElementById(targetId);
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.innerHTML = isHidden
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });
}

// Simple 4-bar password strength meter used on the register page.
// Purely a UX nudge — the real minimum-length check still happens on submit.
function initPasswordStrength(inputId, meterId, labelId) {
  const input = document.getElementById(inputId);
  const meter = document.getElementById(meterId);
  const label = document.getElementById(labelId);
  if (!input || !meter) return;

  const bars = meter.querySelectorAll("span");
  const colors = ["var(--danger)", "var(--warning)", "var(--blue)", "var(--green)"];
  const labels = ["Too short", "Weak", "Good", "Strong"];

  input.addEventListener("input", () => {
    const val = input.value;
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val) && val.length >= 8) score++;
    if (val.length === 0) score = 0;

    bars.forEach((bar, i) => {
      bar.style.background = i < score ? colors[Math.max(score - 1, 0)] : "var(--line)";
    });
    if (label) label.textContent = val.length === 0 ? "" : labels[Math.max(score - 1, 0)];
  });
}

function runInit() {
  initPublicNav();
  HMSComponents.initLayout();
  initDarkModeToggle();
  highlightActiveNav();
  initPasswordToggles();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runInit);
} else {
  runInit();
}

/* ------------------------ Export helpers (Reports page) ------------------------ */
// Reads visible rows/columns of a <table id="tableId"> and downloads them as CSV
// (opens cleanly in Excel/Sheets - no external library needed).
function exportTableAsCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const rows = Array.from(table.querySelectorAll("tr"));
  const csv = rows.map(row =>
    Array.from(row.querySelectorAll("th,td"))
      .map(cell => `"${cell.textContent.trim().replace(/"/g, '""')}"`)
      .join(",")
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : filename + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// "Export as PDF" — uses the browser's built-in print-to-PDF via the print
// stylesheet (see @media print in style.css), which hides chrome (sidebar,
// buttons) and leaves just the report content. No PDF library needed.
function exportPageAsPDF() {
  window.print();
}

/* ------------------------ Notifications badge & dropdown ------------------------ */
async function loadNotifDropdownPreview() {
  const container = document.getElementById("notif-dropdown-list");
  if (!container) return;
  try {
    const notifs = await api("/notifications");
    if (!notifs || notifs.length === 0) {
      container.innerHTML = `<div class="notif-empty">No notifications yet.</div>`;
      return;
    }
    const recent = notifs.slice(0, 5);
    container.innerHTML = recent.map(n => `
      <a href="notifications.html" class="notif-item-mini ${n.read ? '' : 'unread'}">
        <div style="flex:1;">
          <p style="margin:0;font-weight:${n.read ? '500' : '700'};">${escapeHtml(n.message)}</p>
          <small style="color:var(--secondary-text);">${timeAgo(n.createdAt)}</small>
        </div>
      </a>
    `).join("");
  } catch {
    container.innerHTML = `<div class="notif-empty">Notifications unavailable.</div>`;
  }
}

async function loadNotifBadge() {
  try {
    const notifs = await api("/notifications");
    const unread = notifs.filter(n => !n.read).length;
    const badgeText = unread > 9 ? "9+" : String(unread);

    // Update Topbar notification badge
    const topbarBadge = document.getElementById("topbar-notif-badge");
    if (topbarBadge) {
      if (unread > 0) {
        topbarBadge.textContent = badgeText;
        topbarBadge.style.display = "flex";
      } else {
        topbarBadge.style.display = "none";
      }
    }

    // Update Sidebar link badge
    document.querySelectorAll('a[href="notifications.html"]').forEach(link => {
      let badge = link.querySelector(".nav-badge");
      if (unread > 0) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "nav-badge";
          link.appendChild(badge);
        }
        badge.textContent = badgeText;
        badge.style.display = "inline-flex";
      } else if (badge) {
        badge.style.display = "none";
      }
    });
  } catch {
    // Silently fail if not logged in
  }
}

// Human-friendly "x minutes/hours/days ago" for notification timestamps
function timeAgo(isoString) {
  if (!isoString) return "";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/* ------------------------ Sortable + paginated tables ------------------------ */
function attachTableControls(tableId, data, renderRowFn, pageSize = 10) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const tbody = table.querySelector("tbody");
  let sortKey = null;
  let sortDir = "asc";
  let page = 1;

  function currentSlice() {
    let rows = [...data];
    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * pageSize;
    return { rows: rows.slice(start, start + pageSize), total: rows.length, totalPages };
  }

  function render() {
    const { rows, total, totalPages } = currentSlice();
    tbody.innerHTML = rows.length
      ? rows.map(renderRowFn).join("")
      : `<tr class="empty-row"><td colspan="20">No results found.</td></tr>`;
    renderPagination(total, totalPages);
  }

  function renderPagination(total, totalPages) {
    const el = document.getElementById(tableId + "-pagination");
    if (!el) return;
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

    let buttons = "";
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
        buttons += `<button class="pagination-btn ${p === page ? "active" : ""}" data-page="${p}">${p}</button>`;
      } else if (buttons.slice(-3) !== "...") {
        buttons += `<span class="pagination-btn" style="border:none;cursor:default;">...</span>`;
      }
    }

    el.innerHTML = `
      <span class="pagination-info">Showing ${start}–${end} of ${total}</span>
      <div class="pagination-controls">
        <button class="pagination-btn" id="${tableId}-prev" ${page === 1 ? "disabled" : ""} aria-label="Previous page">‹</button>
        ${buttons}
        <button class="pagination-btn" id="${tableId}-next" ${page === totalPages ? "disabled" : ""} aria-label="Next page">›</button>
      </div>`;

    el.querySelectorAll("[data-page]").forEach(btn => {
      btn.addEventListener("click", () => { page = Number(btn.dataset.page); render(); });
    });
    const prevBtn = document.getElementById(tableId + "-prev");
    const nextBtn = document.getElementById(tableId + "-next");
    if (prevBtn) prevBtn.addEventListener("click", () => { if (page > 1) { page--; render(); } });
    if (nextBtn) nextBtn.addEventListener("click", () => { if (page < totalPages) { page++; render(); } });
  }

  table.querySelectorAll("th.sortable").forEach(th => {
    th.innerHTML += ` <span class="sort-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></span>`;
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = "asc";
      }
      table.querySelectorAll("th.sortable").forEach(h => h.classList.remove("sort-asc", "sort-desc"));
      th.classList.add(sortDir === "asc" ? "sort-asc" : "sort-desc");
      page = 1;
      render();
    });
  });

  render();
  return { refresh: (newData) => { data = newData; render(); } };
}

document.addEventListener("click", (e) => {
  const el = e.target.closest(".ripple");
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const dot = document.createElement("span");
  dot.className = "ripple-dot";
  dot.style.width = dot.style.height = size + "px";
  dot.style.left = (e.clientX - rect.left - size / 2) + "px";
  dot.style.top = (e.clientY - rect.top - size / 2) + "px";
  el.appendChild(dot);
  setTimeout(() => dot.remove(), 500);
});
