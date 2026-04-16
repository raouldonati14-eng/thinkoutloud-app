import React, { useState, useEffect } from "react";
import questionsData from "../data/questions.json";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  query,
  where
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { buildQuestionPrompts } from "../utils/questionPrompts";

export default function QuestionLibrary() {
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newLesson, setNewLesson] = useState("");
  const [customQuestions, setCustomQuestions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");

  // 🔥 LOAD FIRESTORE QUESTIONS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "questions"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomQuestions(list);
    });
    return () => unsubscribe();
  }, []);

  // 🔥 LOAD TEACHER CLASSES (waits for auth)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const q = query(
        collection(db, "classes"),
        where("teacherId", "==", user.uid)
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClasses(list);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  // 🔥 TOGGLE CLASS SELECTION
  const toggleClass = (id) => {
    setSelectedClasses(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // 🔥 MULTI-CLASS ASSIGN
  const handleAssign = async (question) => {
    if (selectedClasses.length === 0) {
      alert("Select at least one class");
      return;
    }

    try {
      const prompts = buildQuestionPrompts(question.text, question.category);

      for (const classId of selectedClasses) {
        const classRef = doc(db, "classes", classId);
        const sessionRef = doc(collection(db, "classes", classId, "sessions"));

        await setDoc(sessionRef, {
          questionText: question.text,
          questionId: question.id || null,
          category: question.category,
          lesson: question.lesson || 1,
          discussionPrompts: prompts.discussionPrompts,
          reflectionPrompts: prompts.reflectionPrompts,
          createdAt: Date.now()
        });

        await updateDoc(classRef, {
          activeSessionId: sessionRef.id,
          essentialQuestion: question.text,
          category: question.category,
          currentLesson: question.lesson || 1,
          currentQuestion: 1,
          discussionPrompts: prompts.discussionPrompts,
          reflectionPrompts: prompts.reflectionPrompts,
          questionOpen: true
        });
      }

      alert("✅ Assigned to selected classes!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to assign");
    }
  };

  // 🔥 CREATE QUESTION
  const handleCreateQuestion = async () => {
    if (!newQuestion.trim() || !newCategory.trim()) return;

    try {
      const docRef = await addDoc(collection(db, "questions"), {
        text: newQuestion,
        category: newCategory,
        lesson: parseInt(newLesson) || 1,
        createdBy: auth.currentUser?.uid || "teacher",
        createdAt: Date.now()
      });

      const newQ = {
        id: docRef.id,
        text: newQuestion,
        category: newCategory,
        lesson: parseInt(newLesson) || 1
      };

      setNewQuestion("");
      setNewCategory("");
      setNewLesson("");

      if (selectedClasses.length > 0) {
        await handleAssign(newQ);
      }
    } catch (err) {
      console.error(err);
      alert("Error adding question");
    }
  };

  // 🔥 MERGE QUESTIONS
  const allQuestions = [
    ...customQuestions,
    ...questionsData.filter(q =>
      !customQuestions.some(cq => cq.text === q.text)
    )
  ];

  // 🔥 UNIQUE CATEGORIES FOR FILTER
  const categories = [
    "All",
    ...Array.from(new Set(allQuestions.map(q => q.category).filter(Boolean)))
  ];

  const filteredQuestions = allQuestions
    .filter(q => {
      if (showOnlyMine) return q.createdBy === auth.currentUser?.uid;
      return true;
    })
    .filter(q => categoryFilter === "All" || q.category === categoryFilter);

  return (
    <div style={{ padding: 30 }}>
      <h1>📚 Question Library</h1>

      {/* 🏫 CLASS SELECTOR */}
      <div style={{ marginBottom: 30, padding: 20, border: "1px solid #ddd", borderRadius: 10 }}>
        <h3>🏫 Select Classes to Assign To</h3>

        {classes.length === 0 ? (
          <p style={{ color: "#999", fontSize: 14 }}>No classes found.</p>
        ) : (
          classes.map(c => (
            <div key={c.id} style={{ marginBottom: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={selectedClasses.includes(c.id)}
                  onChange={() => toggleClass(c.id)}
                />
                <span>
                  <strong>{c.name || "Unnamed Class"}</strong>
                  {c.category && (
                    <span style={{ color: "#888", fontSize: 13, marginLeft: 8 }}>
                      {c.category} — Lesson {c.currentLesson || 1}
                    </span>
                  )}
                </span>
              </label>
            </div>
          ))
        )}
      </div>

      {/* ➕ CREATE QUESTION */}
      <div style={{ marginBottom: 30, padding: 20, border: "1px solid #ddd", borderRadius: 10 }}>
        <h3>➕ Create New Question</h3>

        <input
          placeholder="Category (e.g. Drugs)"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          style={{ width: "100%", marginBottom: 10, padding: 8 }}
        />

        <input
          placeholder="Lesson number (e.g. 1)"
          value={newLesson}
          onChange={(e) => setNewLesson(e.target.value)}
          type="number"
          min="1"
          style={{ width: "100%", marginBottom: 10, padding: 8 }}
        />

        <textarea
          placeholder="Enter question..."
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          style={{ width: "100%", marginBottom: 10, padding: 8, minHeight: 80 }}
        />

        <button onClick={handleCreateQuestion}>Save Question</button>
      </div>

      {/* FILTERS */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={() => setShowOnlyMine(prev => !prev)}
          style={{
            padding: "8px 12px", borderRadius: 6, border: "none", cursor: "pointer",
            background: showOnlyMine ? "#228be6" : "#e9ecef",
            color: showOnlyMine ? "white" : "#333"
          }}
        >
          {showOnlyMine ? "Showing: My Questions" : "Show My Questions"}
        </button>

        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: "8px 12px", borderRadius: 20, border: "none", cursor: "pointer",
              background: categoryFilter === cat ? "#228be6" : "#e9ecef",
              color: categoryFilter === cat ? "white" : "#333",
              fontSize: 13
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 📚 QUESTIONS */}
      <div>
        {filteredQuestions.map((q, index) => (
          <div
            key={q.id || `${q.text}-${index}`}
            style={{
              border: "1px solid #ddd", borderRadius: 10,
              padding: 16, marginBottom: 12
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: "bold", fontSize: 13, color: "#1864ab" }}>
                  {q.category}
                  {q.lesson && (
                    <span style={{ marginLeft: 8, color: "#888", fontWeight: "normal" }}>
                      Lesson {q.lesson}
                    </span>
                  )}
                  {q.createdBy && " 🧑‍🏫"}
                </div>
                <div style={{ marginTop: 6, fontSize: 15 }}>{q.text}</div>
              </div>

              <button
                onClick={() => handleAssign(q)}
                style={{
                  marginLeft: 16, padding: "8px 14px", borderRadius: 6,
                  border: "none", background: "#228be6", color: "white",
                  fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap"
                }}
              >
                Assign
              </button>
            </div>
          </div>
        ))}

        {filteredQuestions.length === 0 && (
          <div style={{ color: "#999" }}>No questions match this filter.</div>
        )}
      </div>
    </div>
  );
}