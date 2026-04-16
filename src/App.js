import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import StudentView from "./StudentView";
import TeacherView from "./screens/TeacherView";
import AdminDashboard from "./screens/AdminDashboard";
import TeacherLogin from "./TeacherLogin";
import QuestionLibrary from "./pages/QuestionLibrary";
import FixClasses from "./pages/FixClasses";
import { auth } from "./firebase";

export default function App() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("GLOBAL AUTH STATE", user);
    });

    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudentView />} />
        <Route path="/student" element={<StudentView />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />
        <Route path="/teacher" element={<TeacherView />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/question-library" element={<QuestionLibrary />} />
        <Route path="/fix-classes" element={<FixClasses />} />
      </Routes>
    </BrowserRouter>
  );
}