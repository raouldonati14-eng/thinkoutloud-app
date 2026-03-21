// ✅ ClassManager.jsx (FULL WORKING VERSION WITH JOIN CODE)

import { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ClassManager() {

  const [user, setUser] = useState(null);
  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      console.log("AUTH STATE:", u);
      setUser(u);
    });
    return () => unsub();
  }, []);

  // ✅ Generate simple join code
  const generateCode = () => {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  const createClass = async () => {

    if (!auth.currentUser) {
      alert("You must be logged in");
      return;
    }

    if (!className.trim()) {
      alert("Enter a class name");
      return;
    }

    try {

      const code = generateCode();

      console.log("GENERATED CODE:", code);

      // ✅ Create class
      const classRef = await addDoc(collection(db, "classes"), {
        name: className,
        teacherId: auth.currentUser.uid,
        joinCode: code,
        createdAt: Date.now(),
        classPhase: "instruction",
        questionOpen: false
      });

      console.log("CLASS CREATED:", classRef.id);

      // ✅ Create join code mapping
      await setDoc(doc(db, "joinCodes", code), {
        classId: classRef.id
      });

      console.log("JOIN CODE SAVED");

      // ✅ Update UI
      setJoinCode(code);

    } catch (err) {

      console.error("CREATE CLASS ERROR:", err);
      alert(err.message);

    }
  };

  return (
    <div style={{ padding: 20 }}>

      <h2>Create Class</h2>

      <input
        placeholder="Class Name"
        value={className}
        onChange={(e) => setClassName(e.target.value)}
        style={{ padding: 10, marginRight: 10 }}
      />

      <button onClick={createClass}>
        Create Class
      </button>

      {/* ✅ SHOW JOIN CODE */}
      {joinCode && (
        <div style={{ marginTop: 20 }}>
          <h3>Join Code:</h3>
          <div style={{
            fontSize: 24,
            fontWeight: "bold",
            letterSpacing: 2
          }}>
            {joinCode}
          </div>
        </div>
      )}

    </div>
  );
}