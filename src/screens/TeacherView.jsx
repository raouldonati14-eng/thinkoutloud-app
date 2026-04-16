import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";

import TeacherDashboard from "./TeacherDashboard.js";
import ClassSelector from "../components/teacher/ClassSelector";
import CreateClass from "../components/teacher/CreateClass";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function TeacherView() {
  const [classes, setClasses] = useState([]);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClassId, setSelectedClassIdState] = useState(null);
  const navigate = useNavigate();

  // 🔥 REAL AUTH
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        // not logged in — send to login page
        navigate("/teacher-login");
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 PERSIST CLASS IN URL
  const setSelectedClassId = (id) => {
    setSelectedClassIdState(id);
    setSearchParams({ classId: id });
  };

  // 🔥 LOAD CLASS FROM URL ON MOUNT
  useEffect(() => {
    const urlClassId = searchParams.get("classId");
    if (urlClassId) {
      setSelectedClassIdState(urlClassId);
    }
  }, []);

  // 🔥 LOAD CLASSES FOR REAL TEACHER
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "classes"),
      where("teacherId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((c) => c.className || c.name);

      setClasses(list);

      // only auto-select first class if nothing is selected or URL class not found
      setSelectedClassIdState((prev) => {
        const urlClassId = searchParams.get("classId");
        const target = urlClassId || prev;
        if (target && list.some((c) => c.id === target)) return target;
        return list.length > 0 ? list[0].id : null;
      });
    });

    return () => unsubscribe();
  }, [user]);

  // 🔥 AUTH LOADING
  if (authLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  // 🔥 NO CLASSES
  if (classes.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Welcome, {user?.email}</h2>
        <h3>No classes found — create your first class below</h3>
        <CreateClass teacherId={user?.uid} />
      </div>
    );
  }

  // 🔥 MAIN UI
  return (
    <div style={{
      maxWidth: 900,
      margin: "20px auto",
      padding: 20,
      background: "white",
      borderRadius: 10
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16
      }}>
        <h2 style={{ margin: 0 }}>
          {user?.displayName || user?.email}
        </h2>
        <div style={{ fontSize: 13, color: "#888" }}>
          {classes.length} class{classes.length !== 1 ? "es" : ""}
        </div>
      </div>

      {selectedClassId && (
        <div style={{
          marginBottom: 10,
          padding: 10,
          background: "#e6fcf5",
          borderRadius: 8,
          fontWeight: "600"
        }}>
          Active Class:{" "}
          {classes.find((c) => c.id === selectedClassId)?.className ||
           classes.find((c) => c.id === selectedClassId)?.name}
        </div>
      )}

      <CreateClass teacherId={user?.uid} />

      <ClassSelector
        classes={classes}
        selectedClassId={selectedClassId}
        onSelect={setSelectedClassId}
      />

      {selectedClassId && (
        <TeacherDashboard
          key={selectedClassId}
          classId={selectedClassId}
        />
      )}
    </div>
  );
}