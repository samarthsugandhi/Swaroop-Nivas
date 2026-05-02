import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase";

export const signIn = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const signOut = () => firebaseSignOut(auth);

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);
