import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function ReasoningHeatmap({ classId }) {

  const [bands, setBands] = useState({
    high: 0,
    medium: 0,
    low: 0,
    none: 0
  });

  useEffect(() => {

    if (!classId) return;

    const q = query(
      collection(db, "responses"),
      where("classId", "==", classId)
    );

    const unsubscribe = onSnapshot(q, snapshot => {

      let high = 0;
      let medium = 0;
      let low = 0;
      let none = 0;

      snapshot.docs.forEach(doc => {

        const data = doc.data();
        const score = data.score;

        if (score === 3) high++;
        else if (score === 2) medium++;
        else if (score === 1) low++;
        else if (score === 0) none++;

      });

      setBands({ high, medium, low, none });

    });

    return () => unsubscribe();

  }, [classId]);


  return (

    <div style={styles.container}>

      <div style={styles.row}>

        <div style={{...styles.band, background:"#2ecc71"}}>
          High
          <span>{bands.high}</span>
        </div>

        <div style={{...styles.band, background:"#f1c40f"}}>
          Medium
          <span>{bands.medium}</span>
        </div>

        <div style={{...styles.band, background:"#e67e22"}}>
          Low
          <span>{bands.low}</span>
        </div>

        <div style={{...styles.band, background:"#e74c3c"}}>
          None
          <span>{bands.none}</span>
        </div>

      </div>

    </div>

  );

}

const styles = {

  container:{
    padding:10
  },

  row:{
    display:"flex",
    gap:10
  },

  band:{
    flex:1,
    color:"#fff",
    borderRadius:8,
    padding:12,
    textAlign:"center",
    fontWeight:600,
    display:"flex",
    flexDirection:"column",
    gap:6
  }

};