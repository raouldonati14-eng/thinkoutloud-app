
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function TeacherClasses(){

  const [classes,setClasses]=useState([]);
  const navigate = useNavigate();

  useEffect(()=>{

    const loadClasses = async ()=>{

      const q=query(
        collection(db,"classes"),
        where("teacherId","==",auth.currentUser.uid)
      );

      const snap=await getDocs(q);

      const list=snap.docs.map(doc=>({
        id:doc.id,
        ...doc.data()
      }));

      setClasses(list);

    };

    loadClasses();

  },[]);

  return(

    <div style={styles.page}>

      <h1>My Classes</h1>

      <div style={styles.grid}>

        {classes.map(c=>(
          <div
            key={c.id}
            style={styles.card}
            onClick={()=>navigate(`/class/${c.id}`)}
          >
            <h3>{c.className}</h3>
            <p>{c.category}</p>
          </div>
        ))}

      </div>

    </div>

  );

}

const styles={

  page:{
    padding:30
  },

  grid:{
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
    gap:20,
    marginTop:20
  },

  card:{
    background:"#fff",
    padding:20,
    borderRadius:10,
    boxShadow:"0 6px 18px rgba(0,0,0,0.08)",
    cursor:"pointer"
  }

};