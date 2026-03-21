import React from "react";

export default function StudentProgressBar({ current, total }) {

  const percent = total ? (current / total) * 100 : 0;

  return (

    <div style={styles.container}>

      <div style={styles.label}>
        Question {current} of {total}
      </div>

      <div style={styles.barBackground}>
        <div
          style={{
            ...styles.barFill,
            width: `${percent}%`
          }}
        />
      </div>

    </div>

  );
}

const styles = {

  container:{
    marginTop:20,
    marginBottom:10
  },

  label:{
    fontSize:14,
    marginBottom:5
  },

  barBackground:{
    height:8,
    background:"#e9ecef",
    borderRadius:6,
    overflow:"hidden"
  },

  barFill:{
    height:8,
    background:"#4dabf7"
  }

};