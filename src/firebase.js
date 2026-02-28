import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; // NEW

const firebaseConfig = {
  apiKey: "AIzaSyCHwFLi_59ETAKZYujmWpYFr6SqluXaSgE",
  authDomain: "think-out-loud-40d3a.firebaseapp.com",
  projectId: "think-out-loud-40d3a",
  storageBucket: "think-out-loud-40d3a.firebasestorage.app",
  messagingSenderId: "763779331556",
  appId: "1:763779331556:web:9dcf803407b9d84d3743f1"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app); // NEW
