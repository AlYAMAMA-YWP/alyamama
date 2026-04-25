const STORAGE_KEY = "alyamama-attendance-local-v1";

const statusLabels = {
  present: "حاضر",
  late: "متأخر",
  checked_out: "انصرف",
  checkout_outside: "انصرف خارج النطاق",
  rejected_out_of_range: "خارج النطاق",
};

const statusClasses = {
  present: "green",
  late: "orange",
  checked_out: "green",
  checkout_outside: "orange",
  rejected_out_of_range: "red",
};

let appState = loadState();
let session = {
  view: "login",
  loginTab: "employee-login",
  adminTab: "dashboard",
  userId: null,
  selectedProjectId: "sawari",
  pendingLocation: null,
  filters: {
    projectId: "all",
    date: todayKey(),
    workNumber: "",
    status: "all",
  },
};

function seedState() {
  const now = new Date();
  const today = todayKey();
  const demoEmployeeId = cryptoId();
  const demoObserverId = cryptoId();

  return {
    settings: {
      adminPin: "1234",
      allowManualLocation: true,
      maxGpsAccuracyMeters: 100,
      allowCheckoutOutsideRange: true,
      storeRejectedAttempts: true,
    },
    projects: [
      {
        id: "sawari",
        name: "مشروع الصواري",
        city: "جدة",
        district: "شمال جدة",
        startTime: "07:00",
        radiusMeters: 500,
        lat: 21.7539,
        lng: 39.1163,
        note: "",
      },
      {
        id: "yaqout",
        name: "مشروع الياقوت",
        city: "جدة",
        district: "شمال جدة",
        startTime: "07:00",
        radiusMeters: 500,
        lat: 21.7287,
        lng: 39.1528,
        note: "",
      },
    ],
    users: [
      {
        id: demoEmployeeId,
        fullName: "موظف تجريبي",
        workNumber: "1001",
        phone: "",
        role: "employee",
        projectIds: ["sawari"],
        createdAt: now.toISOString(),
      },
      {
        id: demoObserverId,
        fullName: "مراقب تجريبي",
        workNumber: "1002",
        phone: "",
        role: "employee",
        projectIds: ["yaqout"],
        createdAt: now.toISOString(),
      },
    ],
    records: [
      {
        id: cryptoId(),
        userId: demoEmployeeId,
        fullName: "موظف تجريبي",
        workNumber: "1001",
        projectId: "sawari",
        date: today,
        checkInAt: withTime(now, "06:52").toISOString(),
        checkOutAt: "",
        checkInLocation: { lat: 21.754, lng: 39.1164, accuracy: 18 },
        checkOutLocation: null,
        distanceMeters: 16,
        arrivalStatus: "present",
        status: "present",
        approved: true,
      },
      {
        id: cryptoId(),
        userId: demoObserverId,
        fullName: "مراقب تجريبي",
        workNumber: "1002",
        projectId: "yaqout",
        date: today,
        checkInAt: withTime(now, "07:24").toISOString(),
        checkOutAt: "",
        checkInLocation: { lat: 21.7288, lng: 39.153, accuracy: 22 },
        checkOutLocation: null,
        distanceMeters: 24,
        arrivalStatus: "late",
        status: "late",
        approved: true,
      },
    ],
  };
}

function loadState() {
  const seeded = seedState();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      saveState(seeded);
      return seeded;
    }

    const parsed = JSON.parse(stored);
    return {
      settings: { ...seeded.settings, ...(parsed.settings || {}) },
      projects: parsed.projects?.length ? parsed.projects : seeded.projects,
      users: parsed.users || [],
      records: parsed.records || [],
    };
  } catch {
    saveState(seeded);
    return seeded;
  }
}

function saveState(nextState = appState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function cryptoId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function withTime(date, time) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value, fractionDigits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: fractionDigits,
  }).format(Number(value));
}

function projectById(projectId) {
  return appState.projects.find((project) => project.id === projectId);
}

function currentUser() {
  return appState.users.find((user) => user.id === session.userId);
}

function userProjects(user) {
  const ids = user?.projectIds?.length
    ? user.projectIds
    : appState.projects.map((project) => project.id);
  return appState.projects.filter((project) => ids.includes(project.id));
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time || "07:00")
    .split(":")
    .map(Number);
  return hours * 60 + minutes;
}

function minutesFromDate(value) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function haversineMeters(a, b) {
  const radius = 6371000;
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * radius * Math.asin(Math.sqrt(h));
}

function projectHasLocation(project) {
  return Number.isFinite(Number(project?.lat)) && Number.isFinite(Number(project?.lng));
}

function distanceFromProject(project, location) {
  if (!projectHasLocation(project) || !location) return null;
  return haversineMeters(
    { lat: Number(project.lat), lng: Number(project.lng) },
    { lat: Number(location.lat), lng: Number(location.lng) },
  );
}

function approvedDailyRecord(userId, projectId, date = todayKey()) {
  return appState.records.find(
    (record) =>
      record.userId === userId &&
      record.projectId === projectId &&
      record.date === date &&
      record.approved,
  );
}

function statusText(record) {
  if (!record.approved) return statusLabels.rejected_out_of_range;
  if (record.checkOutAt && record.status === "checkout_outside") {
    return "انصرف خارج النطاق";
  }
  if (record.checkOutAt && record.arrivalStatus === "late") {
    return "متأخر - انصرف";
  }
  if (record.checkOutAt) return statusLabels.checked_out;
  return statusLabels[record.status] || statusLabels.present;
}

function statusClass(record) {
  if (!record.approved) return "red";
  if (record.status === "checkout_outside" || record.arrivalStatus === "late") return "orange";
  if (record.status === "checked_out" || record.status === "present") return "green";
  return statusClasses[record.status] || "gray";
}

function mapsUrl(location) {
  if (!location) return "#";
  return `https://www.google.com/maps?q=${Number(location.lat)},${Number(location.lng)}`;
}

function render() {
  const root = document.getElementById("app");
  root.innerHTML = `
    ${renderTopbar()}
    <main class="page">
      ${session.pendingLocation ? renderLocationStep() : renderMain()}
    </main>
  `;
}

function renderTopbar() {
  const user = currentUser();
  const title =
    session.view === "admin"
      ? "لوحة إدارة حضور المشاريع"
      : "نظام حضور وانصراف المشاريع";

  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true"></div>
        <div class="brand-title">
          <strong>ALYAMAMA</strong>
          <span>${title}</span>
        </div>
      </div>
      ${
        user || session.view === "admin"
          ? `<button class="btn secondary" onclick="logout()">تسجيل خروج</button>`
          : ""
      }
    </header>
  `;
}

function renderMain() {
  if (session.view === "admin") return renderAdmin();
  if (session.view === "employee") return renderEmployee();
  return renderLogin();
}

function renderLogin() {
  return `
    <section class="hero-grid">
      <div class="panel">
        <h1>حضور المشاريع الميدانية</h1>
        <p>
          إدارة حضور وانصراف المهندسين والمراقبين في مشروع الصواري ومشروع الياقوت داخل جدة.
        </p>
        <div class="stats">
          <div class="stat-card">
            <span>المشاريع</span>
            <strong>${formatNumber(appState.projects.length)}</strong>
          </div>
          <div class="stat-card">
            <span>الموظفون</span>
            <strong>${formatNumber(appState.users.length)}</strong>
          </div>
          <div class="stat-card">
            <span>سجلات اليوم</span>
            <strong>${formatNumber(appState.records.filter((r) => r.date === todayKey()).length)}</strong>
          </div>
          <div class="stat-card">
            <span>المدينة</span>
            <strong style="font-size:22px">جدة</strong>
          </div>
        </div>
        <div class="actions">
          ${appState.projects
            .map(
              (project) => `
                <span class="badge">${escapeHtml(project.name)} - ${escapeHtml(project.district)}</span>
              `,
            )
            .join("")}
        </div>
      </div>

      <div class="panel">
        <div class="tabs">
          <button class="tab ${session.loginTab === "employee-login" ? "active" : ""}" onclick="setLoginTab('employee-login')">
            دخول موظف
          </button>
          <button class="tab ${session.loginTab === "register" ? "active" : ""}" onclick="setLoginTab('register')">
            تسجيل موظف جديد
          </button>
          <button class="tab ${session.loginTab === "admin" ? "active" : ""}" onclick="setLoginTab('admin')">
            الإدارة
          </button>
        </div>
        ${renderLoginTab()}
      </div>
    </section>
  `;
}

function renderLoginTab() {
  if (session.loginTab === "register") {
    return `
      <form class="form-grid" onsubmit="event.preventDefault(); registerEmployee();">
        <label class="field">
          <span>الاسم الكامل</span>
          <input id="registerName" class="input" autocomplete="name" required />
        </label>
        <label class="field">
          <span>رقم العمل</span>
          <input id="registerWorkNumber" class="input" inputmode="numeric" required />
        </label>
        <label class="field">
          <span>رقم الجوال اختياري</span>
          <input id="registerPhone" class="input" inputmode="tel" />
        </label>
        <div class="field">
          <span>المشاريع المتاحة</span>
          <div class="checkbox-row">
            ${appState.projects
              .map(
                (project) => `
                  <label class="checkbox-pill">
                    <input type="checkbox" name="registerProjects" value="${project.id}" checked />
                    ${escapeHtml(project.name)}
                  </label>
                `,
              )
              .join("")}
          </div>
        </div>
        <button class="btn green big-action" type="submit">إنشاء الحساب والدخول</button>
      </form>
    `;
  }

  if (session.loginTab === "admin") {
    return `
      <form class="form-grid" onsubmit="event.preventDefault(); loginAdmin();">
        <label class="field">
          <span>رمز الإدارة</span>
          <input id="adminPin" class="input" type="password" inputmode="numeric" required />
        </label>
        <button class="btn big-action" type="submit">دخول لوحة الإدارة</button>
      </form>
    `;
  }

  return `
    <form class="form-grid" onsubmit="event.preventDefault(); loginEmployee();">
      <label class="field">
        <span>رقم العمل</span>
        <input id="loginWorkNumber" class="input" inputmode="numeric" required />
      </label>
      <button class="btn green big-action" type="submit">دخول الموظف</button>
    </form>
  `;
}

function renderEmployee() {
  const user = currentUser();
  if (!user) {
    session.view = "login";
    return renderLogin();
  }

  const projects = userProjects(user);
  if (!projects.some((project) => project.id === session.selectedProjectId)) {
    session.selectedProjectId = projects[0]?.id || appState.projects[0]?.id;
  }

  const project = projectById(session.selectedProjectId);
  const record = approvedDailyRecord(user.id, project?.id);
  const rejectedToday = appState.records
    .filter(
      (item) =>
        item.userId === user.id &&
        item.projectId === project?.id &&
        item.date === todayKey() &&
        !item.approved,
    )
    .slice(-1)[0];

  return `
    <section class="work-grid">
      <div class="panel">
        <h2>مرحباً، ${escapeHtml(user.fullName)}</h2>
        <div class="status-line">
          <span class="badge">رقم العمل: ${escapeHtml(user.workNumber)}</span>
          <span class="badge">اليوم: ${escapeHtml(todayKey())}</span>
        </div>
        <label class="field">
          <span>المشروع</span>
          <select class="select" onchange="selectProject(this.value)">
            ${projects
              .map(
                (item) => `
                  <option value="${item.id}" ${item.id === project?.id ? "selected" : ""}>
                    ${escapeHtml(item.name)} - ${escapeHtml(item.district)}
                  </option>
                `,
              )
              .join("")}
          </select>
        </label>

        <div class="card project-card" style="margin-top:14px">
          <h3>${escapeHtml(project?.name || "لا يوجد مشروع")}</h3>
          <div class="meta-grid">
            <div class="meta-item">
              <span>المدينة / المنطقة</span>
              <strong>${escapeHtml(project?.city || "-")} - ${escapeHtml(project?.district || "-")}</strong>
            </div>
            <div class="meta-item">
              <span>بداية الدوام</span>
              <strong>${escapeHtml(project?.startTime || "-")}</strong>
            </div>
            <div class="meta-item">
              <span>نطاق السماح</span>
              <strong>${formatNumber(project?.radiusMeters)} متر</strong>
            </div>
            <div class="meta-item">
              <span>موقع المشروع</span>
              <strong>${projectHasLocation(project) ? "محدد" : "غير محدد"}</strong>
            </div>
          </div>
        </div>

        ${renderEmployeeStatus(record, rejectedToday, project)}
      </div>

      <div class="panel">
        <h2>سجلي الأخير</h2>
        ${renderEmployeeRecords(user)}
      </div>
    </section>
  `;
}

function renderEmployeeStatus(record, rejectedToday, project) {
  if (!projectHasLocation(project)) {
    return `
      <div class="notice warning" style="margin-top:14px">
        موقع المشروع غير مضبوط من الإدارة.
      </div>
    `;
  }

  if (!record) {
    return `
      <div class="notice" style="margin-top:14px">
        حالة اليوم: لم يتم تسجيل الحضور بعد.
      </div>
      ${
        rejectedToday
          ? `<div class="notice danger" style="margin-top:10px">آخر محاولة اليوم كانت خارج نطاق المشروع.</div>`
          : ""
      }
      <div class="actions">
        <button class="btn green big-action" onclick="startLocationFlow('checkin')">تحديد موقعي وإتمام الحضور</button>
      </div>
    `;
  }

  if (record.checkOutAt) {
    return `
      <div class="notice" style="margin-top:14px">
        تم تسجيل حضورك وانصرافك لهذا اليوم.
      </div>
      <div class="status-line">
        <span class="badge ${statusClass(record)}">${escapeHtml(statusText(record))}</span>
        <span class="badge">الحضور: ${formatDateTime(record.checkInAt)}</span>
        <span class="badge">الانصراف: ${formatDateTime(record.checkOutAt)}</span>
      </div>
    `;
  }

  return `
    <div class="notice" style="margin-top:14px">
      تم تسجيل حضورك. يمكنك تسجيل الانصراف بعد تحديد موقعك مرة أخرى.
    </div>
    <div class="status-line">
      <span class="badge ${statusClass(record)}">${escapeHtml(statusText(record))}</span>
      <span class="badge">وقت الحضور: ${formatDateTime(record.checkInAt)}</span>
    </div>
    <div class="actions">
      <button class="btn warning big-action" onclick="startLocationFlow('checkout')">تحديد موقعي وتسجيل الانصراف</button>
    </div>
  `;
}

function renderEmployeeRecords(user) {
  const records = appState.records
    .filter((record) => record.userId === user.id || record.workNumber === user.workNumber)
    .slice()
    .sort((a, b) => String(b.checkInAt).localeCompare(String(a.checkInAt)))
    .slice(0, 8);

  if (!records.length) return `<div class="empty-state">لا توجد سجلات بعد.</div>`;

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>المشروع</th>
            <th>الحضور</th>
            <th>الانصراف</th>
            <th>الحالة</th>
            <th>الموقع</th>
          </tr>
        </thead>
        <tbody>
          ${records
            .map((record) => {
              const project = projectById(record.projectId);
              return `
                <tr>
                  <td>${escapeHtml(record.date)}</td>
                  <td>${escapeHtml(project?.name || record.projectId)}</td>
                  <td>${formatDateTime(record.checkInAt)}</td>
                  <td>${formatDateTime(record.checkOutAt)}</td>
                  <td><span class="badge ${statusClass(record)}">${escapeHtml(statusText(record))}</span></td>
                  <td>
                    ${
                      record.checkInLocation
                        ? `<a href="${mapsUrl(record.checkInLocation)}" target="_blank" rel="noreferrer">عرض الحضور</a>`
                        : "-"
                    }
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderLocationStep() {
  const pending = session.pendingLocation;
  const project = projectById(pending.projectId);
  const location = pending.location;
  const distance = distanceFromProject(project, location);
  const isInside =
    distance === null ? null : distance <= Number(project?.radiusMeters || 0);
  const title =
    pending.action === "set-project"
      ? "تحديد موقع المشروع"
      : pending.action === "checkout"
        ? "تحديد موقعي للانصراف"
        : "تحديد موقعي للحضور";

  return `
    <section class="location-step">
      <h2>${title}</h2>
      <p>
        المشروع: <strong>${escapeHtml(project?.name || "-")}</strong>.
      </p>

      <div class="map-box" aria-label="معاينة الخريطة">
        <div class="range-ring"></div>
        <div class="project-pin"><span>م</span></div>
        ${location ? `<div class="map-pin"><span>أ</span></div>` : ""}
        <div class="map-note">
          ${
            location
              ? `الموقع المختار: ${formatNumber(location.lat, 6)}, ${formatNumber(location.lng, 6)}`
              : "لم يتم تحديد الموقع"
          }
        </div>
      </div>

      <div class="actions">
        <button class="btn green" onclick="captureGpsLocation()">استخدام موقعي الحالي</button>
        <button class="btn secondary" onclick="cancelLocationFlow()">رجوع</button>
        ${
          location
            ? `<a class="btn secondary" href="${mapsUrl(location)}" target="_blank" rel="noreferrer">فتح في خرائط جوجل</a>`
            : ""
        }
      </div>

      ${renderManualLocationForm(location, pending.action)}

      ${
        location
          ? `
            <div class="meta-grid" style="margin-top:14px">
              <div class="meta-item">
                <span>دقة GPS</span>
                <strong>${location.accuracy ? `${formatNumber(location.accuracy)} متر` : "غير متاحة"}</strong>
              </div>
              <div class="meta-item">
                <span>المسافة من المشروع</span>
                <strong>${distance === null ? "لم يحدد موقع المشروع" : `${formatNumber(distance)} متر`}</strong>
              </div>
              <div class="meta-item">
                <span>نطاق المشروع</span>
                <strong>${formatNumber(project?.radiusMeters)} متر</strong>
              </div>
              <div class="meta-item">
                <span>نتيجة التحقق</span>
                <strong>${isInside === null ? "غير متاحة" : isInside ? "داخل النطاق" : "خارج النطاق"}</strong>
              </div>
            </div>
            <div class="actions">
              <button class="btn ${isInside === false && pending.action === "checkin" ? "danger" : "green"} big-action" onclick="confirmPendingLocation()">
                ${pending.action === "set-project" ? "حفظ موقع المشروع" : pending.action === "checkout" ? "تأكيد الموقع وتسجيل الانصراف" : "تأكيد الموقع وإتمام الحضور"}
              </button>
            </div>
          `
          : `<div class="notice warning" style="margin-top:14px">لم يتم تحديد موقع بعد.</div>`
      }
    </section>
  `;
}

function renderManualLocationForm(location, action) {
  const canUseManual = action === "set-project" || appState.settings.allowManualLocation;
  if (!canUseManual) return "";

  return `
    <form class="form-grid" style="margin-top:14px" onsubmit="event.preventDefault(); useManualLocation();">
      <div class="two-col">
        <label class="field">
          <span>Latitude</span>
          <input id="manualLat" class="input" inputmode="decimal" placeholder="21.753900" value="${escapeHtml(location?.lat || "")}" />
        </label>
        <label class="field">
          <span>Longitude</span>
          <input id="manualLng" class="input" inputmode="decimal" placeholder="39.116300" value="${escapeHtml(location?.lng || "")}" />
        </label>
      </div>
      <button class="btn secondary" type="submit">اعتماد الإحداثيات</button>
    </form>
  `;
}

function renderAdmin() {
  return `
    <section class="admin-layout">
      <aside class="sidebar">
        ${adminButton("dashboard", "المتابعة اليومية")}
        ${adminButton("projects", "المشاريع والمواقع")}
        ${adminButton("employees", "الموظفون")}
        ${adminButton("records", "السجلات والتقارير")}
        ${adminButton("settings", "إعدادات النظام")}
      </aside>
      <div>
        ${renderAdminTab()}
      </div>
    </section>
  `;
}

function adminButton(tab, label) {
  return `
    <button class="btn ${session.adminTab === tab ? "" : "secondary"}" onclick="setAdminTab('${tab}')">
      ${label}
    </button>
  `;
}

function renderAdminTab() {
  if (session.adminTab === "projects") return renderAdminProjects();
  if (session.adminTab === "employees") return renderAdminEmployees();
  if (session.adminTab === "records") return renderAdminRecords();
  if (session.adminTab === "settings") return renderAdminSettings();
  return renderAdminDashboard();
}

function dashboardStats() {
  const today = todayKey();
  const approved = appState.records.filter((record) => record.date === today && record.approved);
  const present = approved.length;
  const checkedOut = approved.filter((record) => record.checkOutAt).length;
  const late = approved.filter((record) => record.arrivalStatus === "late").length;
  const totalAssignments = appState.users.reduce(
    (sum, user) => sum + (user.projectIds?.length || 0),
    0,
  );
  const absent = Math.max(totalAssignments - present, 0);

  return { present, checkedOut, late, absent };
}

function renderAdminDashboard() {
  const stats = dashboardStats();

  return `
    <div class="panel">
      <h2>المتابعة اليومية</h2>
      <div class="stats">
        <div class="stat-card"><span>الحاضرون</span><strong>${formatNumber(stats.present)}</strong></div>
        <div class="stat-card"><span>المنصرفون</span><strong>${formatNumber(stats.checkedOut)}</strong></div>
        <div class="stat-card"><span>المتأخرون</span><strong>${formatNumber(stats.late)}</strong></div>
        <div class="stat-card"><span>الغائبون</span><strong>${formatNumber(stats.absent)}</strong></div>
      </div>
    </div>
    <div class="admin-grid" style="margin-top:18px">
      ${appState.projects.map((project) => renderProjectDailyCard(project)).join("")}
    </div>
  `;
}

function renderProjectDailyCard(project) {
  const today = todayKey();
  const assignedUsers = appState.users.filter((user) => user.projectIds?.includes(project.id));
  const records = appState.records.filter(
    (record) => record.projectId === project.id && record.date === today && record.approved,
  );
  const present = records.length;
  const checkedOut = records.filter((record) => record.checkOutAt).length;
  const late = records.filter((record) => record.arrivalStatus === "late").length;
  const absentNames = assignedUsers
    .filter((user) => !records.some((record) => record.userId === user.id || record.workNumber === user.workNumber))
    .map((user) => `${user.fullName} (${user.workNumber})`);

  return `
    <div class="card project-card">
      <h3>${escapeHtml(project.name)}</h3>
      <div class="status-line">
        <span class="badge">جدة - ${escapeHtml(project.district)}</span>
        <span class="badge">بداية الدوام ${escapeHtml(project.startTime)}</span>
      </div>
      <div class="meta-grid">
        <div class="meta-item"><span>حاضر</span><strong>${formatNumber(present)}</strong></div>
        <div class="meta-item"><span>انصرف</span><strong>${formatNumber(checkedOut)}</strong></div>
        <div class="meta-item"><span>متأخر</span><strong>${formatNumber(late)}</strong></div>
        <div class="meta-item"><span>غائب</span><strong>${formatNumber(Math.max(assignedUsers.length - present, 0))}</strong></div>
      </div>
      <div class="notice ${absentNames.length ? "warning" : ""}">
        ${absentNames.length ? `لم يسجلوا حضورهم اليوم: ${escapeHtml(absentNames.join("، "))}` : "لا توجد حالات غياب لهذا المشروع حتى الآن."}
      </div>
    </div>
  `;
}

function renderAdminProjects() {
  return `
    <div class="panel">
      <h2>المشاريع والمواقع</h2>
    </div>
    <div class="admin-grid" style="margin-top:18px">
      ${appState.projects.map((project) => renderProjectSettings(project)).join("")}
    </div>
  `;
}

function renderProjectSettings(project) {
  return `
    <form class="card form-grid" onsubmit="event.preventDefault(); saveProject('${project.id}');">
      <h3>${escapeHtml(project.name)}</h3>
      <label class="field">
        <span>اسم المشروع</span>
        <input id="project-${project.id}-name" class="input" value="${escapeHtml(project.name)}" required />
      </label>
      <div class="two-col">
        <label class="field">
          <span>المدينة</span>
          <input id="project-${project.id}-city" class="input" value="${escapeHtml(project.city)}" required />
        </label>
        <label class="field">
          <span>المنطقة / الحي</span>
          <input id="project-${project.id}-district" class="input" value="${escapeHtml(project.district)}" required />
        </label>
      </div>
      <div class="two-col">
        <label class="field">
          <span>وقت بداية الدوام</span>
          <input id="project-${project.id}-start" class="input" type="time" value="${escapeHtml(project.startTime)}" required />
        </label>
        <label class="field">
          <span>نصف قطر السماح بالمتر</span>
          <input id="project-${project.id}-radius" class="input" type="number" min="25" step="25" value="${escapeHtml(project.radiusMeters)}" required />
        </label>
      </div>
      <div class="two-col">
        <label class="field">
          <span>Latitude</span>
          <input id="project-${project.id}-lat" class="input" inputmode="decimal" value="${escapeHtml(project.lat)}" required />
        </label>
        <label class="field">
          <span>Longitude</span>
          <input id="project-${project.id}-lng" class="input" inputmode="decimal" value="${escapeHtml(project.lng)}" required />
        </label>
      </div>
      <div class="actions">
        <button class="btn green" type="submit">حفظ الإعدادات</button>
        <button class="btn secondary" type="button" onclick="startProjectLocationFlow('${project.id}')">تحديد على الخريطة</button>
        ${
          projectHasLocation(project)
            ? `<a class="btn secondary" href="${mapsUrl(project)}" target="_blank" rel="noreferrer">عرض في خرائط جوجل</a>`
            : ""
        }
      </div>
    </form>
  `;
}

function renderAdminSettings() {
  return `
    <form class="panel form-grid" onsubmit="event.preventDefault(); saveSystemSettings();">
      <h2>إعدادات النظام</h2>
      <div class="two-col">
        <label class="field">
          <span>رمز الإدارة</span>
          <input id="settingsAdminPin" class="input" type="password" value="${escapeHtml(appState.settings.adminPin)}" required />
        </label>
        <label class="field">
          <span>أقصى دقة GPS مقبولة بالمتر</span>
          <input id="settingsMaxAccuracy" class="input" type="number" min="10" step="10" value="${escapeHtml(appState.settings.maxGpsAccuracyMeters)}" required />
        </label>
      </div>
      <div class="checkbox-row">
        <label class="checkbox-pill">
          <input id="settingsManualLocation" type="checkbox" ${appState.settings.allowManualLocation ? "checked" : ""} />
          السماح بإدخال الموقع يدوياً
        </label>
        <label class="checkbox-pill">
          <input id="settingsCheckoutOutside" type="checkbox" ${appState.settings.allowCheckoutOutsideRange ? "checked" : ""} />
          السماح بتسجيل الانصراف خارج النطاق مع تنبيه
        </label>
        <label class="checkbox-pill">
          <input id="settingsRejectedAttempts" type="checkbox" ${appState.settings.storeRejectedAttempts ? "checked" : ""} />
          حفظ محاولات الحضور المرفوضة
        </label>
      </div>
      <div class="actions">
        <button class="btn green" type="submit">حفظ إعدادات النظام</button>
      </div>
    </form>
  `;
}

function renderAdminEmployees() {
  const rows = appState.users
    .map((user) => {
      const projects = userProjects(user).map((project) => project.name).join("، ");
      return `
        <tr>
          <td>${escapeHtml(user.fullName)}</td>
          <td>${escapeHtml(user.workNumber)}</td>
          <td>${escapeHtml(user.phone || "-")}</td>
          <td>${escapeHtml(projects)}</td>
          <td>${formatDateTime(user.createdAt)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="panel">
      <h2>الموظفون المسجلون ذاتياً</h2>
      <p>كل موظف يستطيع إنشاء حسابه باسمه ورقم العمل. رقم العمل لا يسمح بتكراره.</p>
    </div>
    <div class="table-wrap" style="margin-top:18px">
      <table>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>رقم العمل</th>
            <th>الجوال</th>
            <th>المشاريع</th>
            <th>تاريخ التسجيل</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="5">لا يوجد موظفون بعد.</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function renderAdminRecords() {
  const filtered = filteredRecords();

  return `
    <div class="panel">
      <h2>السجلات والتقارير</h2>
      <div class="form-grid">
        <div class="two-col">
          <label class="field">
            <span>المشروع</span>
            <select class="select" onchange="setFilter('projectId', this.value)">
              <option value="all">كل المشاريع</option>
              ${appState.projects
                .map(
                  (project) => `
                    <option value="${project.id}" ${session.filters.projectId === project.id ? "selected" : ""}>
                      ${escapeHtml(project.name)}
                    </option>
                  `,
                )
                .join("")}
            </select>
          </label>
          <label class="field">
            <span>التاريخ</span>
            <input class="input" type="date" value="${escapeHtml(session.filters.date)}" onchange="setFilter('date', this.value)" />
          </label>
        </div>
        <div class="two-col">
          <label class="field">
            <span>رقم العمل</span>
            <input class="input" value="${escapeHtml(session.filters.workNumber)}" oninput="setFilter('workNumber', this.value)" />
          </label>
          <label class="field">
            <span>الحالة</span>
            <select class="select" onchange="setFilter('status', this.value)">
              <option value="all">كل الحالات</option>
              ${Object.entries(statusLabels)
                .map(
                  ([value, label]) => `
                    <option value="${value}" ${session.filters.status === value ? "selected" : ""}>
                      ${label}
                    </option>
                  `,
                )
                .join("")}
            </select>
          </label>
        </div>
      </div>
    </div>

    <div class="table-wrap" style="margin-top:18px">
      <table>
        <thead>
          <tr>
            <th>الموظف</th>
            <th>رقم العمل</th>
            <th>المشروع</th>
            <th>الحضور</th>
            <th>الانصراف</th>
            <th>الحالة</th>
            <th>موقع الحضور</th>
            <th>موقع الانصراف</th>
          </tr>
        </thead>
        <tbody>
          ${
            filtered.length
              ? filtered.map(renderRecordRow).join("")
              : `<tr><td colspan="8">لا توجد سجلات مطابقة.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function filteredRecords() {
  return appState.records
    .filter((record) => {
      const matchProject =
        session.filters.projectId === "all" || record.projectId === session.filters.projectId;
      const matchDate = !session.filters.date || record.date === session.filters.date;
      const matchWork =
        !session.filters.workNumber ||
        String(record.workNumber).includes(String(session.filters.workNumber).trim());
      const matchStatus =
        session.filters.status === "all" ||
        record.status === session.filters.status ||
        record.arrivalStatus === session.filters.status;
      return matchProject && matchDate && matchWork && matchStatus;
    })
    .slice()
    .sort((a, b) => String(b.checkInAt).localeCompare(String(a.checkInAt)));
}

function renderRecordRow(record) {
  const project = projectById(record.projectId);
  return `
    <tr>
      <td>${escapeHtml(record.fullName || "-")}</td>
      <td>${escapeHtml(record.workNumber || "-")}</td>
      <td>${escapeHtml(project?.name || record.projectId)}</td>
      <td>${formatDateTime(record.checkInAt)}</td>
      <td>${formatDateTime(record.checkOutAt)}</td>
      <td><span class="badge ${statusClass(record)}">${escapeHtml(statusText(record))}</span></td>
      <td>
        ${
          record.checkInLocation
            ? `<a href="${mapsUrl(record.checkInLocation)}" target="_blank" rel="noreferrer">عرض على خرائط جوجل</a>`
            : "-"
        }
      </td>
      <td>
        ${
          record.checkOutLocation
            ? `<a href="${mapsUrl(record.checkOutLocation)}" target="_blank" rel="noreferrer">عرض على خرائط جوجل</a>`
            : "-"
        }
      </td>
    </tr>
  `;
}

function setLoginTab(tab) {
  session.loginTab = tab;
  render();
}

function registerEmployee() {
  const fullName = document.getElementById("registerName").value.trim();
  const workNumber = document.getElementById("registerWorkNumber").value.trim();
  const phone = document.getElementById("registerPhone").value.trim();
  const projectIds = Array.from(document.querySelectorAll("[name='registerProjects']:checked")).map(
    (input) => input.value,
  );

  if (!fullName || !workNumber) {
    alert("اكتب الاسم ورقم العمل.");
    return;
  }

  if (!projectIds.length) {
    alert("اختر مشروعاً واحداً على الأقل.");
    return;
  }

  const exists = appState.users.some((user) => user.workNumber === workNumber);
  if (exists) {
    alert("رقم العمل مسجل مسبقاً.");
    return;
  }

  const user = {
    id: cryptoId(),
    fullName,
    workNumber,
    phone,
    role: "employee",
    projectIds,
    createdAt: new Date().toISOString(),
  };

  appState.users.push(user);
  saveState();
  session.userId = user.id;
  session.view = "employee";
  session.selectedProjectId = projectIds[0];
  render();
}

function loginEmployee() {
  const workNumber = document.getElementById("loginWorkNumber").value.trim();
  const user = appState.users.find((item) => item.workNumber === workNumber);

  if (!user) {
    alert("لم يتم العثور على رقم العمل. سجل موظفاً جديداً أولاً.");
    return;
  }

  session.userId = user.id;
  session.view = "employee";
  session.selectedProjectId = user.projectIds?.[0] || appState.projects[0]?.id;
  render();
}

function loginAdmin() {
  const pin = document.getElementById("adminPin").value.trim();
  if (pin !== appState.settings.adminPin) {
    alert("رمز الإدارة غير صحيح.");
    return;
  }

  session.view = "admin";
  session.userId = null;
  render();
}

function logout() {
  session = {
    ...session,
    view: "login",
    userId: null,
    pendingLocation: null,
  };
  render();
}

function selectProject(projectId) {
  session.selectedProjectId = projectId;
  render();
}

function startLocationFlow(action) {
  const project = projectById(session.selectedProjectId);
  if (!projectHasLocation(project)) {
    alert("يجب تحديد موقع المشروع من الإدارة أولاً.");
    return;
  }

  session.pendingLocation = {
    action,
    projectId: session.selectedProjectId,
    location: null,
  };
  render();
}

function startProjectLocationFlow(projectId) {
  session.pendingLocation = {
    action: "set-project",
    projectId,
    location: null,
  };
  render();
}

function cancelLocationFlow() {
  session.pendingLocation = null;
  render();
}

function captureGpsLocation() {
  if (!navigator.geolocation) {
    alert("المتصفح لا يدعم تحديد الموقع.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      session.pendingLocation.location = {
        lat: Number(position.coords.latitude),
        lng: Number(position.coords.longitude),
        accuracy: position.coords.accuracy ? Number(position.coords.accuracy) : null,
        source: "gps",
      };
      render();
    },
    (error) => {
      alert(`تعذر تحديد الموقع. راجع إذن الموقع في الجهاز. ${error.message}`);
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    },
  );
}

function useManualLocation() {
  if (
    session.pendingLocation?.action !== "set-project" &&
    !appState.settings.allowManualLocation
  ) {
    alert("الإدخال اليدوي للموقع غير مفعل من الإدارة.");
    return;
  }

  const lat = Number(document.getElementById("manualLat").value);
  const lng = Number(document.getElementById("manualLng").value);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    alert("أدخل إحداثيات صحيحة.");
    return;
  }

  session.pendingLocation.location = {
    lat,
    lng,
    accuracy: null,
    source: "manual",
  };
  render();
}

function confirmPendingLocation() {
  const pending = session.pendingLocation;
  const project = projectById(pending.projectId);
  const location = pending.location;

  if (!pending || !project || !location) {
    alert("حدد الموقع أولاً.");
    return;
  }

  if (pending.action === "set-project") {
    project.lat = Number(location.lat);
    project.lng = Number(location.lng);
    project.note = `آخر تحديث للموقع: ${formatDateTime(new Date().toISOString())}`;
    saveState();
    session.pendingLocation = null;
    session.adminTab = "projects";
    render();
    return;
  }

  const user = currentUser();
  if (!user) {
    alert("سجل الدخول مرة أخرى.");
    return;
  }

  if (
    location.source === "gps" &&
    location.accuracy &&
    Number(location.accuracy) > Number(appState.settings.maxGpsAccuracyMeters)
  ) {
    alert("دقة الموقع غير كافية. حاول مرة أخرى من مكان مفتوح.");
    return;
  }

  const distance = distanceFromProject(project, location);
  if (distance === null) {
    alert("موقع المشروع غير محدد.");
    return;
  }

  if (pending.action === "checkin") {
    saveCheckIn(user, project, location, distance);
  } else {
    saveCheckOut(user, project, location, distance);
  }

  session.pendingLocation = null;
  render();
}

function saveCheckIn(user, project, location, distance) {
  const date = todayKey();
  const existing = approvedDailyRecord(user.id, project.id, date);

  if (existing) {
    alert("تم تسجيل حضورك لهذا المشروع اليوم مسبقاً.");
    return;
  }

  const now = new Date();
  const inside = distance <= Number(project.radiusMeters);
  const late = minutesFromDate(now) > timeToMinutes(project.startTime);

  if (!inside) {
    if (appState.settings.storeRejectedAttempts) {
      appState.records.push({
        id: cryptoId(),
        userId: user.id,
        fullName: user.fullName,
        workNumber: user.workNumber,
        projectId: project.id,
        date,
        checkInAt: now.toISOString(),
        checkOutAt: "",
        checkInLocation: location,
        checkOutLocation: null,
        distanceMeters: distance,
        arrivalStatus: "rejected_out_of_range",
        status: "rejected_out_of_range",
        approved: false,
      });
    }
    saveState();
    alert("موقعك خارج نطاق المشروع ولا يمكن إتمام الحضور.");
    return;
  }

  appState.records.push({
    id: cryptoId(),
    userId: user.id,
    fullName: user.fullName,
    workNumber: user.workNumber,
    projectId: project.id,
    date,
    checkInAt: now.toISOString(),
    checkOutAt: "",
    checkInLocation: location,
    checkOutLocation: null,
    distanceMeters: distance,
    arrivalStatus: late ? "late" : "present",
    status: late ? "late" : "present",
    approved: true,
  });
  saveState();
  alert(late ? "تم تسجيل الحضور بحالة متأخر." : "تم تسجيل الحضور بنجاح.");
}

function saveCheckOut(user, project, location, distance) {
  const record = approvedDailyRecord(user.id, project.id, todayKey());

  if (!record) {
    alert("لا يمكن تسجيل الانصراف قبل وجود حضور معتمد لنفس اليوم.");
    return;
  }

  if (record.checkOutAt) {
    alert("تم تسجيل الانصراف لهذا اليوم مسبقاً.");
    return;
  }

  const inside = distance <= Number(project.radiusMeters);
  if (!inside && !appState.settings.allowCheckoutOutsideRange) {
    alert("الموقع خارج نطاق المشروع ولا يمكن تسجيل الانصراف.");
    return;
  }

  record.checkOutAt = new Date().toISOString();
  record.checkOutLocation = location;
  record.checkOutDistanceMeters = distance;
  record.status = inside ? "checked_out" : "checkout_outside";
  saveState();

  alert(inside ? "تم تسجيل الانصراف بنجاح." : "تم تسجيل الانصراف مع تنبيه: الموقع خارج نطاق المشروع.");
}

function setAdminTab(tab) {
  session.adminTab = tab;
  render();
}

function saveProject(projectId) {
  const project = projectById(projectId);
  if (!project) return;

  const name = document.getElementById(`project-${projectId}-name`).value.trim();
  const city = document.getElementById(`project-${projectId}-city`).value.trim();
  const district = document.getElementById(`project-${projectId}-district`).value.trim();
  const startTime = document.getElementById(`project-${projectId}-start`).value;
  const radiusMeters = Number(document.getElementById(`project-${projectId}-radius`).value);
  const lat = Number(document.getElementById(`project-${projectId}-lat`).value);
  const lng = Number(document.getElementById(`project-${projectId}-lng`).value);

  if (!name || !city || !district || !startTime) {
    alert("أكمل بيانات المشروع.");
    return;
  }

  if (!Number.isFinite(radiusMeters) || radiusMeters < 25) {
    alert("نصف قطر السماح يجب أن يكون 25 متر أو أكثر.");
    return;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    alert("أدخل إحداثيات صحيحة.");
    return;
  }

  Object.assign(project, {
    name,
    city,
    district,
    startTime,
    radiusMeters,
    lat,
    lng,
    note: "تم تحديث الإعدادات من لوحة الإدارة",
  });

  saveState();
  alert("تم حفظ إعدادات المشروع.");
  render();
}

function saveSystemSettings() {
  const adminPin = document.getElementById("settingsAdminPin").value.trim();
  const maxGpsAccuracyMeters = Number(document.getElementById("settingsMaxAccuracy").value);
  const allowManualLocation = document.getElementById("settingsManualLocation").checked;
  const allowCheckoutOutsideRange = document.getElementById("settingsCheckoutOutside").checked;
  const storeRejectedAttempts = document.getElementById("settingsRejectedAttempts").checked;

  if (!adminPin) {
    alert("رمز الإدارة مطلوب.");
    return;
  }

  if (!Number.isFinite(maxGpsAccuracyMeters) || maxGpsAccuracyMeters < 10) {
    alert("أقصى دقة GPS يجب أن تكون 10 متر أو أكثر.");
    return;
  }

  appState.settings = {
    ...appState.settings,
    adminPin,
    maxGpsAccuracyMeters,
    allowManualLocation,
    allowCheckoutOutsideRange,
    storeRejectedAttempts,
  };

  saveState();
  alert("تم حفظ إعدادات النظام.");
  render();
}

function setFilter(key, value) {
  session.filters[key] = value;
  render();
}

document.addEventListener("DOMContentLoaded", render);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // The app still works if the browser blocks service workers on local files.
    });
  });
}
