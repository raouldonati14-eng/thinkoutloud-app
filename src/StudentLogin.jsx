import React, { useState } from "react";

export default function StudentLogin({ onLogin }) {
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    localStorage.setItem("studentName", name.trim());
    onLogin(name.trim());
  };

  return (
    <div style={{ padding: 40, textAlign: "center", fontFamily: "Arial" }}>
      <h2>🎤 ThinkOutLoud</h2>
      <p>Please enter your name to begin:</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="First and Last Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 8, width: 250 }}
        />
        <br /><br />
        <button type="submit" style={{ padding: "8px 16px" }}>
          Start
        </button>
      </form>
    </div>
  );
}
