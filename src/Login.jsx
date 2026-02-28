import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name || !classCode) {
      alert("Please enter your name and class code.");
      return;
    }

    localStorage.setItem("studentName", name);
    localStorage.setItem("classCode", classCode);

    onLogin({ name, classCode });
  };

  return (
    <div style={{ padding: 40, textAlign: "center", fontFamily: "Arial" }}>
      <h2>ThinkOutLoud</h2>

      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 8, margin: 10 }}
        />

        <br />

        <input
          type="text"
          placeholder="Class Code"
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          style={{ padding: 8, margin: 10 }}
        />

        <br />

        <button
          type="submit"
          style={{ padding: "8px 20px", marginTop: 10 }}
        >
          Enter Class
        </button>
      </form>
    </div>
  );
}
