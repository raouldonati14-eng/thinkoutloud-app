import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  increment
} from "firebase/firestore";

import { db } from "../../firebase";

export default function AutoAdvancePanel({ classId }) {

  const [responses,setResponses] = useState([]);

  useEffect(()=>{

    if(!classId) return;

    const q = query(
      collection(db,"responses"),
      where("classCode","==",classId)
    );

    const unsub = onSnapshot(q,snap=>{

      const data = snap.docs.map(d=>d.data());

      setResponses(data);

    });

    return ()=>unsub();

  },[classId]);

  /* ================= PROGRESS ================= */

  const students =
    [...new Set(responses.map(r=>r.student))];

  const submitted =
    responses.filter(r=>r.status === "submitted");

  const percent =
    students.length
      ? submitted.length / students.length
      : 0;

  const ready = percent >= 0.8;

  /* ================= NEXT QUESTION ================= */

  const nextQuestion = async () => {

    const classRef = doc(db,"classes",classId);

    await updateDoc(classRef,{
      currentQuestion: increment(1),
      questionOpen:false
    });

  };

  if(!ready) return null;

  return(

    <div style={styles.container}>

      <h3>Class Ready to Advance</h3>

      <div style={styles.text}>
        {submitted.length} / {students.length} students submitted
      </div>

      <button
        style={styles.button}
        onClick={nextQuestion}
      >
        Move to Next Question
      </button>

    </div>

  );

}

/* ================= STYLES ================= */

const styles={

  container:{
    marginTop:20,
    padding:20,
    background:"#e7f5ff",
    borderRadius:10,
    boxShadow:"0 6px 18px rgba(0,0,0,0.08)"
  },

  text:{
    marginTop:6,
    marginBottom:10
  },

  button:{
    padding:"8px 14px",
    background:"#339af0",
    border:"none",
    color:"white",
    borderRadius:6,
    cursor:"pointer"
  }

};