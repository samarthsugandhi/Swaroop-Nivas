import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCCkUuPUQB7psSBxeTIKVLeYTajEQHzsG8",
  authDomain: "swaroop-nivas.firebaseapp.com",
  projectId: "swaroop-nivas",
  storageBucket: "swaroop-nivas.firebasestorage.app",
  messagingSenderId: "728969979293",
  appId: "1:728969979293:web:d903a49a2717f39701bb74",
  measurementId: "G-0SS799KGHQ",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
