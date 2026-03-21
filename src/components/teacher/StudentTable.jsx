import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function StudentTable({ classId }) {
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "responses"),
      where("classCode", "==", classId),
      where("deleted", "!=", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setResponses(data);
    });

    return () => unsubscribe();
  }, [classId]);

  if (!responses.length) return null;

  return (
    <div
      style={{
        background: "#ffffff",
        padding: "15px",
        borderRadius: "8px",
        border: "1px solid #eee"
      }}
    >
      <strong>Student Responses</strong>

      <table
        style={{
          width: "100%",
          marginTop: "10px",
          borderCollapse: "collapse"
        }}
      >
        <thead>
          <tr>
            <th align="left">Student</th>
            <th align="left">Score</th>
            <th align="left">Reasoning</th>
            <th align="left">Audio</th>
          </tr>
        </thead>
        <tbody>
          {responses.map((r) => (
            <tr key={r.id}>
              <td>{r.student}</td>
              <td>{r.score}</td>
              <td>{r.reasoningDetected ? "Yes" : "No"}</td>
              <td>
                {r.audioURL ? (
                  <audio controls style={{ width: 150 }}>
                    <source src={r.audioURL} />
                  </audio>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}