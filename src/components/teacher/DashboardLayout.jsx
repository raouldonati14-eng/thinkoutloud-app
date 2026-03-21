
import React from "react";

export default function DashboardLayout({ children }) {

  return (
    <div style={styles.grid}>
      {children}
    </div>
  );

}

const styles = {

  grid: {

    display: "grid",

    gridTemplateColumns: "repeat(12, 1fr)",

    gap: 20

  }

};