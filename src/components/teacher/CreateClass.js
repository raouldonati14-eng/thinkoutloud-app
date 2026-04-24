// ✅ CreateClass.jsx (UPGRADED + PRODUCTION READY)

import React, { useState } from "react";
import { db, auth } from "../../firebase";
import { collection, addDoc, doc, getDoc, setDoc } from "firebase/firestore";

export default function CreateClass() {

  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 safer code generator (avoids duplicates)
  const generateCode = () => {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  const generateUniqueCode = async () => {
    let code;
    let exists = true;

    while (exists) {
      code = generateCode();

      const ref = doc(db, "joinCodes", code);
      const snap = await getDoc(ref);

      exists = snap.exists();
    }

    return code;
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

    setLoading(true);

    // 🔥 ensure unique join code
    const code = await generateUniqueCode();

    const classRef = await addDoc(collection(db, "classes"), {
className: className.trim(),
teacherId: auth.currentUser.uid,

// 🔥 SAFEST VERSION
teacherName:
  auth.currentUser?.displayName ||
  auth.currentUser?.email ||
  "Teacher",

joinCode: code,
createdAt: Date.now(),

// ✅ CORE CLASS STATE
active: true,
classPhase: "instruction",
lessonLocked: false,
questionOpen: false,

// 🔥 REQUIRED FOR QUESTIONS TO WORK
category: "Drugs",
currentLesson: 1,
currentQuestion: 1,

// 🔥 SESSION + FLOW
activeSessionId: null,
spotlightResponseId: null,

// optional but useful
currentQuestionIncrement: true
    });

    await setDoc(doc(db, "joinCodes", code), {
      classId: classRef.id
    });

    setJoinCode(code);
    setLoading(false);
    alert("Class created successfully!");
  } catch (error) {
    alert("Error creating class: " + error.message);
    setLoading(false);
  }
};

return (
  <div style={{ marginBottom: 20 }}>

    <input
      placeholder="New class name"
      value={className}
      onChange={(e) => setClassName(e.target.value)}
      style={{ padding: 10, marginRight: 10 }}
    />

    <button onClick={createClass} disabled={loading}>
      {loading ? "Creating..." : "Create Class"}
    </button>

    {joinCode && (
      <div style={{ marginTop: 10 }}>
        <strong>Join Code:</strong> {joinCode}
      </div>
    )}

  </div>
);
}
