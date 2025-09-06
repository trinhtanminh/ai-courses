import { auth, db } from './firebase.js';
import {
  collection, getDocs, doc, getDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { courseCard, enrolledCard, lessonItem } from './components.user.js';

// Render all courses
export async function listCourses(container) {
  // Only show courses for authenticated users who are enrolled.
  const u = auth.currentUser;
  container.innerHTML = '';
  if (!u) {
    // Not logged in: do not show any course cards
    const msg = document.createElement('div');
    msg.className = 'text-sm text-gray-600';
    msg.textContent = 'Vui lòng đăng nhập để xem khoá học được cấp.';
    container.appendChild(msg);
    return;
  }
  const profileSnap = await getDoc(doc(db, 'users', u.uid));
  const enrolled = (profileSnap.exists() ? (profileSnap.data().enrolledCourseIds || []) : []);
  if (!enrolled.length) {
    const msg = document.createElement('div');
    msg.className = 'text-sm text-gray-600';
    msg.textContent = 'Bạn chưa được cấp khoá học nào.';
    container.appendChild(msg);
    return;
  }
  for (const cid of enrolled) {
    const cdoc = await getDoc(doc(db, 'courses', cid));
    if (!cdoc.exists()) continue;
    const node = courseCard(cdoc.data(), `/course.html?id=${cid}`);
    container.appendChild(node);
  }
}

// Render all courses with custom link builder (for SPA routes)
export async function listCoursesWithHref(container, makeHref) {
  // Only show courses for authenticated users who are enrolled.
  const u = auth.currentUser;
  container.innerHTML = '';
  if (!u) {
    const msg = document.createElement('div');
    msg.className = 'text-sm text-gray-600';
    msg.textContent = 'Vui lòng đăng nhập để xem khoá học được cấp.';
    container.appendChild(msg);
    return;
  }
  const profileSnap = await getDoc(doc(db, 'users', u.uid));
  const enrolled = (profileSnap.exists() ? (profileSnap.data().enrolledCourseIds || []) : []);
  if (!enrolled.length) {
    const msg = document.createElement('div');
    msg.className = 'text-sm text-gray-600';
    msg.textContent = 'Bạn chưa được cấp khoá học nào.';
    container.appendChild(msg);
    return;
  }
  for (const cid of enrolled) {
    const cdoc = await getDoc(doc(db, 'courses', cid));
    if (!cdoc.exists()) continue;
    const c = cdoc.data();
    const href = typeof makeHref === 'function' ? makeHref(cid, c) : `/course.html?id=${cid}`;
    const node = courseCard(c, href);
    container.appendChild(node);
  }
}

// List enrolled courses with progress for current user
export async function listEnrolledWithProgress(container, makeHref) {
  const u = auth.currentUser;
  if (!u) return;
  const profileSnap = await getDoc(doc(db, 'users', u.uid));
  const profile = profileSnap.data();
  const enrolled = profile?.enrolledCourseIds || [];
  container.innerHTML = '';
  for (const cid of enrolled) {
    const c = await getDoc(doc(db, 'courses', cid));
    if (!c.exists()) continue;
    const data = c.data();
    const progress = await getProgressPercent(cid, data);
    const href = typeof makeHref === 'function' ? makeHref(cid, data) : `/course.html?id=${cid}`;
    const node = enrolledCard(data, progress, href);
    container.appendChild(node);
  }
}

export async function getProgressPercent(courseId, courseData) {
  const u = auth.currentUser;
  if (!u) return 0;
  const psnap = await getDoc(doc(db, 'users', u.uid, 'progress', courseId));
  const comp = psnap.exists() ? psnap.data().completedLessonIds || [] : [];
  const total = courseData?.lessons?.length || 0;
  if (!total) return 0;
  return Math.round((comp.length / total) * 100);
}

// Course view & progress tracking
export async function loadCourseAndRender(courseId, { titleEl, descEl, listEl, outlineEl }) {
  // Ensure user has access to this course
  const u = auth.currentUser;
  if (!u) {
    titleEl.textContent = 'Vui lòng đăng nhập để xem khoá học';
    return;
  }
  const profSnap = await getDoc(doc(db, 'users', u.uid));
  const enrolled = profSnap.exists() ? (profSnap.data().enrolledCourseIds || []) : [];
  if (!enrolled.includes(courseId)) {
    titleEl.textContent = 'Bạn chưa được cấp quyền cho khoá học này';
    descEl.textContent = '';
    if (listEl) listEl.innerHTML = '';
    if (outlineEl) outlineEl.innerHTML = '';
    return;
  }
  const snap = await getDoc(doc(db, 'courses', courseId));
  if (!snap.exists()) {
    titleEl.textContent = 'Khoá học không tồn tại';
    return;
  }
  const c = snap.data();
  titleEl.textContent = c.title;
  descEl.textContent = c.description || '';
  listEl.innerHTML = '';

  const progressRef = doc(db, 'users', u.uid, 'progress', courseId);
  const progSnap = await getDoc(progressRef);
  let completed = new Set(progSnap.exists() ? (progSnap.data().completedLessonIds || []) : []);

  if (outlineEl) outlineEl.innerHTML = '';
  const outlineItems = [];
  for (const [idx, l] of (c.lessons || []).entries()) {
    const node = lessonItem(l, idx, completed.has(l.id || String(idx)), async (isChecked) => {
      if (isChecked) completed.add(l.id || String(idx));
      else completed.delete(l.id || String(idx));
      await setDoc(progressRef, { completedLessonIds: Array.from(completed) }, { merge: true });
    });
    listEl.appendChild(node);
    if (outlineEl) {
      const base = `lesson-${idx + 1}`;
      const wrap = document.createElement('li');
      wrap.className = 'space-y-1';
      const topBtn = document.createElement('button');
      topBtn.type = 'button';
      topBtn.className = 'w-full text-left px-2 py-1 rounded hover:bg-gray-100';
      topBtn.innerHTML = `<span class="num text-gray-500 mr-2">${idx + 1}.</span><span class="title truncate">${l.title || ''}</span>`;
      topBtn.addEventListener('click', () => {
        const target = document.getElementById(base);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      const sub = document.createElement('ol');
      sub.className = 'ml-3 space-y-1';
      const addSub = (label, id) => {
        const li = document.createElement('li');
        li.innerHTML = `<button type="button" class="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-gray-700">${label}</button>`;
        li.querySelector('button').addEventListener('click', () => {
          const t = document.getElementById(id);
          const target = t || document.getElementById(base);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        sub.appendChild(li);
      };

      const hasVideos = (Array.isArray(l.videos) && l.videos.length) || l.videoUrl;
      if (hasVideos) addSub('Video', `${base}-video`);
      if (l.content) addSub('Nội dung', `${base}-content`);
      if (l.notes) addSub('Ghi chú', `${base}-notes`);
      if (Array.isArray(l.exercises) && l.exercises.length) addSub('Bài tập', `${base}-exercises`);
      if (Array.isArray(l.resources) && l.resources.length) addSub('Tài liệu', `${base}-resources`);

      wrap.appendChild(topBtn);
      if (sub.children.length) wrap.appendChild(sub);
      outlineEl.appendChild(wrap);
      outlineItems.push(wrap);
    }
  }

  // Optional: highlight current section while scrolling
  if (outlineEl && outlineItems.length) {
    const items = outlineItems.map((li, i) => ({ el: li.querySelector('button'), idx: i }));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const id = e.target.id || '';
        const m = id.match(/^lesson-(\d+)$/);
        if (!m) return;
        const i = parseInt(m[1], 10) - 1;
        if (isNaN(i) || !items[i]) return;
        items[i].el.classList.toggle('bg-indigo-50', e.isIntersecting && e.intersectionRatio > 0.4);
        items[i].el.classList.toggle('ring-1', e.isIntersecting && e.intersectionRatio > 0.4);
        items[i].el.classList.toggle('ring-blue-200', e.isIntersecting && e.intersectionRatio > 0.4);
      });
    }, { root: null, threshold: [0.4] });
    Array.from(listEl.children).forEach((li) => observer.observe(li));
  }
}
