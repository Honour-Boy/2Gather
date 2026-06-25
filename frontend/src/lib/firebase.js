import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "unicomm-2d7bc.firebaseapp.com",
  projectId: "unicomm-2d7bc",
  storageBucket: "unicomm-2d7bc.appspot.com",
  messagingSenderId: "1042138331910",
  appId: "1:1042138331910:web:2593196bc18f73e53ebc87",
  measurementId: "G-MJXW30T946"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth Service
const auth = getAuth(app);
// Initialize Firestore
const db = getFirestore(app);
// Initialize Firebase Storage Service
const storage = getStorage(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

console.log('Firebase initialized successfully.');

// Export auth and db
export { auth, db, googleProvider, storage };
