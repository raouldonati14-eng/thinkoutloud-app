import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function LiveQuestionTimer({ classId }) {

  const [remaining, setRemaining] = useState(null);

  useEffect(() => {

    if (!classId) return;

    const classRef = doc(db,"classes",classId);

    const unsubscribe = onSnapshot(classRef, snap => {

      const data = snap.data();

      if(!data?.questionTimerEnd){
        setRemaining(null);
        return;
      }

      const end = data.questionTimerEnd.toDate().getTime();

      const interval = setInterval(()=>{

        const now = Date.now();
        const diff = Math.max(0, Math.floor((end-now)/1000));

        setRemaining(diff);

      },1000);

      return ()=>clearInterval(interval);

    });

    return ()=>unsubscribe();

  },[classId]);

  if(remaining === null) return null;

  const minutes = Math.floor(remaining/60);
  const seconds = remaining % 60;

  return (

    <div style={styles.container}>

      <h3>Question Timer</h3>

      <div style={styles.timer}>

        ⏱ {minutes}:{seconds.toString().padStart(2,"0")}

      </div>

    </div>

  );

}

const styles={

  container:{
    marginTop:20,
    padding:20,
    background:"#fff",
    borderRadius:10,
    boxShadow:"0 6px 18px rgba(0,0,0,0.08)"
  },

  timer:{
    fontSize:28,
    fontWeight:"bold"
  }

};