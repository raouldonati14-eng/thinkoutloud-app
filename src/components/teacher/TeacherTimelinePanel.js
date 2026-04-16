import React from "react";

function TeacherTimelinePanel({ responses }) {
  if (!responses?.length) {
    return null;
  }

  const toMillis = (value) => {
    if (typeof value === "number") return value;
    if (value?.toMillis) return value.toMillis();
    if (value?.seconds) return value.seconds * 1000;
    return 0;
  };

  const sorted = [...responses].sort((a, b) => {
    return toMillis(a.createdAt) - toMillis(b.createdAt);
  });

  return (
    <div style={styles.card}>
      <strong>Discussion Timeline</strong>
      {sorted.map((response) => (
        <div key={response.id} style={styles.row}>
          <span style={styles.student}>
            {response.studentName || response.studentId}
          </span>
          <span style={styles.score}>
            Score: {response.score ?? "-"}
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
