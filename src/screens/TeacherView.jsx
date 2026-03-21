import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

import TeacherDashboard from "./TeacherDashboard";
import ClassSelector from "../components/teacher/ClassSelector";
import CreateClass from "../components/teacher/CreateClass";

export default function TeacherView() {

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [user, setUser] = useState(null);

  /* -------- AUTH LISTENER -------- */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      console.log("AUTH USER:", u);
      setUser(u);
    });
    return () => unsub();
  }, []);

  /* -------- LOAD TEACHER CLASSES -------- */

  useEffect(() => {

  if (!user) return;

  const q = query(
    collection(db, "classes"),
    where("teacherId", "==", user.uid)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {

    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log("CLASSES FOUND:", list);

    setClasses(list);

    // ✅ MUST be inside here
    if (list.length > 0 && !selectedClassId) {
      setSelectedClassId(list[0].id);
    }

  });

  return () => unsubscribe();

}, [user, selectedClassId]); // ✅ include this too
  /* -------- UI -------- */

  if (!user) {
    return <div style={{ padding: 20 }}>Loading user...</div>;
  }

  if (classes.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <h2>No classes yet</h2>
        <CreateClass />
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>

      {/* ✅ CREATE CLASS ALWAYS AVAILABLE */}
      <CreateClass />

      {/* ✅ CLASS SELECTOR */}
      <ClassSelector
        classes={classes}
        selectedClassId={selectedClassId}
        onSelect={setSelectedClassId}
      />

      {/* ✅ FIX: USE SELECTED CLASS */}
      {selectedClassId && (
        <TeacherDashboard classId={selectedClassId} />
      )}

    </div>
  );
}