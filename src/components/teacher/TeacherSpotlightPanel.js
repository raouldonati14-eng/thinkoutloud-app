import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function TeacherSpotlightPanel({ classId }) {

  const [response, setResponse] = useState(null);

  useEffect(() => {

    if (!classId) return;

    const classRef = doc(db, "classes", classId);

    let responseUnsubscribe = null;

    const unsubscribe = onSnapshot(classRef, (classSnap) => {

      const classData = classSnap.data();

      if (!classData?.spotlightResponseId) {
        setResponse(null);
        return;
      }

      const responseRef = doc(
        db,
        "classes",
        classId,
        "responses",
        classData.spotlightResponseId
      );

      if (responseUnsubscribe) responseUnsubscribe();

      responseUnsubscribe = onSnapshot(responseRef, (responseSnap) => {

        if (responseSnap.exists()) {
          setResponse(responseSnap.data());
        } else {
          setResponse(null);
        }

      });

    });

    return () => {
      unsubscribe();
      if (responseUnsubscribe) responseUnsubscribe();
    };

  }, [classId]);

  /* ---------- UI ---------- */

  if (!response) {

    return (

      <div style={styles.panel}>

        <h3>💡 Student Spotlight</h3>
        <div style={styles.empty}>
          Click a student submission to spotlight their reasoning.
        </div>

      </div>

    );

  }

  return (

    <div style={styles.panel}>

      <h3>💡 Student Spotlight</h3>

      <div style={styles.student}>
        {response.student}
      </div>

      <div style={styles.transcript}>
        "{response.transcript}"
      </div>

    </div>

  );

}

/* ---------- STYLES ---------- */

const styles = {

  panel: {
    background: "white",
    padding: "30px",
    borderRadius: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    marginTop: "20px"
  },

  student: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "10px"
  },

  transcript: {
    fontSize: "20px",
    lineHeight: "1.6",
    fontStyle: "italic",
    color: "#333"
  },

  empty: {
    color: "#777"
  }

};