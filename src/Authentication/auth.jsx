// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const getAuthErrorMessage = (error) => {
  const code = error?.code;

  switch (code) {
    case "auth/configuration-not-found":
      return "Firebase Authentication is not configured correctly. Enable Email/Password sign-in in the Firebase console and verify your Firebase web config values.";
    case "auth/invalid-api-key":
      return "The Firebase API key is invalid. Check VITE_FIREBASE_API_KEY in your environment file.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is disabled in Firebase Authentication. Turn it on in the Firebase console under Authentication > Sign-in method.";
    case "auth/unauthorized-domain":
      return "This app domain is not authorized in Firebase Authentication. Add localhost or your current domain under Authentication > Settings > Authorized domains.";
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "The email or password is incorrect, or the account was created in a different Firebase project. Make sure the user exists in the same project configured in your app.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection and try again.";
    default:
      return error?.message || "Authentication failed. Please try again.";
  }
};

export const loginUser = (email, password) =>
  signInWithEmailAndPassword(auth, email.trim(), password);

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

export const logoutUser = () => signOut(auth);

// Export the observer to track login/logout state changes in React
export const subscribeToAuthChanges = (callback) => 
  onAuthStateChanged(auth, callback);
