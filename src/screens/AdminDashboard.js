import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  addDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { createUserWithEmailAndPassword } from "firebase/auth";
import QuestionManager from "./QuestionManager";

export default function AdminDashboard({ roleData }) {
  console.log("ROLE DATA:", roleData);
  const [responses, setResponses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");

  const [newClassName, setNewClassName] = useState("");

  /* ================= CREATE TEACHER ================= */
  const handleCreateTeacher = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        newTeacherEmail,
        newTeacherPassword
      );

      await setDoc(doc(db, "teachers", cred.user.uid), {
        email: newTeacherEmail,
        schoolId: roleData.schoolId,
        createdAt: new Date(),
        classes: []
      });

      alert("Teacher created!");
      setNewTeacherEmail("");
      setNewTeacherPassword("");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  /* ================= CREATE CLASS ================= */
  const handleCreateClass = async () => {
    try {
      let joinCode = "";

      do {
        joinCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      } while ((await getDoc(doc(db, "joinCodes", joinCode))).exists());

      const classRef = await addDoc(collection(db, "classes"), {
        className: newClassName,
        schoolId: roleData.schoolId,
        teacherId: null,
        joinCode,
        active: true,
        createdAt: new Date()
      });

      await setDoc(doc(db, "joinCodes", joinCode), {
        classId: classRef.id
      });

      alert("Class created!");
      setNewClassName("");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  /* ================= LOAD RESPONSES ================= */
  useEffect(() => {
    if (!roleData?.schoolId) return;

    const q = query(
      collection(db, "responses"),
      where("schoolId", "==", roleData.schoolId)
    );

    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setResponses(data);
    });

    return () => unsub();
  }, [roleData]);

  /* ================= LOAD TEACHERS ================= */
  useEffect(() => {
    if (!roleData?.schoolId) return;

    const q = query(
      collection(db, "teachers"),
      where("schoolId", "==", roleData.schoolId)
    );

    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeachers(data);
    });

    return () => unsub();
  }, [roleData]);

  /* ================= ANALYTICS ================= */
  const analytics = useMemo(() => {
    if (!responses.length) return null;

    let totalScore = 0;
    const studentSet = new Set();
    const teacherStats = {};

    responses.forEach(r => {
      totalScore += r.score || 0;
      studentSet.add(r.student);

      if (!teacherStats[r.teacherId]) {
        teacherStats[r.teacherId] = { count: 0, totalScore: 0 };
      }

      teacherStats[r.teacherId].count += 1;
      teacherStats[r.teacherId].totalScore += r.score || 0;
    });

    const schoolAvg = (totalScore / responses.length).toFixed(2);

    const teacherLeaderboard = Object.entries(teacherStats)
      .map(([teacherId, data]) => ({
        teacherId,
        avg: data.totalScore / data.count
      }))
      .sort((a, b) => b.avg - a.avg);

    return {
      totalStudents: studentSet.size,
      totalResponses: responses.length,
      schoolAvg,
      teacherLeaderboard
    };
  }, [responses]);

  /* ================= TREND DATA ================= */
  const trendData = useMemo(() => {
    const grouped = {};

    responses.forEach(r => {
      const date = r.timestamp?.toDate()?.toLocaleDateString();
      if (!date) return;

      if (!grouped[date]) {
        grouped[date] = { date, total: 0, count: 0 };
      }

      grouped[date].total += r.score || 0;
      grouped[date].count += 1;
    });

    return Object.values(grouped).map(d => ({
      date: d.date,
      avg: d.total / d.count
    }));
  }, [responses]);

  return (
    <div style={styles.page}>
      <h2>🏫 School Admin Dashboard</h2>

      {/* ================= MANAGEMENT SECTION ================= */}
      <div style={styles.managementSection}>
        <h3>Create Teacher</h3>
        <input
          placeholder="Teacher Email"
          value={newTeacherEmail}
          onChange={(e) => setNewTeacherEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Temporary Password"
          value={newTeacherPassword}
          onChange={(e) => setNewTeacherPassword(e.target.value)}
        />
        <button onClick={handleCreateTeacher}>Create Teacher</button>

        <h3 style={{ marginTop: 30 }}>Create Class</h3>
        <input
          placeholder="Class Name"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
        />
        <button onClick={handleCreateClass}>Create Class</button>
      </div>

      {/* ================= ANALYTICS ================= */}
      {analytics && (
        <div style={styles.analytics}>
          <Card title="Students" value={analytics.totalStudents} />
          <Card title="Responses" value={analytics.totalResponses} />
          <Card title="School Avg Score" value={analytics.schoolAvg} />
          <Card title="Teachers" value={teachers.length} />
        </div>
      )}
{trendData?.length > 0 && (
  <div style={styles.section}>
    <h3>School Performance Trend</h3>
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={trendData}>
        <XAxis dataKey="date" />
        <YAxis domain={[0, 3]} />
        <Tooltip />
        <Line type="monotone" dataKey="avg" stroke="#4dabf7" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  </div>
)}

{/* ================= QUESTION MANAGER ================= */}
<div style={{ ...styles.section, marginTop: 50 }}>
  <QuestionManager />
</div>
</div>
  );
}

/* ================= COMPONENTS ================= */
function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: {
    padding: 40,
    background: "#f8f9fa",
    minHeight: "100vh"
  },
  managementSection: {
    background: "white",
    padding: 25,
    borderRadius: 14,
    marginBottom: 30,
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxWidth: 500
  },
  analytics: {
    display: "flex",
    gap: 20,
    marginTop: 20,
    flexWrap: "wrap"
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 14,
    minWidth: 160,
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)"
  },
  cardTitle: {
    fontSize: 14,
    color: "#868e96"
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 6
  },
  section: {
    marginTop: 40
  }
};
