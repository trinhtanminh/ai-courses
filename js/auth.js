import { auth, db, app } from './firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  getAuth
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc, getDoc, setDoc, serverTimestamp, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { initializeApp as initApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';

// Bootstrap allowlist for admin accounts
const ADMIN_EMAILS = new Set([
  'antonyminh2025@gmail.com'
]);

export async function loginWithEmail(email, password) {
  const e = (email || '').trim();
  const p = (password || '').trim();
  if (!e) throw Object.assign(new Error('Vui lòng nhập email'), { code: 'auth/invalid-email' });
  if (!p) throw Object.assign(new Error('Vui lòng nhập mật khẩu'), { code: 'auth/missing-password' });
  const cred = await signInWithEmailAndPassword(auth, e, p);
  await ensureUserProfile(cred.user);
}

export async function registerWithEmail(email, password) {
  const e = (email || '').trim();
  const p = (password || '').trim();
  if (!e) throw Object.assign(new Error('Vui lòng nhập email'), { code: 'auth/invalid-email' });
  if (!p) throw Object.assign(new Error('Vui lòng nhập mật khẩu'), { code: 'auth/missing-password' });
  const cred = await createUserWithEmailAndPassword(auth, e, p);
  await ensureUserProfile(cred.user);
}

export async function sendResetLink(email) {
  const e = (email || '').trim();
  if (!e) throw new Error('Nhập email để nhận liên kết đặt lại mật khẩu');
  return sendPasswordResetEmail(auth, e);
}

export async function onLogoutClick() {
  await signOut(auth);
  location.href = './';
}

export async function ensureUserProfile(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      role: ADMIN_EMAILS.has(user.email) ? 'admin' : 'student',
      enrolledCourseIds: [],
      disabled: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    // touch updatedAt
    const data = snap.data();
    const updates = { updatedAt: serverTimestamp() };
    if (ADMIN_EMAILS.has(user.email) && data.role !== 'admin') {
      updates.role = 'admin';
    }
    await updateDoc(ref, updates);
  }
}

export function currentUser() {
  return auth.currentUser;
}

export function currentUserProfile() {
  const u = auth.currentUser;
  if (!u) return Promise.resolve(null);
  return getDoc(doc(db, 'users', u.uid)).then(s => s.exists() ? s.data() : null);
}

export async function requireAuth(redirectTo = './login.html') {
  if (auth.currentUser) return auth.currentUser;
  await new Promise((resolve) => onAuthStateChanged(auth, () => resolve()));
  if (!auth.currentUser) {
    location.href = redirectTo;
    return Promise.reject('redirect');
  }
  return auth.currentUser;
}

export async function requireAdmin(redirectTo = './login.html') {
  await requireAuth(redirectTo);
  const profile = await currentUserProfile();
  if (!profile || profile.role !== 'admin' || profile.disabled) {
    alert('Chỉ quản trị viên mới được truy cập.');
    location.href = './';
    throw new Error('not_admin');
  }
}

export function showAdminLinkIfAdmin(el, profile) {
  if (profile && profile.role === 'admin' && !profile.disabled) el.classList.remove('hidden');
  else el.classList.add('hidden');
}

// Admin can create user via secondary app (will not switch current session)
export async function adminCreateUser(email, password, role = 'student') {
  // NOTE: This relies on password sign-up being enabled. It signs in on secondary app only.
  const e = (email || '').trim();
  const p = (password || '').trim();
  if (!e) throw Object.assign(new Error('Vui lòng nhập email'), { code: 'auth/invalid-email' });
  if (!p) throw Object.assign(new Error('Vui lòng nhập mật khẩu'), { code: 'auth/missing-password' });
  const secondary = initApp(app.options, 'secondary');
  const secondaryAuth = getAuth(secondary);
  const cred = await createUserWithEmailAndPassword(secondaryAuth, e, p);
  const u = cred.user;
  await setDoc(doc(db, 'users', u.uid), {
    uid: u.uid,
    email: u.email,
    displayName: '',
    role,
    enrolledCourseIds: [],
    disabled: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  // Use modular signOut API for the secondary app session
  await signOut(secondaryAuth);
  return u.uid;
}
