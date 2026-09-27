import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyBjfhpyDeoSX_-AeOzTgobPLNKqV0DUBQ8",
  authDomain: "app-levelup-ecosystem.firebaseapp.com",
  projectId: "app-levelup-ecosystem",
  storageBucket: "app-levelup-ecosystem.firebasestorage.app",
  messagingSenderId: "338931284223",
  appId: "1:338931284223:web:33763b0f82bc98c8eff4ca",
  measurementId: "G-J73ZNS49L0",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
