import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";

export const responseRepository = {
  subscribe(callback) {
    const teacherId = auth.currentUser?.uid;

    if (!teacherId) return () => {};

    const q = query(
      collection(db, "responses"),
      where("teacherId", "==", teacherId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      callback(data);
    });

    return unsubscribe;
  }
};
