import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy_DEV_PLACEHOLDER_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "app-levelup-ecosystem.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "app-levelup-ecosystem",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "app-levelup-ecosystem.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "338931284223",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:338931284223:web:33763b0f82bc98c8eff4ca",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-J73ZNS49L0",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
