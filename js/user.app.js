import { requireAuth, currentUserProfile } from './auth.js';
import { listCoursesWithHref, listEnrolledWithProgress, loadCourseAndRender } from './courses.js';

function routeParts() {
  const hash = (location.hash || '#home').replace(/^#/, '');
  return hash.split('/').filter(Boolean);
}

function set(el, html) { el.innerHTML = html; return el; }

async function renderHome(view) {
  set(view, `
    <h1 class="text-2xl font-semibold mb-6">Danh sách khoá học</h1>
    <div id="coursesList" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
  `);
  await listCoursesWithHref(document.getElementById('coursesList'), (id) => `#course/${id}`);
}

async function renderDashboard(view) {
  await requireAuth('/login.html');
  set(view, `
    <h1 class="text-2xl font-semibold mb-6">Khoá học của tôi</h1>
    <div id="enrolledList" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10"></div>
    <h2 class="text-xl font-semibold mb-4">Tất cả khoá học</h2>
    <div id="allCourses" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
  `);
  await listEnrolledWithProgress(document.getElementById('enrolledList'), (id) => `#course/${id}`);
  await listCoursesWithHref(document.getElementById('allCourses'), (id) => `#course/${id}`);
}

async function renderCourse(view, id) {
  await requireAuth('/login.html');
  set(view, `
    <div class="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6">
      <div class="user-scroll">
        <div id="courseHeader" class="glass-card p-4 mb-6">
          <h1 id="courseTitle" class="text-2xl font-semibold"></h1>
          <p id="courseDesc" class="text-gray-600 mt-1"></p>
        </div>
        <section>
          <ol id="lessons" class="space-y-3"></ol>
        </section>
      </div>
      <aside class="glass-card p-4 user-outline">
        <div class="text-sm font-semibold mb-2">Outline</div>
        <ol id="outlineList" class="text-sm space-y-1"></ol>
      </aside>
    </div>
  `);
  await loadCourseAndRender(id, {
    titleEl: document.getElementById('courseTitle'),
    descEl: document.getElementById('courseDesc'),
    listEl: document.getElementById('lessons'),
    outlineEl: document.getElementById('outlineList')
  });
}

async function renderProfile(view) {
  await requireAuth('/login.html');
  const p = await currentUserProfile();
  const fields = [
    { k: 'Email', v: p?.email || '' },
    { k: 'Tên hiển thị', v: p?.displayName || '' },
    { k: 'Vai trò', v: p?.role || 'student' },
    { k: 'Trạng thái', v: p?.disabled ? 'Vô hiệu' : 'Hoạt động' }
  ];
  const items = fields.map(f => `<div class="flex items-center justify-between border-t py-2"><div class="text-sm text-gray-600">${f.k}</div><div class="text-sm font-medium">${f.v}</div></div>`).join('');
  set(view, `
    <div class="grid grid-cols-1 gap-6">
      <div class="user-scroll">
        <div class="glass-card p-4">
          <h1 class="text-xl font-semibold mb-2">Hồ sơ</h1>
          <p class="text-sm text-gray-600 mb-4">Thông tin tài khoản của bạn</p>
          <div class="bg-white/70 border rounded p-4">
            ${items}
          </div>
        </div>
      </div>
    </div>
  `);
}

export function setupUserApp() {
  const view = document.getElementById('view');

  async function render() {
    const [section, id] = routeParts();
    // Skip rendering if route is for admin area (users/courses)
    if (section === 'users' || section === 'courses') return;
    switch (section) {
      case 'dashboard':
        return renderDashboard(view);
      case 'profile':
        return renderProfile(view);
      case 'courses':
      case 'home':
      case '':
        return renderHome(view);
      case 'course':
        if (id) return renderCourse(view, id);
        return renderHome(view);
      default:
        return renderHome(view);
    }
  }

  const highlight = () => {
    const curr = location.hash || '#home';
    document.querySelectorAll('aside .nav-pill').forEach(a => {
      const href = a.getAttribute('href') || '';
      a.classList.toggle('active', href === curr);
    });
  };

  window.addEventListener('hashchange', () => { render(); highlight(); });
  render();
  highlight();
}
