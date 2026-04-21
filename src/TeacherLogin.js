import React, { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { auth, authPersistenceReady } from "./firebase";

export default function TeacherLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribe = () => {};

    const initAuth = async () => {
      try {
        await authPersistenceReady;
      } catch (error) {
        console.error("AUTH READY ERROR", error);
      }

      unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log("TEACHER LOGIN AUTH STATE", user);
        if (user) {
          navigate("/teacher");
        }
        setLoading(false);
      });
    };

    initAuth();

    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async () => {
    console.log("LOGIN CLICKED");

    try {
      setIsSubmitting(true);
      setLoginError("");
      await authPersistenceReady;
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      console.log("LOGIN SUCCESS", result.user);
      navigate("/teacher");
    } catch (err) {
      console.error("LOGIN ERROR", err.code, err.message);
      const message = "LOGIN ERROR: " + err.code + " - " + err.message;
      setLoginError(message);
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

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

      <button onClick={handleLogin} disabled={isSubmitting}>
        {isSubmitting ? "Logging in..." : "Force Login"}
      </button>
    </div>
  );
}
