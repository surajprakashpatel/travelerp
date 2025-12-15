import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDOHzUoRWoAJyVDO0pRHyvMPqkbYZXdIkM",
  authDomain: "travelerp-a0f6a.firebaseapp.com",
  projectId: "travelerp-a0f6a",
  storageBucket: "travelerp-a0f6a.firebasestorage.app",
  messagingSenderId: "425064359188",
  appId: "1:425064359188:web:0eb5e14b55e61feb230e01",
  measurementId: "G-BW3RGJYWRG"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);