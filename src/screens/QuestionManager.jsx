// ✅ QuestionManager.jsx (SIMPLE VERSION)

import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";

export default function QuestionManager() {

  const [questions, setQuestions] = useState([]);

  const [category, setCategory] = useState("Drugs");
  const [lesson, setLesson] = useState(1);
  const [order, setOrder] = useState(1);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  /* -------- LOAD QUESTIONS -------- */

  useEffect(() => {

    const q = query(
      collection(db, "questions"),
      orderBy("category"),
      orderBy("lesson"),
      orderBy("order")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setQuestions(list);
    });

    return () => unsubscribe();

  }, []);

  /* -------- ADD QUESTION -------- */

  const addQuestion = async () => {

    if (!title.trim() || !text.trim()) {
      alert("Please fill in title and question");
      return;
    }

    try {

      await addDoc(collection(db, "questions"), {
        category,
        lesson: Number(lesson),
        order: Number(order),
        title,
        text,
        active: true
      });

      // reset inputs
      setTitle("");
      setText("");

    } catch (err) {
      console.error("ADD QUESTION ERROR:", err);
      alert("Error adding question");
    }
  };

  /* -------- UI -------- */

  return (
    <div style={{ padding: 30 }}>

      <h2>📚 Question Manager</h2>

      {/* -------- FORM -------- */}

      <div style={styles.card}>

        <h3>Add Question</h3>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={styles.input}
        >
          <option value="Drugs">Drugs</option>
          <option value="Nutrition">Nutrition</option>
          <option value="Mental Health">Mental Health</option>
        </select>

        <input
          type="number"
          placeholder="Lesson #"
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          style={styles.input}
        />

        <input
          type="number"
          placeholder="Question Order"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Question Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={styles.input}
        />

        <textarea
          placeholder="Question Text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ ...styles.input, height: 100 }}
        />

        <button onClick={addQuestion} style={styles.button}>
          Add Question
        </button>

      </div>

      {/* -------- LIST -------- */}

      <div style={{ marginTop: 30 }}>

        <h3>All Questions</h3>

        {questions.length === 0 && (
          <div>No questions yet</div>
        )}

        {questions.map(q => (
          <div key={q.id} style={styles.questionCard}>

            <strong>
              {q.category} | Lesson {q.lesson} | Q{q.order}
            </strong>

            <div style={{ fontWeight: "600", marginTop: 5 }}>
              {q.title}
            </div>

            <div style={{ marginTop: 5 }}>
              {q.text}
            </div>

          </div>
        ))}

      </div>

    </div>
  );
}

/* -------- STYLES -------- */

const styles = {

  card: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    maxWidth: 500
  },

  input: {
    display: "block",
    width: "100%",
    marginBottom: 10,
    padding: 10
  },

  button: {
    padding: "10px 15px",
    cursor: "pointer"
  },

  questionCard: {
    background: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  }

};