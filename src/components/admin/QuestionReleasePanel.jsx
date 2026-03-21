import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  query
} from "firebase/firestore";
import { db } from "../../firebase";

export default function QuestionReleasePanel() {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "questions"),
      orderBy("category"),
      orderBy("order")
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const loaded = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setQuestions(loaded);
    });

    return () => unsubscribe();
  }, []);

  const toggleField = async (id, field, value) => {
    await updateDoc(doc(db, "questions", id), {
      [field]: !value
    });
  };

  return (
    <div style={{ marginTop: 40 }}>
      <h2>📋 Question Release Control</h2>

      <table border="1" cellPadding="8" width="100%">
        <thead>
          <tr>
            <th>Category</th>
            <th>Order</th>
            <th>Title</th>
            <th>Active</th>
            <th>Released</th>
          </tr>
        </thead>
        <tbody>
          {questions.map(q => (
            <tr key={q.id}>
              <td>{q.category}</td>
              <td>{q.order}</td>
              <td>{q.title}</td>
              <td>
                <button
                  onClick={() =>
                    toggleField(q.id, "active", q.active)
                  }
                >
                  {q.active ? "🟢 Yes" : "🔴 No"}
                </button>
              </td>
              <td>
                <button
                  onClick={() =>
                    toggleField(q.id, "released", q.released)
                  }
                >
                  {q.released ? "🟢 Yes" : "🔴 No"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}