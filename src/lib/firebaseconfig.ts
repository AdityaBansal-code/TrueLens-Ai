import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBnefmmXXYf-wkt6OyZu9dQtTwWPs9CseA",
  authDomain: "true-lens-b935c.firebaseapp.com",
  projectId: "true-lens-b935c",
  storageBucket: "true-lens-b935c.firebasestorage.app",
  messagingSenderId: "203852515293",
  appId: "1:203852515293:web:160c00b49e28eceb38d834",
  measurementId: "G-8NLKR9NGK5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);