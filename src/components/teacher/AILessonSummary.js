import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

import { db } from "../../firebase";

export default function AILessonSummary({ classId }) {

  const [summary, setSummary] = useState(null);

  useEffect(() => {

    if (!classId) return;

    const q = query(
      collection(db, "responses"),
      where("classCode", "==", classId)
    );

    const unsubscribe = onSnapshot(q, snap => {

      const responses = snap.docs.map(d => d.data());

      generateSummary(responses);

    });

    return () => unsubscribe();

  }, [classId]);

  /* ================= SUMMARY GENERATION ================= */

  const generateSummary = (responses) => {

    const submitted = responses.filter(r => r.status === "submitted");

    const transcripts = submitted
      .map(r => r.transcript || "")
      .join(" ")
      .toLowerCase();

    const keyIdeas = [];

    if (transcripts.includes("dopamine"))
      keyIdeas.push("Addiction affects dopamine and reward pathways");

    if (transcripts.includes("peer pressure"))
      keyIdeas.push("Peer pressure influences drug experimentation");

    if (transcripts.includes("brain"))
      keyIdeas.push("Drug use changes brain chemistry");

    const misconceptions = [];

    if (transcripts.includes("just a choice"))
      misconceptions.push("Some students believe addiction is purely a choice");

    if (transcripts.includes("permanent dopamine"))
      misconceptions.push("Some students believe dopamine permanently increases");

    const durations = submitted.map(r => r.durationSeconds || 0);

    const avgDuration =
      durations.length
        ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length)
        : 0;

    const participation = submitted.length;

    const discussionQuestions = [];

    if (keyIdeas.includes("Addiction affects dopamine and reward pathways"))
      discussionQuestions.push("Why does dopamine decrease after repeated drug use?");

    if (keyIdeas.includes("Peer pressure influences drug experimentation"))
      discussionQuestions.push("How can social environments influence addiction risk?");

    setSummary({
      keyIdeas,
      misconceptions,
      participation,
      avgDuration,
      discussionQuestions
    });

  };

  /* ================= UI ================= */

  if (!summary) return null;

  return (
    <div style={styles.container}>

      <h3>AI Lesson Summary</h3>

      <section style={styles.section}>
        <strong>Key Ideas Students Expressed</strong>

        {summary.keyIdeas.map((k,i)=>(
          <div key={i}>• {k}</div>
        ))}

        {!summary.keyIdeas.length && <div>No dominant ideas detected</div>}
      </section>

      <section style={styles.section}>
        <strong>Common Misconceptions</strong>

        {summary.misconceptions.map((m,i)=>(
          <div key={i}>• {m}</div>
        ))}

        {!summary.misconceptions.length && <div>No misconceptions detected</div>}
      </section>

      <section style={styles.section}>
        <strong>Participation</strong>

        <div>{summary.participation} students responded</div>
        <div>Average response length: {summary.avgDuration} sec</div>

      </section>

      <section style={styles.section}>
        <strong>Suggested Discussion Questions</strong>

        {summary.discussionQuestions.map((q,i)=>(
          <div key={i}>• {q}</div>
        ))}

        {!summary.discussionQuestions.length && <div>No suggestions yet</div>}
      </section>

    </div>
  );
}

/* ================= STYLES ================= */

const styles = {

  container:{
    marginTop:30,
    padding:20,
    background:"#fff",
    borderRadius:10,
    boxShadow:"0 6px 18px rgba(0,0,0,0.08)"
  },

  section:{
    marginTop:15
  }

};