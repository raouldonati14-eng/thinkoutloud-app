import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from  "../../firebase";

export default function ClassroomAwarenessPanel({ classId }) {

  const [recording, setRecording] = useState([]);
  const [submitted, setSubmitted] = useState([]);

  /* ---------------- SPOTLIGHT STUDENT ---------------- */

  const spotlightStudent = async (response) => {

    try {

      await updateDoc(
        doc(db, "classes", classId),
        {
          spotlightResponseId: response.id
        }
      );

    } catch (err) {

      console.error("Spotlight error:", err);

    }

  };

  /* ---------------- LISTEN FOR RESPONSES ---------------- */

  useEffect(() => {

    if (!classId) return;

    const responsesRef = collection(db, "classes", classId, "responses");

    const unsubscribe = onSnapshot(responsesRef, (snapshot) => {

      const studentMap = {};

      snapshot.docs.forEach(d => {

        const data = d.data();
        const student = data.student;

        if (!student) return;

        const entry = {
          id: d.id,
          ...data
        };

        const existing = studentMap[student];

        if (!existing) {

          studentMap[student] = entry;

        } else {

          const newTime = entry.timestamp?.seconds || 0;
          const oldTime = existing.timestamp?.seconds || 0;

          if (newTime > oldTime) {
            studentMap[student] = entry;
          }

        }

      });

      const uniqueResponses = Object.values(studentMap);

      const rec = uniqueResponses.filter(r => r.status === "recording");

      const sub = uniqueResponses.filter(
        r => r.status === "submitted" || r.status === "graded"
      );

      setRecording(rec);
      setSubmitted(sub);

    });

    return () => unsubscribe();

  }, [classId]);

  /* ---------------- UI ---------------- */

  return (

    <div>

      <h3>Live Classroom Status</h3>

      {/* Submitted */}

      <div style={{ marginBottom: 20 }}>

        <strong>🟢 Submitted ({submitted.length})</strong>

        {submitted.length === 0 && (
          <div>No submissions yet</div>
        )}

        {submitted.map((s) => (

          <div
            key={s.id}
            onClick={() => spotlightStudent(s)}
            style={{
              cursor: "pointer",
              padding: "6px 8px",
              borderRadius: 6,
              marginTop: 4
            }}
          >
            {s.student}
          </div>

        ))}

      </div>


      {/* Recording */}

      <div style={{ marginBottom: 20 }}>

        <strong>🟡 Recording ({recording.length})</strong>

        {recording.length === 0 && (
          <div>No students recording</div>
        )}

        {recording.map((s) => (

          <div key={s.id} style={{ marginBottom: 12 }}>

            <div>
              <strong>{s.student}</strong> — recording...
            </div>

            {s.transcript && s.transcript.trim().length > 0 && (

              <div
                style={{
                  fontStyle: "italic",
                  fontSize: 14,
                  color: "#555",
                  marginTop: 4,
                  background: "#f8f9fa",
                  padding: "6px 8px",
                  borderRadius: 6
                }}
              >
                "{s.transcript}"
              </div>

            )}

          </div>

        ))}

      </div>


      {/* Not Started */}

      <div>

        <strong>⚪ Not Started</strong>

        {recording.length === 0 && submitted.length === 0 && (
          <div>No activity yet</div>
        )}

      </div>

    </div>

  );

}