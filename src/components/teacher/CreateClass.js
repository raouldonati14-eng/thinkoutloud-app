// ✅ CreateClass.jsx (UPGRADED + PRODUCTION READY)

import React, { useState } from "react";
import { auth } from "../../firebase";
import { createClassWithCode } from "../../utils/createClassWithCode";

export default function CreateClass() {

  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

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

    const { joinCode: code } = await createClassWithCode({
      className: className.trim(),
      teacherId: auth.currentUser.uid,
      teacherName:
        auth.currentUser?.displayName ||
        auth.currentUser?.email ||
        "Teacher"
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
