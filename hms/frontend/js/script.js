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

function initSidebar() {
  const toggle = document.querySelector(".sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  }
}

function initDarkModeToggle() {
  const btn = document.querySelector(".dark-toggle");
  const stored = localStorage.getItem("hms_dark") === "1";
  if (stored) document.body.classList.add("dark-mode");
  if (btn) {
    btn.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
    btn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const isDark = document.body.classList.contains("dark-mode");
      localStorage.setItem("hms_dark", isDark ? "1" : "0");
      btn.textContent = isDark ? "☀️" : "🌙";
    });
  }
}

// Renders the sidebar user chip + wires the logout button, used across all dashboards
function renderUserChip() {
  const chip = document.getElementById("user-chip");
  const user = Auth.getUser();
  if (chip && user) {
    paintUserChip(chip, user);
  }
  document.querySelectorAll(".logout-btn").forEach(btn => {
    btn.addEventListener("click", (e) => { e.preventDefault(); Auth.logout(); });
  });

  // Refresh in the background so a saved profile photo shows up without
  // needing a fresh login - falls back silently to initials if this fails.
  if (chip && user) {
    api("/users/me").then(fresh => {
      const merged = { ...user, name: fresh.name, phone: fresh.phone, photoData: fresh.photoData };
      Auth.setPhotoCache(fresh.photoData);
      paintUserChip(chip, merged);
    }).catch(() => {});
  }
}

function paintUserChip(chip, user) {
  const initials = user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const avatarInner = user.photoData ? `<img src="${user.photoData}" alt="">` : initials;
  chip.innerHTML = `
    <div class="avatar">${avatarInner}</div>
    <div class="info">
      <div class="name">${escapeHtml(user.name)}</div>
      <div class="role">${escapeHtml(user.role.replace("_", " ").toLowerCase())}</div>
    </div>`;
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

document.addEventListener("DOMContentLoaded", () => {
  initPublicNav();
  initSidebar();
  initDarkModeToggle();
  highlightActiveNav();
  initPasswordToggles();
});

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

/* ------------------------ Notifications badge ------------------------ */
// Fetches the current user's notifications and, if any are unread, shows a
// count badge on whichever sidebar link points to notifications.html.
async function loadNotifBadge() {
  try {
    const notifs = await api("/notifications");
    const unread = notifs.filter(n => !n.read).length;
    if (unread === 0) return;
    document.querySelectorAll('a[href="notifications.html"]').forEach(link => {
      if (link.querySelector(".nav-badge")) return;
      const badge = document.createElement("span");
      badge.className = "nav-badge";
      badge.textContent = unread > 9 ? "9+" : String(unread);
      link.appendChild(badge);
    });
  } catch {
    // Not logged in yet or endpoint unavailable - fail silently, badge is a nicety.
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
