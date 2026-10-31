import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDJWfvdVbLqNNVLc7XuMTxEqk3EGtxdsGA",
  authDomain: "ourmoney-647b2.firebaseapp.com",
  projectId: "ourmoney-647b2",
  storageBucket: "ourmoney-647b2.firebasestorage.app",
  messagingSenderId: "1043186572321",
  appId: "1:1043186572321:web:placeholder" // Update this in production
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});
export const googleProvider = new GoogleAuthProvider();
