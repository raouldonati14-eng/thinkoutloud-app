import React from "react";

export default function TeacherPromptEngine({ analytics }) {

  if (!analytics) {
    return (
      <div style={styles.card}>
        <h3>Teacher Prompt Engine</h3>
        <div style={styles.empty}>Waiting for responses…</div>
      </div>
    );
  }

  const prompts = [];

  if ((analytics.counterargument || 0) < 2) {
    prompts.push({
      type: "Counterargument",
      text: "Does anyone disagree with the claim we just heard?"
    });
  }

  if ((analytics.comparison || 0) < 2) {
    prompts.push({
      type: "Comparison",
      text: "How does this idea compare to another example we studied?"
    });
  }

  if ((analytics.evidence || 0) < 2) {
    prompts.push({
      type: "Evidence",
      text: "What evidence from the lesson supports that idea?"
    });
  }

  if ((analytics.causal || 0) < 2) {
    prompts.push({
      type: "Cause & Effect",
      text: "Why might that happen in the brain?"
    });
  }

  return (

    <div style={styles.card}>

      <h3 style={styles.title}>Teacher Prompt Engine</h3>

      {prompts.length === 0 ? (

        <div style={styles.good}>
          ✓ Discussion is balanced. Ask students to expand on ideas.
        </div>

      ) : (

        prompts.map((p, i) => (

          <div key={i} style={styles.prompt}>

            <div style={styles.type}>
              {p.type}
            </div>

            <div style={styles.text}>
              {p.text}
            </div>

          </div>

        ))

      )}

    </div>

  );

}

const styles = {

  card: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    marginBottom: 20
  },

  title: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: 600
  },

  prompt: {
    padding: 10,
    background: "#f8f9fa",
    borderRadius: 6,
    marginBottom: 10
  },

  type: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#495057",
    marginBottom: 4
  },

  text: {
    fontSize: 14
  },

  good: {
    color: "#2f9e44",
    fontWeight: 500
  },

  empty: {
    color: "#666",
    fontStyle: "italic"
  }

};