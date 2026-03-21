import React from "react";

function LiveTranscriptFeed({ responses }) {

  if (!responses?.length) {
    return (
      <div style={styles.card}>
        <strong>Live Transcript</strong>
        <div style={{ marginTop: 10, color: "#666" }}>
          No responses yet.
        </div>
      </div>
    );
  }

  return (

    <div style={styles.card}>

      <strong>Live Transcript</strong>

      <div style={styles.feed}>

        {responses.map((r) => (

          <div key={r.id} style={styles.entry}>

            <div style={styles.student}>
              {r.student}
            </div>

            <div style={styles.text}>
              {r.transcript || "Recording..."}
            </div>

          </div>

        ))}

      </div>

    </div>

  );

}

export default React.memo(LiveTranscriptFeed);

/* -------- STYLES -------- */

const styles = {

  card: {
    background: "white",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px"
  },

  feed: {
    marginTop: 10,
    maxHeight: 300,
    overflowY: "auto"
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
    color: "#444",
    fontSize: 14
  }

};