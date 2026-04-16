import React from "react";

function ReasoningHighlightsPanel({ responses }) {
  const reasoning = responses?.filter((response) => {
    const text = (response.transcript || "").toLowerCase();
    return (
      text.includes("because") ||
      text.includes("therefore") ||
      text.includes("for example") ||
      text.includes("evidence") ||
      text.includes("however")
    );
  });

  if (!reasoning?.length) {
    return null;
  }
  return (
    <div style={styles.card}>
      <strong>Reasoning Highlights</strong>
      {reasoning.slice(0, 5).map((response) => (
        <div key={response.id} style={styles.entry}>
          <div style={styles.student}>
            {response.studentName || response.studentId}
          </div>
          <div style={styles.text}>
            {response.transcript}
          </div>
        </div>
      ))}
    </div>
  );
}

export default React.memo(ReasoningHighlightsPanel);

const styles = {

  card: {
    background: "white",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px"
  },

  entry: {
    borderBottom: "1px solid #eee",
    padding: "8px 0"
  },

  student: {
    fontWeight: "bold",
    marginBottom: 4
  },

  text: {
    fontSize: 14
  }

};
