import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence
} from "firebase/auth";
import { getStorage } from "firebase/storage"; // NEW
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCHwFLi_59ETAKZYujmWpYFr6SqluXaSgE",
  authDomain: "think-out-loud-40d3a.firebaseapp.com",
  projectId: "think-out-loud-40d3a",
  storageBucket: "think-out-loud-40d3a.firebasestorage.app",
  messagingSenderId: "763779331556",
  appId: "1:763779331556:web:9dcf803407b9d84d3743f1"
};

const app = initializeApp(firebaseConfig);

if (process.env.NODE_ENV === "development") {
  console.log("FIREBASE CONFIG", {
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId
  });
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app); // NEW
export const functions = getFunctions(app);

export const authPersistenceReady = setPersistence(
  auth,
  browserLocalPersistence
).catch((error) => {
  console.error("AUTH PERSISTENCE ERROR", error);
});

