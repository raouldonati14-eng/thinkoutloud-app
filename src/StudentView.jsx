import React, { useEffect, useState } from "react";
import { doc, onSnapshot, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import EssentialQuestionScreen from "./screens/EssentialQuestionScreen";

export default function StudentView() {
  const [locked, setLocked] = useState(null);

  const [classes, setClasses] = useState([]);
  const [selectedClassCode, setSelectedClassCode] = useState("");

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");

  const [student, setStudent] = useState(null);

  const MAINTENANCE_MODE = false;

  /* ---------------- LOAD CLASSES FROM FIRESTORE ---------------- */
  useEffect(() => {
    const loadClasses = async () => {
      const snapshot = await getDocs(collection(db, "classes"));

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setClasses(list);
    };

    loadClasses();
  }, []);

  /* ---------------- LISTEN FOR LOCK ---------------- */
  useEffect(() => {
    const lessonRef = doc(db, "lessonState", "current");

    const unsubscribe = onSnapshot(lessonRef, (snap) => {
      if (snap.exists()) {
        setLocked(snap.data().locked);
      } else {
        setLocked(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const capitalize = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  if (locked === null) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.card}>Loading lesson...</div>
      </div>
    );
  }

  if (MAINTENANCE_MODE) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.card}>
          <h2>🚧 Think Out Loud Temporarily Unavailable</h2>
          <p>Please wait for your teacher’s instructions.</p>
        </div>
      </div>
    );
  }

  const handleStart = () => {
    if (!selectedClassCode || !lastName.trim() || !firstName.trim()) return;

    const formattedName =
      `${capitalize(lastName.trim())}, ${capitalize(firstName.trim())}`;

    setStudent(formattedName);
  };

  const handleChangeStudent = () => {
    setStudent(null);
    setSelectedClassCode("");
    setLastName("");
    setFirstName("");
  };

  /* ---------------- ENTRY SCREEN ---------------- */
  if (!student) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.card}>
          <h2>Think Out Loud</h2>
          <p>Please enter your information to begin.</p>

          <select
            value={selectedClassCode}
            onChange={(e) => setSelectedClassCode(e.target.value)}
            style={styles.input}
          >
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.className}
              </option>
            ))}
          </select>

          <input
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={styles.input}
          />

          <input
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={styles.input}
          />

          <button onClick={handleStart} style={styles.primaryButton}>
            Start
          </button>
        </div>
      </div>
    );
  }

  if (locked) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.card}>
          <h2>🔒 Lesson Locked</h2>
          <p>Please wait for your teacher to release the lesson.</p>
        </div>
      </div>
    );
  }

  /* ---------------- MAIN VIEW ---------------- */
  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <strong>{student}</strong>
        </div>
        <button onClick={handleChangeStudent} style={styles.linkButton}>
          Change Student
        </button>
      </div>

      <EssentialQuestionScreen
        student={student}
        classCode={selectedClassCode}
      />
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f6f9",
    padding: "20px"
  },
  centerScreen: {
    minHeight: "100vh",
    backgroundColor: "#f4f6f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    width: "100%",
    maxWidth: "420px",
    textAlign: "center"
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px"
  },
  primaryButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#4dabf7",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#4dabf7",
    cursor: "pointer"
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px"
  }
};