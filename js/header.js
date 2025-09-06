import { auth } from './firebase.js';
import { currentUserProfile, onLogoutClick } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

async function injectHeader() {
  const mount = document.getElementById('siteHeader');
  if (!mount) return;
  try {
    const res = await fetch('/views/header.html', { cache: 'no-store' });
    const html = await res.text();
    mount.innerHTML = html;
    try { document.body.classList.add('with-glass-header'); } catch {}
  } catch (e) {
    console.error('Failed to load header:', e);
  }
}

async function setupHeaderInteractions() {
  const btn = document.getElementById('profileMenuBtn');
  const menu = document.getElementById('profileMenu');
  const pmLoginLink = document.getElementById('pmLoginLink');
  const pmLogoutBtn = document.getElementById('pmLogoutBtn');
  const appLink = document.getElementById('hdrAppLink');
  const adminLink = document.getElementById('hdrAdminLink');
  if (!btn || !menu) return;

  const toggleMenu = () => menu.classList.toggle('hidden');
  btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleMenu(); });
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== btn) menu.classList.add('hidden');
  });
  if (pmLogoutBtn) pmLogoutBtn.addEventListener('click', (e) => { e.preventDefault(); menu.classList.add('hidden'); onLogoutClick(); });

  const update = async () => {
    const profile = await currentUserProfile();
    const loggedIn = !!profile;
    if (pmLoginLink) pmLoginLink.classList.toggle('hidden', loggedIn);
    if (pmLogoutBtn) pmLogoutBtn.classList.toggle('hidden', !loggedIn);
    if (appLink) appLink.classList.toggle('hidden', !loggedIn);
    if (adminLink) adminLink.classList.toggle('hidden', !(profile && profile.role === 'admin' && !profile.disabled));
  };

  onAuthStateChanged(auth, update);
  update();
}

(async function init() {
  await injectHeader();
  await setupHeaderInteractions();
})();
