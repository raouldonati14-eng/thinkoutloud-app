import React, { useState } from "react";
import { auth } from "../firebase";
import { createClassWithCode } from "../utils/createClassWithCode";

export default function ClassSetupScreen({ roleData }) {
  const [className, setClassName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!className.trim()) return;

    setCreating(true);

    await createClassWithCode({
      className: className.trim(),
      teacherId: auth.currentUser.uid,
      teacherName:
        auth.currentUser?.displayName ||
        auth.currentUser?.email ||
        "Teacher",
      schoolId: roleData.schoolId,
      districtId: roleData.districtId
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
