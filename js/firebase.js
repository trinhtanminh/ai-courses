// Firebase initialization (Web v10 modular via CDN)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

// Replace with the provided config
const firebaseConfig = {
  apiKey: "AIzaSyCBMwL7iwvw5hLlz4wSN5rDcxJvsPc3Lx4",
  authDomain: "ai-course-cf3cf.firebaseapp.com",
  projectId: "ai-course-cf3cf",
  storageBucket: "ai-course-cf3cf.firebasestorage.app",
  messagingSenderId: "223079976997",
  appId: "1:223079976997:web:a254e35b9e826419fdefcc",
  measurementId: "G-90F1H35LB4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

