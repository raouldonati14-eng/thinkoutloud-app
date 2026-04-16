import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

import { db } from "../../firebase";

export default function LiveStudentGrid({ classId }) {

  const [responses, setResponses] = useState([]);

  useEffect(() => {

    if (!classId) return;

    const q = query(
      collection(db,"responses"),
      where("classCode","==",classId)
    );

    const unsubscribe = onSnapshot(q, snap => {

      const data = snap.docs.map(d => ({
        id:d.id,
        ...d.data()
      }));

      setResponses(data);

    });

    return ()=>unsubscribe();

  },[classId]);

  /* ================= STATUS COLOR ================= */

  const getColor = (r) => {

    if(r.status === "recording") return "#ffe066";

    if(r.status === "submitted"){

      if((r.score || 0) >= 0.75) return "#8ce99a";

      if((r.score || 0) < 0.4) return "#ffa8a8";

      return "#fff3bf";
    }

    return "#e9ecef";
  };

  /* ================= UI ================= */

 return (
  <div style={styles.container}>
    <h3>Live Student Grid</h3>

    <div style={styles.grid}>
      {responses.map(r => (
        <div
          key={r.id}
          style={{
            ...styles.card,
            background: getColor(r)
          }}
        >
          <strong>{r.student}</strong>

          {/* 🔥 LATE LABEL */}
          <span
            style={{
              marginLeft: 10,
              color: r.isLate ? "#f08c00" : "#2f9e44",
              fontWeight: "bold"
            }}
          >
           {r.isLate ? "🕒 Extended" : "✔ On time"}
          </span>

          {/* RESPONSE TEXT */}
          <div style={{ marginTop: 5 }}>
            {r.responseText}
          </div>

          {/* META INFO */}
          <div style={styles.meta}>
            {r.status === "recording" && "Recording"}

            {r.status === "submitted" &&
              `${r.durationSeconds || 0}s`}

            {!r.status && "Waiting"}
          </div>
        </div>
      ))}
    </div>

    {!responses.length && (
      <p style={styles.empty}>
        No student activity yet
      </p>
    )}
  </div>
);

/* ================= STYLES ================= */

const styles = {

  container:{
    marginTop:30,
    padding:20,
    background:"#fff",
    borderRadius:10,
    boxShadow:"0 6px 18px rgba(0,0,0,0.08)"
  },

  grid:{
    marginTop:15,
    display:"grid",
    gridTemplateColumns:"repeat(auto-fill, minmax(120px,1fr))",
    gap:10
  },

  card:{
    padding:12,
    borderRadius:8,
    textAlign:"center",
    fontSize:14
  },

  meta:{
    fontSize:12,
    marginTop:4
  },

  empty:{
    fontStyle:"italic",
    color:"#777"
  }

};

}