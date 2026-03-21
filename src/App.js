import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import StudentView from "./StudentView";
import TeacherView from "./screens/TeacherView";
import AdminDashboard from "./screens/AdminDashboard";
import TeacherLogin from "./TeacherLogin";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 👇 Default = student */}
        <Route path="/" element={<StudentView />} />

        {/* 👇 Teacher login */}
        <Route path="/teacher-login" element={<TeacherLogin />} />

        {/* 👇 Teacher dashboard */}
        <Route
          path="/teacher"
          element={<TeacherView />}
        />

        {/* 👇 Admin */}
        <Route path="/admin" element={<AdminDashboard />} />

      </Routes>
    </BrowserRouter>
  );
}