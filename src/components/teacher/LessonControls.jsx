import React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function LessonControl({ classId }) {

  const setPhase = async (phase) => {

    try {

      const classRef = doc(db, "classes", classId);

      await updateDoc(classRef, {
        classPhase: phase
      });

      console.log("Class phase set to:", phase);

    } catch (err) {

      console.error("Error updating phase:", err);

    }

  };

  return (

    <div style={styles.container}>

      <h3>Classroom Controls</h3>

      <div style={styles.buttons}>

        <button
          style={styles.button}
          onClick={() => setPhase("instruction")}
        >
          Instruction
        </button>

        <button
          style={styles.button}
          onClick={() => setPhase("recording")}
        >
          Start Recording
        </button>

        <button
          style={styles.button}
          onClick={() => setPhase("discussion")}
        >
          Discussion
        </button>

        <button
          style={styles.button}
          onClick={() => setPhase("reflection")}
        >
          Reflection
        </button>

      </div>

    </div>

  );

}

const styles = {

  container: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    marginBottom: 20
  },

  buttons: {
    display: "flex",
    gap: 10
  },

  button: {
    padding: "10px 16px",
    borderRadius: 6,
    border: "none",
    background: "#4dabf7",
    color: "white",
    cursor: "pointer"
  }

};