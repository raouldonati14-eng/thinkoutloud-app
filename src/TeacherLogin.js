import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

export default function TeacherLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = async () => {
    console.log("LOGIN CLICKED");

    try {
      setLoginError("");
      const result = await signInWithEmailAndPassword(auth, email, password);

      console.log("LOGIN SUCCESS", result.user);
    } catch (err) {
      console.error("LOGIN ERROR", err.code, err.message);
      const message = "LOGIN ERROR: " + err.code + " - " + err.message;
      setLoginError(message);
      alert(message);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Not logged in</h2>

      {loginError && (
        <div style={{ marginBottom: 12, color: "#c92a2a" }}>
          {loginError}
        </div>
      )}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", marginBottom: 10 }}
      />

      <button onClick={handleLogin}>Force Login</button>
    </div>
  );
}
