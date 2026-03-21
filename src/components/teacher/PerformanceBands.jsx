import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function PerformanceBands({ classId }) {
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "responses"),
      where("classCode", "==", classId),
      where("deleted", "!=", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setResponses(data);
    });

    return () => unsubscribe();
  }, [classId]);

  if (!responses.length) return null;

  const total = responses.length;

  const level3 = responses.filter(r => r.score === 3).length;
  const level2 = responses.filter(r => r.score === 2).length;
  const level1 = responses.filter(r => r.score === 1).length;
  const level0 = responses.filter(r => r.score === 0).length;

  const percent = (count) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div
      style={{
        background: "#ffffff",
        padding: "15px",
        borderRadius: "8px",
        marginBottom: "20px",
        border: "1px solid #eee"
      }}
    >
      <strong>Performance Bands</strong>

      <Band label="Advanced (3)" count={level3} percent={percent(level3)} color="#2ecc71" />
      <Band label="Proficient (2)" count={level2} percent={percent(level2)} color="#3498db" />
      <Band label="Emerging (1)" count={level1} percent={percent(level1)} color="#f39c12" />
      <Band label="Foundational (0)" count={level0} percent={percent(level0)} color="#e74c3c" />
    </div>
  );
}

function Band({ label, count, percent, color }) {
  return (
    <div style={{ marginTop: "10px" }}>
      <div>
        {label} — {count} students ({percent}%)
      </div>
      <div
        style={{
          height: "8px",
          background: "#eee",
          borderRadius: "4px",
          overflow: "hidden",
          marginTop: "4px"
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            background: color,
            height: "100%"
          }}
        />
      </div>
    </div>
  );
}