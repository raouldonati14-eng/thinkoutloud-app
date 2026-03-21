import React, { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

import { db } from "../firebase";

export default function StudentJoinScreen({ onJoin }) {

  const [joinCode,setJoinCode] = useState("");
  const [student,setStudent] = useState("");
  const [error,setError] = useState(null);
  const [loading,setLoading] = useState(false);

  const handleJoin = async () => {

    if(!joinCode || !student){
      setError("Enter class code and name");
      return;
    }

    setLoading(true);
    setError(null);

    try{

      const q = query(
        collection(db,"classes"),
        where("joinCode","==",joinCode.trim().toUpperCase())
      );

      const snap = await getDocs(q);

      if(snap.empty){
        setError("Class not found");
        setLoading(false);
        return;
      }

      const classDoc = snap.docs[0];

      const classId = classDoc.id;

      onJoin({
        classId,
        student
      });

    }catch(err){

      console.error(err);
      setError("Error joining class");

    }

    setLoading(false);

  };

  return(

    <div style={styles.container}>

      <div style={styles.card}>

        <h2>Think Out Loud</h2>

        <p>Join your class</p>

        <input
          placeholder="Class Code"
          value={joinCode}
          onChange={e=>setJoinCode(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Your Name"
          value={student}
          onChange={e=>setStudent(e.target.value)}
          style={styles.input}
        />

        <button
          onClick={handleJoin}
          style={styles.button}
          disabled={loading}
        >
          {loading ? "Joining..." : "Join Lesson"}
        </button>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

      </div>

    </div>

  );

}

const styles = {

  container:{
    display:"flex",
    justifyContent:"center",
    alignItems:"center",
    height:"100vh",
    background:"#f8f9fb"
  },

  card:{
    background:"white",
    padding:40,
    borderRadius:12,
    width:320,
    textAlign:"center",
    boxShadow:"0 8px 24px rgba(0,0,0,0.08)"
  },

  input:{
    width:"100%",
    padding:10,
    marginTop:10,
    borderRadius:6,
    border:"1px solid #ddd"
  },

  button:{
    marginTop:15,
    padding:10,
    width:"100%",
    background:"#4dabf7",
    color:"white",
    border:"none",
    borderRadius:6,
    cursor:"pointer"
  },

  error:{
    marginTop:10,
    color:"red"
  }

};