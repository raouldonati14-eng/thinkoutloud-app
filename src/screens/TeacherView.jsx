import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
  const [deletingClass, setDeletingClass] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        navigate("/teacher-login");
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const setSelectedClassId = (id) => {
    setSelectedClassIdState(id);
    setSearchParams({ classId: id });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/teacher-login");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Could not log out. Please try again.");
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClassId || deletingClass) return;

    const selectedClass = classes.find((item) => item.id === selectedClassId);
    const className = selectedClass?.className || selectedClass?.name || "this class";
    const confirmed = window.confirm(
      `Delete ${className}? This removes the class and join code mapping.`
    );
    if (!confirmed) return;

    try {
      setDeletingClass(true);
      const classRef = doc(db, "classes", selectedClassId);
      const classSnap = await getDoc(classRef);
      const joinCode = classSnap.exists() ? classSnap.data()?.joinCode : null;

      await deleteDoc(classRef);
      if (joinCode) {
        await deleteDoc(doc(db, "joinCodes", joinCode));
      }

      const nextClass = classes.filter((item) => item.id !== selectedClassId)[0];
      if (nextClass?.id) {
        setSelectedClassIdState(nextClass.id);
        setSearchParams({ classId: nextClass.id });
      } else {
        setSelectedClassIdState(null);
        setSearchParams({});
      }
    } catch (error) {
      console.error("Delete class failed:", error);
      alert("Could not delete class. Please try again.");
    } finally {
      setDeletingClass(false);
    }
  };

  useEffect(() => {
    const urlClassId = searchParams.get("classId");
    if (urlClassId) {
      setSelectedClassIdState(urlClassId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "classes"), where("teacherId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((classDoc) => ({ id: classDoc.id, ...classDoc.data() }))
        .filter((classItem) => classItem.className || classItem.name);

      setClasses(list);

      setSelectedClassIdState((prev) => {
        const urlClassId = searchParams.get("classId");
        const target = urlClassId || prev;
        if (target && list.some((classItem) => classItem.id === target)) return target;
        return list.length > 0 ? list[0].id : null;
      });
    });

    return () => unsubscribe();
  }, [user, searchParams]);

  if (authLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Welcome, {user?.email}</h2>
          <button onClick={handleLogout}>Logout</button>
        </div>
        <h3>No classes found - create your first class below</h3>
        <CreateClass teacherId={user?.uid} />
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "20px auto",
        padding: 20,
        background: "white",
        borderRadius: 10
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16
        }}
      >
        <h2 style={{ margin: 0 }}>{user?.displayName || user?.email}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#888" }}>
            {classes.length} class{classes.length !== 1 ? "es" : ""}
          </div>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {selectedClassId && (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            background: "#e6fcf5",
            borderRadius: 8,
            fontWeight: "600"
          }}
        >
          Active Class:{" "}
          {classes.find((classItem) => classItem.id === selectedClassId)?.className ||
            classes.find((classItem) => classItem.id === selectedClassId)?.name}
        </div>
      )}

      <CreateClass teacherId={user?.uid} />

      <ClassSelector
        classes={classes}
        selectedClassId={selectedClassId}
        onSelect={setSelectedClassId}
      />

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={handleDeleteClass}
          disabled={!selectedClassId || deletingClass}
          style={{
            background: "#c92a2a",
            color: "white",
            border: "none",
            borderRadius: 6,
            padding: "10px 14px",
            cursor: !selectedClassId || deletingClass ? "not-allowed" : "pointer",
            opacity: !selectedClassId || deletingClass ? 0.6 : 1
          }}
        >
          {deletingClass ? "Deleting class..." : "Delete Selected Class"}
        </button>
      </div>

      {selectedClassId && <TeacherDashboard key={selectedClassId} classId={selectedClassId} />}
    </div>
  );
}
