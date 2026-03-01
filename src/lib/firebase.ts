import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBMEKL1PpbtIKVyaQlKh9NN8_b-dQCPLec",
  authDomain: "realusers-d9a24.firebaseapp.com",
  projectId: "realusers-d9a24",
  storageBucket: "realusers-d9a24.firebasestorage.app",
  messagingSenderId: "645039391908",
  appId: "1:645039391908:web:2490334d6655d827e2d231"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
