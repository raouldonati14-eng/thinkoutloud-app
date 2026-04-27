import { useEffect, useState } from "react";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createClassWithCode } from "../../utils/createClassWithCode";

export default function ClassManager() {

  const [user, setUser] = useState(null);
  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      console.log("AUTH STATE:", u);
      setUser(u);
    });
    return () => unsub();
  }, []);

  const createClass = async () => {

    if (!user) {
      alert("Auth not ready yet");
      return;
    }

    if (!className.trim()) {
      alert("Enter a class name");
      return;
    }

    try {
      console.log("AUTH USER:", user);

      const { classId, joinCode: code } = await createClassWithCode({
        className: className.trim(),
        teacherId: user.uid,
        teacherName: user.displayName || user.email || "Teacher"
      });

      console.log("CLASS CREATED:", classId);

      setJoinCode(code);

    } catch (err) {
      console.error("CREATE CLASS ERROR:", err);
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>

      <h2>Create Class</h2>

      <input
        placeholder="Class Name"
        value={className}
        onChange={(e) => setClassName(e.target.value)}
        style={{ padding: 10, marginRight: 10 }}
      />

      <button onClick={createClass} disabled={!user}>
        Create Class
      </button>

      {joinCode && (
        <div style={{ marginTop: 20 }}>
          <h3>Join Code:</h3>
          <div style={{
            fontSize: 24,
            fontWeight: "bold",
            letterSpacing: 2
          }}>
            {joinCode}
          </div>
        </div>
      )}

    </div>
  );
}
