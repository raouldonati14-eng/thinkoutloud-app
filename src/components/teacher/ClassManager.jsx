import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db, auth } from "../../firebase";

export default function ClassManager() {
  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState("");

  const teacher = auth.currentUser;

  /* ================= LOAD CLASSES REAL-TIME ================= */
  useEffect(() => {
    if (!teacher) return;

    const q = query(
      collection(db, "classes"),
      where("teacherId", "==", teacher.uid)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClasses(list);
    });

    return () => unsubscribe();
  }, [teacher]);

  /* ================= CREATE CLASS ================= */
  const handleCreate = async () => {
    if (!newClassName.trim()) return;

    await addDoc(collection(db, "classes"), {
  className: newClassName.trim(),
  teacherId: teacher.uid,
  schoolId: teacher.schoolId, // 🔥 NEW
  active: true,
  createdAt: serverTimestamp()
});

    setNewClassName("");
  };

  /* ================= TOGGLE ACTIVE ================= */
  const toggleActive = async (id, current) => {
    await updateDoc(doc(db, "classes", id), {
      active: !current
    });
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h3>Class Manager</h3>
        <span style={styles.count}>
          {classes.length} Classes
        </span>
      </div>

      {/* CREATE */}
      <div style={styles.createRow}>
        <input
          placeholder="Enter class name"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          style={styles.input}
        />
        <button onClick={handleCreate} style={styles.createButton}>
          Create
        </button>
      </div>

      {/* CLASS LIST */}
      <div style={styles.list}>
        {classes.map(cls => (
          <div key={cls.id} style={styles.card}>
            <div>
              <div style={styles.name}>
                {cls.className}
              </div>
              <div style={styles.code}>
                Code: {cls.id}
              </div>
            </div>

            <button
              onClick={() => toggleActive(cls.id, cls.active)}
              style={{
                ...styles.statusButton,
                backgroundColor: cls.active
                  ? "#ff6b6b"
                  : "#2f9e44"
              }}
            >
              {cls.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  wrapper: {
    marginTop: 40,
    padding: 25,
    background: "white",
    borderRadius: 16,
    boxShadow: "0 12px 32px rgba(0,0,0,0.08)"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },

  count: {
    fontSize: 14,
    color: "#868e96"
  },

  createRow: {
    display: "flex",
    gap: 12,
    marginBottom: 25
  },

  input: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #dee2e6",
    fontSize: 14
  },

  createButton: {
    padding: "12px 18px",
    backgroundColor: "#4dabf7",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "600"
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    border: "1px solid #f1f3f5",
    transition: "all 0.2s ease"
  },

  name: {
    fontWeight: 600,
    fontSize: 16
  },

  code: {
    fontSize: 12,
    color: "#868e96",
    marginTop: 4
  },

  statusButton: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    color: "white",
    cursor: "pointer",
    fontWeight: 500
  }
};