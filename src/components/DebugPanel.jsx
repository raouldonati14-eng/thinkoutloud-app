import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase"; // adjust path if needed

const DEBUG_MODE = true;

export default function DebugPanel({ user, classPhase, questionOpen }) {
  const [loading, setLoading] = useState(false);

  if (!DEBUG_MODE) return null;

  async function handleTestSubmit() {
    try {
      setLoading(true);
      console.log("🔥 DEBUG: Test submit started");

      const docRef = await addDoc(collection(db, "responses"), {
        text: "debug test response",
        userId: user?.id || "debug-user",
        role: user?.role || "unknown",
        classPhase,
        questionOpen,
        createdAt: serverTimestamp(),
      });

      console.log("✅ DEBUG: Firestore write success:", docRef.id);
      alert("Test response saved!");
    } catch (err) {
      console.error("❌ DEBUG: Firestore error:", err);
      alert("Error saving test response. Check console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🛠 Debug Panel</h3>

      <div style={styles.section}>
        <p><strong>Role:</strong> {user?.role || "N/A"}</p>
        <p><strong>Class Phase:</strong> {classPhase}</p>
        <p><strong>Question Open:</strong> {String(questionOpen)}</p>
      </div>

      <div style={styles.section}>
        <button onClick={handleTestSubmit} disabled={loading}>
          {loading ? "Submitting..." : "🔥 Test Firestore Write"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    bottom: 20,
    right: 20,
    width: 250,
    background: "#111",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    fontSize: 12,
    zIndex: 9999,
  },
  title: {
    margin: 0,
    marginBottom: 8,
    fontSize: 14,
  },
  section: {
    marginBottom: 10,
  },
};