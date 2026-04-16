import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

import { db } from  "../../firebase";

export default function ClassProgressBar({ classId }) {

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

  const recording =
    responses.filter(r=>r.status==="recording").length;

  const submitted =
    responses.filter(r=>r.status==="submitted").length;

  const totalStudents =
    [...new Set(responses.map(r=>r.student))].length || 1;

  const recordingPercent =
    (recording / totalStudents) * 100;

  const submittedPercent =
    (submitted / totalStudents) * 100;

  return(

    <div style={styles.container}>

      <h3>Class Progress</h3>

      <div style={styles.block}>

        <div style={styles.label}>
          Recording {recording} / {totalStudents}
        </div>

        <div style={styles.barBackground}>
          <div
            style={{
              ...styles.recordingFill,
              width:`${recordingPercent}%`
            }}
          />
        </div>

      </div>

      <div style={styles.block}>

        <div style={styles.label}>
          Submitted {submitted} / {totalStudents}
        </div>

        <div style={styles.barBackground}>
          <div
            style={{
              ...styles.submittedFill,
              width:`${submittedPercent}%`
            }}
          />
        </div>

      </div>

    </div>

  );

}

const styles = {

  container:{
    marginTop:20,
    padding:20,
    background:"#fff",
    borderRadius:10,
    boxShadow:"0 6px 18px rgba(0,0,0,0.08)"
  },

  block:{
    marginTop:12
  },

  label:{
    marginBottom:6
  },

  barBackground:{
    height:10,
    background:"#e9ecef",
    borderRadius:6
  },

  recordingFill:{
    height:10,
    background:"#f59f00"
  },

  submittedFill:{
    height:10,
    background:"#40c057"
  }

};