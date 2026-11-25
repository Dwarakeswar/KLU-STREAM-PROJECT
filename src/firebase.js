import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAl5Y2GTNC82ufdeE_UUAJBXt8s-uREZYg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "klu-stream.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "klu-stream",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "klu-stream.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "145041141911",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:145041141911:web:7b1be983c1663f83fef9d2"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
