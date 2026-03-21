
import React from "react";

export default function DashboardCard({ title, children, span = 6 }) {

  return (

    <div style={{ ...styles.card, gridColumn: `span ${span}` }}>

      {title && (
        <div style={styles.header}>
          <h3>{title}</h3>
        </div>
      )}

      <div>
        {children}
      </div>

    </div>

  );

}

const styles = {

  card: {
    background: "#ffffff",
    borderRadius: 10,
    padding: 20,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
  },

  header: {
    marginBottom: 10
  }

};
