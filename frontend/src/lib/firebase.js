import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "gather-bd64a.firebaseapp.com",
  projectId: "gather-bd64a",
  storageBucket: "gather-bd64a.firebasestorage.app",
  messagingSenderId: "770784241542",
  appId: "1:770784241542:web:6f449df66ebf77ed3dee07",
  measurementId: "G-X4HEVGF28C"
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

// Export the app (needed by FCM messaging) along with the services.
export { app, auth, db, googleProvider, storage };
