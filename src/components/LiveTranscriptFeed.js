import React, { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function LiveTranscriptFeed({ classId }) {

  const [responses, setResponses] = useState([]);
  const topRef = useRef(null);

  useEffect(() => {

    if (!classId) return;

    const q = query(
      collection(db, "classes", classId, "responses"),
      orderBy("timestamp", "desc"),
      limit(50) // Only load newest 50 responses
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setResponses(list);

      // auto-scroll to newest transcript
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: "smooth" });
      }

    });

    return () => unsubscribe();

  }, [classId]);

  return (

    <div style={styles.panel}>

      <h3>Live Transcript Feed</h3>

      <div style={styles.feedContainer}>

        <div ref={topRef} />

        {responses.length === 0 && (
          <div>No student responses yet.</div>
        )}

        {responses.map((r) => (

          <div key={r.id} style={styles.entry}>

            <div style={styles.student}>
              {r.student}
            </div>

            <div style={styles.transcript}>
              {r.transcript || "..."}
            </div>

          </div>

        ))}

      </div>

    </div>

  );

}

const styles = {

  panel: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    marginTop: 20
  },

  feedContainer: {
    maxHeight: 400,
    overflowY: "auto"
  },

  entry: {
    borderBottom: "1px solid #eee",
    padding: "10px 0"
  },

  student: {
    fontWeight: "bold",
    marginBottom: 4
  },

  transcript: {
    fontStyle: "italic",
    color: "#333"
  }

};