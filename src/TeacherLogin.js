import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate } from "react-router-dom";

export default function TeacherLogin() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate(); // ✅ NEW

  const handleLogin = async () => {

    console.log("LOGIN CLICKED");

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, email, password);

      console.log("LOGIN SUCCESS");

      // ✅ THIS FIXES YOUR PROBLEM
      navigate("/teacher");

    } catch (error) {

      console.error("LOGIN ERROR:", error);
      alert(error.message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>

      <h2>Teacher Login</h2>

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

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>

    </div>
  );
}