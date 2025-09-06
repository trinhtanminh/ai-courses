import { db } from './firebase.js';
import { adminCreateUser } from './auth.js';
import { el, setChildren, bindResourceRows, collectResourceRows, bindVideoRows, collectVideoRows } from './components.admin.js';
import {
  collection, addDoc, getDocs, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDoc, arrayUnion, arrayRemove, getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export function setupAdminUsers({ tbody, rowTpl, addUserForm }) {
  // Create user
  addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(addUserForm);
    const email = fd.get('email');
    const password = fd.get('password');
    const role = fd.get('role');
    try {
      await adminCreateUser(email, password, role);
      addUserForm.reset();
      alert('Tạo người dùng thành công');
    } catch (e2) {
      alert('Lỗi tạo người dùng: ' + (e2.message || e2));
    }
  });

  // Live list users
  const usersCol = collection(db, 'users');
  onSnapshot(usersCol, (snap) => {
    tbody.innerHTML = '';
    snap.forEach((d) => {
      const u = d.data();
      const tr = rowTpl.content.cloneNode(true);
      tr.querySelector('.email').textContent = u.email || '';
      const roleSel = tr.querySelector('select.role');
      roleSel.value = u.role || 'student';
      roleSel.addEventListener('change', () => updateDoc(doc(db, 'users', u.uid), { role: roleSel.value }));
      tr.querySelector('.courses').textContent = (u.enrolledCourseIds || []).join(', ');
      tr.querySelector('.status').textContent = u.disabled ? 'Vô hiệu' : 'Hoạt động';
      const toggleBtn = tr.querySelector('button.toggle');
      toggleBtn.textContent = u.disabled ? 'Kích hoạt' : 'Vô hiệu';
      toggleBtn.addEventListener('click', async () => {
        await updateDoc(doc(db, 'users', u.uid), { disabled: !u.disabled });
      });
      tr.querySelector('button.remove').addEventListener('click', async () => {
        if (!confirm('Xoá HỒ SƠ người dùng khỏi Firestore? (Không xoá tài khoản Auth)')) return;
        await deleteDoc(doc(db, 'users', u.uid));
      });
      tr.querySelector('button.assign').addEventListener('click', async () => {
        const cid = prompt('Nhập ID khoá học để cấp cho user');
        if (!cid) return;
        await updateDoc(doc(db, 'users', u.uid), { enrolledCourseIds: arrayUnion(cid) });
      });
      tbody.appendChild(tr);
    });
  });
}

export function setupAdminCourses({ list, cardTpl, addCourseForm }) {
  addCourseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(addCourseForm);
    const title = fd.get('title');
    const description = fd.get('description');
    const ref = await addDoc(collection(db, 'courses'), {
      title, description, lessons: [], createdAt: Date.now(), updatedAt: Date.now()
    });
    addCourseForm.reset();
    alert('Đã tạo khoá học: ' + ref.id);
  });

  const coursesCol = collection(db, 'courses');
  onSnapshot(coursesCol, (snap) => {
    list.innerHTML = '';
    snap.forEach((d) => {
      const c = d.data();
      const card = cardTpl.content.cloneNode(true);
      card.querySelector('.title').textContent = c.title || '';
      card.querySelector('.desc').textContent = c.description || '';
      card.querySelector('.lessonsCount').textContent = `${(c.lessons?.length || 0)} bài học`;

      const lessonsWrap = card.querySelector('.lessons');
      lessonsWrap.innerHTML = '';
      (c.lessons || []).forEach((l, i) => {
        const row = document.createElement('div');
        row.className = 'flex items-start justify-between gap-2';
        const left = document.createElement('div');
        left.className = 'min-w-0';
        const title = document.createElement('div');
        title.className = 'text-sm';
        title.textContent = `${i + 1}. ${l.title}`;
        const preview = document.createElement('div');
        preview.className = 'text-xs text-gray-500 truncate max-w-[28rem]';
        if (l.content) preview.textContent = l.content;
        left.appendChild(title);
        left.appendChild(preview);
        const actions = document.createElement('div');
        actions.className = 'shrink-0 space-x-2';
        actions.innerHTML = `
          <button class="edit-lesson text-xs bg-gray-200 rounded px-2 py-1">Sửa</button>
          <button class="delete-lesson text-xs bg-gray-200 rounded px-2 py-1">Xoá</button>
        `;
        row.appendChild(left);
        row.appendChild(actions);
        row.querySelector('button.delete-lesson').addEventListener('click', async () => {
          const updated = (c.lessons || []).filter((_, idx) => idx !== i);
          await updateDoc(doc(db, 'courses', d.id), { lessons: updated, updatedAt: Date.now() });
        });
        row.querySelector('button.edit-lesson').addEventListener('click', () => {
          try { sessionStorage.setItem(`lessonEditIndex:${d.id}`, String(i)); } catch {}
          location.hash = `#courses/edit/${d.id}`;
        });
        lessonsWrap.appendChild(row);
      });

      const addLessonFormA = card.querySelector('form.addLesson');
      bindResourceRows(addLessonFormA);
      bindVideoRows(addLessonFormA);
      addLessonFormA.addEventListener('submit', async (e2) => {
        e2.preventDefault();
        const fd = new FormData(addLessonFormA);
        const title = (fd.get('title') || '').toString();
        const videos = collectVideoRows(addLessonFormA);
        const videoUrl = videos?.[0]?.url || '';
        const content = (fd.get('content') || '').toString();
        const notes = (fd.get('notes') || '').toString();
        const exercisesRaw = (fd.get('exercises') || '').toString();
        const splitMulti = (s) => s ? s.split(/[,\n]/).map(x => x.trim()).filter(Boolean) : [];
        const exercises = splitMulti(exercisesRaw);
        const resources = collectResourceRows(addLessonFormA);
        const updated = [
          ...(c.lessons || []),
          { id: crypto.randomUUID(), title, videos, videoUrl, content, notes, exercises, resources }
        ];
        await updateDoc(doc(db, 'courses', d.id), { lessons: updated, updatedAt: Date.now() });
        addLessonFormA.reset();
        bindResourceRows(addLessonFormA, { reset: true });
        bindVideoRows(addLessonFormA, { reset: true });
      });

      card.querySelector('button.delete').addEventListener('click', async () => {
        if (!confirm('Xoá khoá học này?')) return;
        await deleteDoc(doc(db, 'courses', d.id));
      });
      card.querySelector('button.edit').addEventListener('click', async () => {
        const newTitle = prompt('Tiêu đề', c.title || '');
        if (newTitle == null) return;
        const newDesc = prompt('Mô tả', c.description || '');
        await updateDoc(doc(db, 'courses', d.id), { title: newTitle, description: newDesc, updatedAt: Date.now() });
      });

      list.appendChild(card);
    });
  });
}

// =============== New Admin App (Sidebar + Router + CRUD views) ===============

// el, setChildren are imported from components.admin.js

function routeParts() {
  const hash = (location.hash || '#dashboard').replace(/^#/, '');
  return hash.split('/').filter(Boolean);
}

export function setupAdminApp({ view, tpl }) {
  async function render() {
    const [section, action, id] = routeParts();
    const allow = new Set(['users','courses','dashboard']);
    if (!allow.has(section || 'dashboard')) return; // ignore non-admin routes when embedded
    switch (section) {
      case 'users':
        if (action === 'add') return renderUserAdd(view);
        if (action === 'edit' && id) return renderUserEdit(view, id, tpl);
        return renderUsersList(view, tpl);
      case 'courses':
        if (action === 'add') return renderCourseAdd(view);
        if (action === 'edit' && id) return renderCourseEdit(view, id, tpl);
        return renderCoursesList(view, tpl);
      case 'dashboard':
      default:
        return renderDashboard(view);
    }
  }

  window.addEventListener('hashchange', render);
  render();
}

// =============== Dashboard ===============

export async function renderDashboard(root) {
  const usersAgg = await getCountFromServer(collection(db, 'users'));
  const coursesAgg = await getCountFromServer(collection(db, 'courses'));
  setChildren(root, el(`
    <div class="w-full">
      <h1 class="text-2xl font-semibold mb-4">Tổng quan</h1>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <div class="bg-white border rounded p-4">
          <div class="text-sm text-gray-500">Người dùng</div>
          <div class="text-2xl font-semibold">${usersAgg.data().count}</div>
        </div>
        <div class="bg-white border rounded p-4">
          <div class="text-sm text-gray-500">Khoá học</div>
          <div class="text-2xl font-semibold">${coursesAgg.data().count}</div>
        </div>
      </div>
    </div>
  `));
}

// =============== Users views ===============

export async function renderUsersList(root, tpl) {
  const container = el(`
    <div class="w-full">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">Người dùng</h1>
        <a href="#users/add" class="px-3 py-2 text-sm bg-blue-600 text-white rounded">Thêm người dùng</a>
      </div>
      <div class="w-full overflow-x-auto bg-white border rounded">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-100">
            <tr>
              <th class="text-left p-2">Email</th>
              <th class="text-left p-2">Vai trò</th>
              <th class="text-left p-2">Khoá học</th>
              <th class="text-left p-2">Trạng thái</th>
              <th class="text-left p-2">Hành động</th>
            </tr>
          </thead>
          <tbody id="usersTbody"></tbody>
        </table>
      </div>
    </div>
  `);
  setChildren(root, container);
  const tbody = container.querySelector('#usersTbody');
  const rowTpl = tpl.userRow;
  const usersCol = collection(db, 'users');
  onSnapshot(usersCol, (snap) => {
    tbody.innerHTML = '';
    snap.forEach((d) => {
      const u = d.data();
      const tr = rowTpl.content.cloneNode(true);
      tr.querySelector('.email').textContent = u.email || '';
      const roleSel = tr.querySelector('select.role');
      roleSel.value = u.role || 'student';
      roleSel.addEventListener('change', () => updateDoc(doc(db, 'users', u.uid), { role: roleSel.value }));
      tr.querySelector('.courses').textContent = (u.enrolledCourseIds || []).join(', ');
      tr.querySelector('.status').textContent = u.disabled ? 'Vô hiệu' : 'Hoạt động';
      const toggleBtn = tr.querySelector('button.toggle');
      toggleBtn.textContent = u.disabled ? 'Kích hoạt' : 'Vô hiệu';
      toggleBtn.addEventListener('click', async () => {
        await updateDoc(doc(db, 'users', u.uid), { disabled: !u.disabled });
      });
      tr.querySelector('button.remove').addEventListener('click', async () => {
        if (!confirm('Xoá HỒ SƠ người dùng khỏi Firestore? (Không xoá tài khoản Auth)')) return;
        await deleteDoc(doc(db, 'users', u.uid));
      });
      tr.querySelector('button.assign').addEventListener('click', async () => {
        const cid = prompt('Nhập ID khoá học để cấp cho user');
        if (!cid) return;
        await updateDoc(doc(db, 'users', u.uid), { enrolledCourseIds: arrayUnion(cid) });
      });
      const editBtn = tr.querySelector('button.edit');
      if (editBtn) editBtn.addEventListener('click', () => { location.hash = `#users/edit/${u.uid}`; });
      tbody.appendChild(tr);
    });
  });
}

export async function renderUserAdd(root) {
  const node = el(`
    <div class="w-full">
      <h1 class="text-2xl font-semibold mb-4">Thêm người dùng</h1>
      <form class="w-full grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border rounded p-4">
        <input name="email" type="email" placeholder="Email" class="border rounded px-3 py-2" required />
        <input name="password" type="password" placeholder="Mật khẩu tạm" class="border rounded px-3 py-2" required />
        <select name="role" class="border rounded px-3 py-2">
          <option value="student">student</option>
          <option value="admin">admin</option>
        </select>
        <button class="bg-blue-600 text-white rounded px-4">Tạo</button>
      </form>
      <div class="mt-4"><a class="text-sm text-gray-600 hover:underline" href="#users/list">Quay lại danh sách</a></div>
    </div>
  `);
  setChildren(root, node);
  const form = node.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      await adminCreateUser(fd.get('email'), fd.get('password'), fd.get('role'));
      alert('Tạo người dùng thành công');
      location.hash = '#users/list';
    } catch (e2) {
      alert('Lỗi tạo người dùng: ' + (e2.message || e2));
    }
  });
}

export async function renderUserEdit(root, uid, tpl) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    setChildren(root, el('<div class="text-red-600">Không tìm thấy người dùng</div>'));
    return;
  }
  const u = snap.data();
  const node = tpl.userEdit.content.cloneNode(true);
  node.querySelector('.uid').textContent = uid;
  const form = node.querySelector('form');
  const email = form.querySelector('input[name="email"]');
  const role = form.querySelector('select[name="role"]');
  const disabled = form.querySelector('input[name="disabled"]');
  const addCourseBtn = form.querySelector('button.addCourse');
  const courseIdInput = form.querySelector('input[name="courseId"]');
  const coursesWrap = form.querySelector('.courses');
  email.value = u.email || '';
  role.value = u.role || 'student';
  disabled.checked = !!u.disabled;

  function renderCourses(list) {
    coursesWrap.innerHTML = '';
    (list || []).forEach((cid) => {
      const tag = el(`<span class="inline-flex items-center gap-2 bg-gray-100 rounded px-2 py-1 mr-2 mb-2">${cid}<button title="Gỡ" class="text-rose-600">×</button></span>`);
      tag.querySelector('button').addEventListener('click', async () => {
        await updateDoc(ref, { enrolledCourseIds: arrayRemove(cid) });
        const fresh = (await getDoc(ref)).data();
        renderCourses(fresh.enrolledCourseIds || []);
      });
      coursesWrap.appendChild(tag);
    });
  }
  renderCourses(u.enrolledCourseIds || []);

  addCourseBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const cid = (courseIdInput.value || '').trim();
    if (!cid) return;
    await updateDoc(ref, { enrolledCourseIds: arrayUnion(cid) });
    courseIdInput.value = '';
    const fresh = (await getDoc(ref)).data();
    renderCourses(fresh.enrolledCourseIds || []);
  });

  form.querySelector('button.save').addEventListener('click', async (e) => {
    e.preventDefault();
    await updateDoc(ref, { role: role.value, disabled: disabled.checked });
    alert('Đã lưu');
    location.hash = '#users/list';
  });

  setChildren(root, node);
}

// =============== Helpers: dynamic Resources rows ===============
// bindResourceRows, collectResourceRows are imported from components.admin.js

// =============== Courses views ===============

export async function renderCoursesList(root, tpl) {
  const node = el(`
    <div>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">Khoá học</h1>
        <a href="#courses/add" class="px-3 py-2 text-sm bg-green-600 text-white rounded">Thêm khoá học</a>
      </div>
      <div id="list" class="grid grid-cols-1 lg:grid-cols-2 gap-4"></div>
    </div>
  `);
  setChildren(root, node);
  const list = node.querySelector('#list');

  const coursesCol = collection(db, 'courses');
  onSnapshot(coursesCol, (snap) => {
    list.innerHTML = '';
    snap.forEach((d) => {
      const c = d.data();
      const card = tpl.courseCard.content.cloneNode(true);
      card.querySelector('.title').textContent = c.title || '';
      card.querySelector('.desc').textContent = c.description || '';
      const idEl = card.querySelector('.cid');
      if (idEl) idEl.textContent = d.id;
      card.querySelector('.lessonsCount').textContent = `${(c.lessons?.length || 0)} bài học`;

      const lessonsWrap = card.querySelector('.lessons');
      lessonsWrap.innerHTML = '';
      (c.lessons || []).forEach((l, i) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2';
        row.innerHTML = `
          <span class="text-sm">${i + 1}. ${l.title}</span>
          <button class="edit-lesson text-xs bg-gray-200 rounded px-2 py-1">Sửa</button>
          <button class="delete-lesson text-xs bg-gray-200 rounded px-2 py-1">Xoá</button>
        `;
        row.querySelector('button.delete-lesson').addEventListener('click', async () => {
          const updated = (c.lessons || []).filter((_, idx) => idx !== i);
          await updateDoc(doc(db, 'courses', d.id), { lessons: updated, updatedAt: Date.now() });
        });
        row.querySelector('button.edit-lesson').addEventListener('click', () => {
          try { sessionStorage.setItem(`lessonEditIndex:${d.id}`, String(i)); } catch {}
          location.hash = `#courses/edit/${d.id}`;
        });
        lessonsWrap.appendChild(row);
      });

      const addLessonFormB = card.querySelector('form.addLesson');
      bindResourceRows(addLessonFormB);
      bindVideoRows(addLessonFormB);
      addLessonFormB.addEventListener('submit', async (e2) => {
        e2.preventDefault();
        const fd = new FormData(addLessonFormB);
        const title = (fd.get('title') || '').toString();
        const videos = collectVideoRows(addLessonFormB);
        const videoUrl = videos?.[0]?.url || '';
        const content = (fd.get('content') || '').toString();
        const notes = (fd.get('notes') || '').toString();
        const exercisesRaw = (fd.get('exercises') || '').toString();
        const splitMulti = (s) => s ? s.split(/[\,\n]/).map(x => x.trim()).filter(Boolean) : [];
        const exercises = splitMulti(exercisesRaw);
        const resources = collectResourceRows(addLessonFormB);
        const updated = [
          ...(c.lessons || []),
          { id: crypto.randomUUID(), title, videos, videoUrl, content, notes, exercises, resources }
        ];
        await updateDoc(doc(db, 'courses', d.id), { lessons: updated, updatedAt: Date.now() });
        addLessonFormB.reset();
        bindResourceRows(addLessonFormB, { reset: true });
        bindVideoRows(addLessonFormB, { reset: true });
      });

      card.querySelector('button.delete').addEventListener('click', async () => {
        if (!confirm('Xoá khoá học này?')) return;
        await deleteDoc(doc(db, 'courses', d.id));
      });
      card.querySelector('button.edit').addEventListener('click', async () => {
        location.hash = `#courses/edit/${d.id}`;
      });

      list.appendChild(card);
    });
  });
}

export async function renderCourseAdd(root) {
  const node = el(`
    <div>
      <h1 class="text-2xl font-semibold mb-4">Thêm khoá học</h1>
      <form class="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white border rounded p-4">
        <input name="title" type="text" placeholder="Tiêu đề" class="border rounded px-3 py-2" required />
        <input name="description" type="text" placeholder="Mô tả ngắn" class="border rounded px-3 py-2" required />
        <input name="coverUrl" type="url" placeholder="Link ảnh bìa (https://...)" class="border rounded px-3 py-2" />
        <button class="bg-green-600 text-white rounded px-4">Tạo</button>
        <div class="md:col-span-3 text-xs text-gray-500">Sau khi tạo, chuyển sang màn chỉnh sửa để thêm bài học.</div>
      </form>
      <div class="mt-4"><a class="text-sm text-gray-600 hover:underline" href="#courses/list">Quay lại danh sách</a></div>
    </div>
  `);
  setChildren(root, node);
  const form = node.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const title = fd.get('title');
    const description = fd.get('description');
    const coverUrl = (fd.get('coverUrl') || '').toString().trim();
    const ref = await addDoc(collection(db, 'courses'), {
      title, description, coverUrl, lessons: [], createdAt: Date.now(), updatedAt: Date.now()
    });
    alert('Đã tạo khoá học: ' + ref.id);
    location.hash = `#courses/edit/${ref.id}`;
  });
}

export async function renderCourseEdit(root, id, tpl) {
  const ref = doc(db, 'courses', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    setChildren(root, el('<div class="text-red-600">Không tìm thấy khoá học</div>'));
    return;
  }
  const c = snap.data();
  const node = tpl.courseEdit.content.cloneNode(true);
  const idEl = node.querySelector('.cid');
  if (idEl) idEl.textContent = id;
  const form = node.querySelector('form');
  const title = form.querySelector('input[name="title"]');
  const desc = form.querySelector('input[name="description"]');
  const cover = form.querySelector('input[name="coverUrl"]');
  const lessonsWrap = form.querySelector('.lessons');
  const addLessonForm = form.querySelector('form.addLesson');
  bindResourceRows(addLessonForm);
  bindVideoRows(addLessonForm);
  title.value = c.title || '';
  desc.value = c.description || '';
  if (cover) cover.value = c.coverUrl || '';

  let editIndex = null; // index of lesson being edited
  function renderLessons(list) {
    lessonsWrap.innerHTML = '';
    (list || []).forEach((l, i) => {
      const row = el(`<div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="text-sm">${i + 1}. ${l.title}</div>
          <div class="text-xs text-gray-500 truncate max-w-[28rem]">${(l.content || '')}</div>
        </div>
        <div class="shrink-0 space-x-2">
          <button class="edit text-xs bg-gray-200 rounded px-2 py-1">Sửa</button>
          <button class="delete text-xs bg-gray-200 rounded px-2 py-1">Xoá</button>
        </div>
      </div>`);
      row.querySelector('button.delete').addEventListener('click', async () => {
        const updated = (list || []).filter((_, idx) => idx !== i);
        await updateDoc(ref, { lessons: updated, updatedAt: Date.now() });
        const fresh = (await getDoc(ref)).data();
        renderLessons(fresh.lessons || []);
      });
      row.querySelector('button.edit').addEventListener('click', async () => {
        const fresh = (await getDoc(ref)).data();
        const target = (fresh.lessons || [])[i];
        if (!target) return;
        enterEdit(i, target);
      });
      lessonsWrap.appendChild(row);
    });
  }
  renderLessons(c.lessons || []);

  // Helper to prefill the addLesson form for editing
  function enterEdit(index, lesson) {
    editIndex = index;
    addLessonForm.dataset.editIndex = String(index);
    // Title/content/notes/exercises
    addLessonForm.querySelector('input[name="title"]').value = lesson.title || '';
    addLessonForm.querySelector('textarea[name="content"]').value = lesson.content || '';
    addLessonForm.querySelector('textarea[name="notes"]').value = lesson.notes || '';
    const exercisesArea = addLessonForm.querySelector('textarea[name="exercises"]');
    exercisesArea.value = (lesson.exercises || []).join('\n');

    // Videos
    const videosWrap = addLessonForm.querySelector('.videosRows');
    videosWrap.innerHTML = '';
    (lesson.videos || [{ url: lesson.videoUrl, title: '' }]).filter(v => v && v.url).forEach(v => {
      const row = document.createElement('div');
      row.className = 'videoRow grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-2';
      row.innerHTML = `
        <input name="vidTitle" class="border rounded px-2 py-1" placeholder="Tiêu đề video" />
        <input name="vidUrl" class="border rounded px-2 py-1" placeholder="Link video (YouTube, Google Drive, ... )" />
        <button type="button" class="removeVideo text-xs bg-gray-200 rounded px-2">×</button>
      `;
      row.querySelector('.removeVideo').addEventListener('click', () => row.remove());
      row.querySelector('input[name="vidTitle"]').value = v.title || '';
      row.querySelector('input[name="vidUrl"]').value = v.url || '';
      videosWrap.appendChild(row);
    });
    if (!videosWrap.querySelector('.videoRow')) bindVideoRows(addLessonForm, { reset: true });

    // Resources
    const resourcesWrap = addLessonForm.querySelector('.resourcesRows');
    resourcesWrap.innerHTML = '';
    (lesson.resources || []).forEach(r => {
      const row = document.createElement('div');
      row.className = 'resourceRow grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-2';
      row.innerHTML = `
        <input name="resTitle" class="border rounded px-2 py-1" placeholder="Tiêu đề tài liệu" />
        <input name="resUrl" class="border rounded px-2 py-1" placeholder="Link tài liệu" />
        <button type="button" class="removeResource text-xs bg-gray-200 rounded px-2">×</button>
      `;
      row.querySelector('.removeResource').addEventListener('click', () => row.remove());
      row.querySelector('input[name="resTitle"]').value = r.title || '';
      row.querySelector('input[name="resUrl"]').value = r.url || '';
      resourcesWrap.appendChild(row);
    });
    if (!resourcesWrap.querySelector('.resourceRow')) bindResourceRows(addLessonForm, { reset: true });

    // Update button label and show cancel
    const actionWrap = addLessonForm.querySelector('.md\\:col-span-2:last-child') || addLessonForm.querySelector('.md:col-span-2:last-child');
    const submitBtn = addLessonForm.querySelector('button[type="submit"], .bg-blue-600');
    if (submitBtn) submitBtn.textContent = 'Lưu bài học';
    let cancelBtn = addLessonForm.querySelector('button.cancelEdit');
    if (!cancelBtn) {
      cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'cancelEdit ml-2 bg-gray-200 rounded px-3';
      cancelBtn.textContent = 'Huỷ sửa';
      (actionWrap || submitBtn?.parentElement || addLessonForm).appendChild(cancelBtn);
      cancelBtn.addEventListener('click', () => exitEdit());
    } else {
      cancelBtn.style.display = '';
    }
  }

  function exitEdit() {
    editIndex = null;
    delete addLessonForm.dataset.editIndex;
    addLessonForm.reset();
    bindResourceRows(addLessonForm, { reset: true });
    bindVideoRows(addLessonForm, { reset: true });
    const submitBtn = addLessonForm.querySelector('button[type="submit"], .bg-blue-600');
    if (submitBtn) submitBtn.textContent = 'Thêm bài học';
    const cancelBtn = addLessonForm.querySelector('button.cancelEdit');
    if (cancelBtn) cancelBtn.style.display = 'none';
  }

  addLessonForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(addLessonForm);
    const lt = (fd.get('title') || '').toString();
    const vids = collectVideoRows(addLessonForm);
    const lv = vids?.[0]?.url || '';
    const lc = (fd.get('content') || '').toString();
    const ln = (fd.get('notes') || '').toString();
    const leRaw = (fd.get('exercises') || '').toString();
    const splitMulti = (s) => s ? s.split(/[,\n]/).map(x => x.trim()).filter(Boolean) : [];
    const le = splitMulti(leRaw);
    const lr = collectResourceRows(addLessonForm);
    const curr = (await getDoc(ref)).data();
    let updated;
    if (editIndex !== null && editIndex !== undefined) {
      // Update existing lesson
      updated = (curr.lessons || []).map((item, idx) => {
        if (idx !== editIndex) return item;
        return {
          id: item?.id || crypto.randomUUID(),
          title: lt,
          videos: vids,
          videoUrl: lv,
          content: lc,
          notes: ln,
          exercises: le,
          resources: lr
        };
      });
    } else {
      // Add new lesson
      updated = [
        ...(curr.lessons || []),
        { id: crypto.randomUUID(), title: lt, videos: vids, videoUrl: lv, content: lc, notes: ln, exercises: le, resources: lr }
      ];
    }
    await updateDoc(ref, { lessons: updated, updatedAt: Date.now() });
    exitEdit();
    const fresh = (await getDoc(ref)).data();
    renderLessons(fresh.lessons || []);
  });

  form.querySelector('button.save').addEventListener('click', async (e) => {
    e.preventDefault();
    await updateDoc(ref, { title: title.value, description: desc.value, coverUrl: cover?.value || '', updatedAt: Date.now() });
    alert('Đã lưu');
    location.hash = '#courses/list';
  });

  setChildren(root, node);

  // If navigated from list with an edit index queued, open edit mode for that lesson
  try {
    const idxStr = sessionStorage.getItem(`lessonEditIndex:${id}`);
    if (idxStr != null) {
      sessionStorage.removeItem(`lessonEditIndex:${id}`);
      const idx = parseInt(idxStr, 10);
      const fresh = (await getDoc(ref)).data();
      const l = (fresh.lessons || [])[idx];
      if (l) enterEdit(idx, l);
    }
  } catch {}
}
