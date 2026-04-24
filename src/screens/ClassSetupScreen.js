import React, { useState } from "react";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";

export default function ClassSetupScreen({ roleData }) {
  const [className, setClassName] = useState("");
  const [creating, setCreating] = useState(false);

  const generateUniqueCode = async () => {
    let code = "";

    do {
      code = Math.random().toString(36).substring(2, 7).toUpperCase();
    } while ((await getDoc(doc(db, "joinCodes", code))).exists());

    return code;
  };

  const handleCreate = async () => {
    if (!className.trim()) return;

    setCreating(true);

    const joinCode = await generateUniqueCode();

    const classRef = await addDoc(collection(db, "classes"), {
      className: className.trim(),
      teacherId: auth.currentUser.uid,
      schoolId: roleData.schoolId,
      districtId: roleData.districtId,
      joinCode,
      active: true,
      createdAt: serverTimestamp()
    });

    await setDoc(doc(db, "joinCodes", joinCode), {
      classId: classRef.id
    });

    setClassName("");
    setCreating(false);

    // reload page to re-check classes
    window.location.reload();
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2>Welcome! Let's Set Up Your First Class</h2>

        <input
          placeholder="Enter class name (e.g., Gold 1)"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          style={styles.input}
        />

        <button
          onClick={handleCreate}
          disabled={creating}
          style={styles.button}
        >
          {creating ? "Creating..." : "Create Class"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f6f9"
  },
  card: {
    background: "white",
    padding: 40,
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    width: "100%",
    maxWidth: 400,
    textAlign: "center"
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 20,
    borderRadius: 6,
    border: "1px solid #ccc"
  },
  button: {
    width: "100%",
    padding: 12,
    background: "#4dabf7",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer"
  }
};
