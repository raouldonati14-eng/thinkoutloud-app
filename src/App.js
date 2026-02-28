import React, { useEffect, useState } from "react";
import StudentView from "./StudentView";
import TeacherView from "./TeacherView";
import AdminDashboard from "./screens/AdminDashboard"; // create later
import TeacherLogin from "./TeacherLogin";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isTeacherMode = params.get("teacher") === "true";

  const [user, setUser] = useState(null);
  const [roleData, setRoleData] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ================= AUTH LISTENER ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setRoleData(null);
        setLoading(false);
        return;
      }

      // 🔥 Check teachers collection
      const teacherSnap = await getDoc(
        doc(db, "teachers", currentUser.uid)
      );

      if (teacherSnap.exists()) {
        setRoleData({
          role: "teacher",
          ...teacherSnap.data()
        });
        setLoading(false);
        return;
      }

      // 🔥 Check admins collection
      const adminSnap = await getDoc(
        doc(db, "admins", currentUser.uid)
      );

      if (adminSnap.exists()) {
        setRoleData({
          role: "admin",
          ...adminSnap.data()
        });
        setLoading(false);
        return;
      }

      // No role found
      setRoleData(null);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  /* ================= STUDENT MODE ================= */
  if (!isTeacherMode) {
    return <StudentView />;
  }

  /* ================= LOADING ================= */
  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  /* ================= NOT LOGGED IN ================= */
  if (!user) {
    return <TeacherLogin />;
  }

  /* ================= NO ROLE ================= */
  if (!roleData) {
    return <div style={{ padding: 40 }}>Access Denied</div>;
  }

  /* ================= HEADER ================= */
  const Header = () => (
    <div
      style={{
        background: "#111",
        color: "white",
        padding: "10px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <div>
        🔐 {roleData.role.toUpperCase()} | {user.email}
      </div>
      <button
        onClick={handleLogout}
        style={{
          background: "#e03131",
          color: "white",
          border: "none",
          padding: "6px 12px",
          cursor: "pointer",
          borderRadius: 6
        }}
      >
        Logout
      </button>
    </div>
  );

  /* ================= ROLE ROUTING ================= */
  return (
    <div>
      <Header />

      {roleData.role === "teacher" && (
        <TeacherView roleData={roleData} />
      )}

      {roleData.role === "admin" && (
        <AdminDashboard roleData={roleData} />
      )}
    </div>
  );
}