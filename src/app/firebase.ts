import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAUlLbEm5swojdlsFc-FSZaA212hJCQv3I",
  authDomain: "delivery-dispatcher-f11cc.firebaseapp.com",
  projectId: "delivery-dispatcher-f11cc",
  storageBucket: "delivery-dispatcher-f11cc.firebasestorage.app",
  messagingSenderId: "500959573570",
  appId: "1:500959573570:web:de1a3e313ca9e991f8dfdb",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
