import React from "react";

function TeacherTimelinePanel({ responses }) {

  if (!responses?.length) {
    return null;
  }

  const sorted = [...responses].sort(
    (a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)
  );

  return (

    <div style={styles.card}>

      <strong>Discussion Timeline</strong>

      {sorted.map((r) => (

        <div key={r.id} style={styles.row}>

          <span style={styles.student}>
            {r.student}
          </span>

          <span style={styles.score}>
            Score: {r.score ?? "-"}
          </span>

        </div>

      ))}

    </div>

  );

}

export default React.memo(TeacherTimelinePanel);

const styles = {

  card: {
    background: "white",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px"
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0"
  },

  student: {
    fontWeight: 600
  },

  score: {
    color: "#666"
  }

};