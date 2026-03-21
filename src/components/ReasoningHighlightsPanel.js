import React from "react";

function ReasoningHighlightsPanel({ responses }) {

  const reasoning = responses?.filter(
    r => r.reasoningDetected
  );

  if (!reasoning?.length) {
    return null;
  }

  return (

    <div style={styles.card}>

      <strong>Reasoning Highlights</strong>

      {reasoning.slice(0, 5).map((r) => (

        <div key={r.id} style={styles.entry}>

          <div style={styles.student}>
            {r.student}
          </div>

          <div style={styles.text}>
            {r.transcript}
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