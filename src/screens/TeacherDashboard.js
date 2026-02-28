import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db, auth } from "../firebase";
import ClassManager from "../components/teacher/ClassManager";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ================= AUDIO PLAYER ================= */

function AudioPlayer({ url }) {
  if (!url) return <span style={{ color: "red" }}>No audio</span>;
  return <audio controls style={{ width: 150 }} src={url} />;
}

/* ================= DASHBOARD ================= */

export default function TeacherDashboard() {
  const teacher = auth.currentUser;

  const [responses, setResponses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassCode, setSelectedClassCode] = useState(null);
  const [filterStudent, setFilterStudent] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  /* ================= LOAD CLASSES ================= */

  useEffect(() => {
    if (!teacher) return;

    const loadClasses = async () => {
      const q = query(
        collection(db, "classes"),
        where("teacherId", "==", teacher.uid)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setClasses(list);

      if (list.length && !selectedClassCode) {
        setSelectedClassCode(list[0].id);
      }
    };

    loadClasses();
  }, [teacher]);

  /* ================= LOAD RESPONSES ================= */

  useEffect(() => {
    if (!selectedClassCode) return;

    const q = query(
      collection(db, "responses"),
      where("classCode", "==", selectedClassCode),
      where("deleted", "!=", true)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setResponses(data);
    });

    return () => unsubscribe();
  }, [selectedClassCode]);

  const currentClass = classes.find(c => c.id === selectedClassCode);

  /* ================= ANALYTICS ================= */

  const analytics = useMemo(() => {
    if (!responses.length) return null;

    const total = responses.length;
    const scores = responses.map(r => r.score || 0);

    const avgScore =
      scores.reduce((sum, s) => sum + s, 0) / total;

    const reasoningPercent =
      Math.round(
        (responses.filter(r => r.reasoningDetected).length / total) * 100
      );

    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    const scoreDistribution = {
      level3: scores.filter(s => s === 3).length,
      level2: scores.filter(s => s === 2).length,
      level1: scores.filter(s => s === 1).length,
      level0: scores.filter(s => s === 0).length
    };

    const students = {};
    responses.forEach(r => {
      if (!students[r.student]) students[r.student] = [];
      students[r.student].push(r);
    });

    let growthSum = 0;
    let growthCount = 0;

    Object.values(students).forEach(attempts => {
      const sorted = attempts
        .filter(a => a.timestamp)
        .sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());

      if (sorted.length >= 2) {
        const first = sorted[0].score || 0;
        const last = sorted[sorted.length - 1].score || 0;
        growthSum += (last - first);
        growthCount++;
      }
    });

    const avgGrowth =
      growthCount > 0 ? (growthSum / growthCount).toFixed(2) : null;

    return {
      avgScore: avgScore.toFixed(2),
      reasoningPercent,
      total,
      maxScore,
      minScore,
      scoreDistribution,
      avgGrowth
    };
  }, [responses]);
/* ================= PERFORMANCE BANDS ================= */

const performanceBands = useMemo(() => {
  if (!analytics) return null;

  const total = analytics.total;

  const percent = (count) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  return {
    advanced: {
      count: analytics.scoreDistribution.level3,
      percent: percent(analytics.scoreDistribution.level3)
    },
    proficient: {
      count: analytics.scoreDistribution.level2,
      percent: percent(analytics.scoreDistribution.level2)
    },
    emerging: {
      count: analytics.scoreDistribution.level1,
      percent: percent(analytics.scoreDistribution.level1)
    },
    foundational: {
      count: analytics.scoreDistribution.level0,
      percent: percent(analytics.scoreDistribution.level0)
    }
  };
}, [analytics]);
  /* ================= GROWTH CHART DATA ================= */

  const growthChartData = useMemo(() => {
    if (!responses.length) return [];

    const students = {};
    responses.forEach(r => {
      if (!students[r.student]) students[r.student] = [];
      students[r.student].push(r);
    });

    let maxAttempts = 0;

    Object.values(students).forEach(attempts => {
      if (attempts.length > maxAttempts) {
        maxAttempts = attempts.length;
      }
    });

    const chartData = [];

    for (let i = 0; i < maxAttempts; i++) {
      let totalScore = 0;
      let count = 0;

      Object.values(students).forEach(attempts => {
        const sorted = attempts
          .filter(a => a.timestamp)
          .sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());

        if (sorted[i]) {
          totalScore += sorted[i].score || 0;
          count++;
        }
      });

      if (count > 0) {
        chartData.push({
          attempt: `Attempt ${i + 1}`,
          average: Number((totalScore / count).toFixed(2))
        });
      }
    }

    return chartData;
  }, [responses]);

  /* ================= CLASS EXECUTIVE SUMMARY ================= */

  const generateClassExecutiveSummary = () => {
  if (!analytics) return "No data available.";

  const avg = parseFloat(analytics.avgScore);
  const reasoning = analytics.reasoningPercent;
  const growth = analytics.avgGrowth;
  const range = analytics.maxScore - analytics.minScore;
  const total = analytics.total;
  const dist = analytics.scoreDistribution;

  /* ===== PERFORMANCE LEVEL ===== */
  let performanceDescriptor = "developing foundational understanding";
  if (avg >= 2.6) performanceDescriptor = "strong conceptual mastery";
  else if (avg >= 2.2) performanceDescriptor = "proficient grade-level understanding";
  else if (avg >= 1.7) performanceDescriptor = "emerging conceptual understanding";

  /* ===== REASONING ANALYSIS ===== */
  let reasoningDescriptor = "limited evidence of structured reasoning";
  if (reasoning >= 75) reasoningDescriptor = "consistent and well-articulated analytical reasoning";
  else if (reasoning >= 60) reasoningDescriptor = "developing analytical reasoning patterns";
  else if (reasoning >= 45) reasoningDescriptor = "inconsistent use of reasoning language";

  /* ===== GROWTH INTERPRETATION ===== */
  let growthNarrative = "Growth data is limited due to single recorded attempts.";
  if (growth !== null) {
    const g = parseFloat(growth);
    if (g >= 0.4)
      growthNarrative = "Class-wide performance demonstrates strong upward academic momentum across repeated attempts.";
    else if (g > 0)
      growthNarrative = "Performance trends indicate measurable incremental improvement.";
    else if (g === 0)
      growthNarrative = "Performance levels remain stable across assessment opportunities.";
    else
      growthNarrative = "Recent attempts indicate a slight decline, suggesting instructional recalibration may be beneficial.";
  }

  /* ===== DISTRIBUTION INSIGHT ===== */
  const highPerformers = dist.level3;
  const foundational = dist.level0 + dist.level1;

  let distributionInsight = "";
  if (highPerformers / total >= 0.4) {
    distributionInsight =
      "A substantial proportion of students are performing at the highest proficiency level, indicating strong instructional alignment.";
  } else if (foundational / total >= 0.4) {
    distributionInsight =
      "A notable portion of students remain in foundational or emerging performance bands, indicating opportunity for targeted scaffolding.";
  } else {
    distributionInsight =
      "Performance distribution reflects a balanced range of proficiency levels across the class.";
  }

  /* ===== VARIABILITY ANALYSIS ===== */
  const variabilityInsight =
    range >= 2
      ? "Performance variability suggests differentiated instructional strategies may further optimize outcomes."
      : "Achievement levels are relatively consistent across the class cohort.";

  return `
EXECUTIVE SUMMARY

Overall Academic Performance  
Across ${total} recorded responses, the class demonstrates ${performanceDescriptor}, with an average score of ${analytics.avgScore} out of 3.

Reasoning & Analytical Development  
Students exhibit ${reasoningDescriptor}, with ${reasoning}% of responses containing identifiable reasoning structures aligned with academic discourse expectations.

Achievement Distribution  
Level 3 (Advanced): ${dist.level3}  
Level 2 (Proficient): ${dist.level2}  
Level 1 (Emerging): ${dist.level1}  
Level 0 (Foundational): ${dist.level0}

Growth Trends  
Average score change across repeated attempts: ${growth ?? "N/A"}  
${growthNarrative}

Instructional & Administrative Insight  
${distributionInsight}  
${variabilityInsight}

Overall, current instructional strategies are supporting conceptual understanding development, with continued emphasis on structured reasoning likely to further elevate student mastery.
`;
};

  /* ================= CLASS PDF EXPORT ================= */

  const downloadClassPDF = () => {
    if (!analytics) return;

    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.text("Think Out Loud - Class Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Class: ${currentClass?.className}`, 20, 35);
    doc.text(`Generated: ${today}`, 20, 45);
    doc.text(`Average Score: ${analytics.avgScore}/3`, 20, 55);
    doc.text(`Reasoning: ${analytics.reasoningPercent}%`, 20, 65);
    doc.text(`Growth: ${analytics.avgGrowth ?? "N/A"}`, 20, 75);

    autoTable(doc, {
      startY: 85,
      head: [["Level 3", "Level 2", "Level 1", "Level 0"]],
      body: [[
        analytics.scoreDistribution.level3,
        analytics.scoreDistribution.level2,
        analytics.scoreDistribution.level1,
        analytics.scoreDistribution.level0
      ]]
    });

    doc.text("Executive Summary:", 20, doc.lastAutoTable.finalY + 15);

    const summary = doc.splitTextToSize(
      generateClassExecutiveSummary(),
      170
    );

    doc.text(summary, 20, doc.lastAutoTable.finalY + 25);

    doc.save(`${currentClass?.className}_Class_Report.pdf`);
  };

  /* ================= FILTER ================= */

  const filteredResponses = useMemo(() => {
    if (!filterStudent) return responses;
    return responses.filter(r =>
      r.student.toLowerCase().includes(filterStudent.toLowerCase())
    );
  }, [responses, filterStudent]);

  /* ================= RESET / RESTORE ================= */

  const handleReset = async () => {
    const functions = getFunctions();
    const resetClassData = httpsCallable(functions, "resetClassData");
    await resetClassData({ classCode: selectedClassCode });
    alert("Class reset complete.");
  };

  const handleRestore = async () => {
    const functions = getFunctions();
    const restoreClassData = httpsCallable(functions, "restoreClassData");
    await restoreClassData({ classCode: selectedClassCode });
    alert("Class restored.");
  };

  /* ================= STUDENT PDF ================= */

  const downloadStudentPDF = (response) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Think Out Loud - Student Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Student: ${response.student}`, 20, 35);
    doc.text(`Class: ${currentClass?.className}`, 20, 45);
    doc.text(`Score: ${response.score}/3`, 20, 55);

    doc.save(`${response.student}_Report.pdf`);
  };

  /* ================= UI ================= */

return (
  <div style={{ padding: 30 }}>
    <h2>📊 Teacher Dashboard</h2>

    <div style={{ marginBottom: 15 }}>
      <button onClick={handleReset} style={styles.red}>🔁 Reset</button>
      <button onClick={handleRestore} style={styles.green}>🧠 Restore</button>
      <button onClick={downloadClassPDF} style={styles.blue}>📄 Download Class Report</button>
    </div>

    <div style={{ marginBottom: 25 }}>
      <ClassManager />
    </div>

    {analytics && (
      <>
        <div style={styles.summary}>
          <strong>Average Score:</strong> {analytics.avgScore} |
          <strong> Reasoning:</strong> {analytics.reasoningPercent}%
          <div style={styles.execBox}>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {generateClassExecutiveSummary()}
            </pre>
          </div>
        </div>

        {performanceBands && (
          <div style={styles.bandContainer}>
            <h3>📊 Performance Bands</h3>

            {[
              { label: "Advanced (Level 3)", data: performanceBands.advanced, color: "#2ecc71" },
              { label: "Proficient (Level 2)", data: performanceBands.proficient, color: "#3498db" },
              { label: "Emerging (Level 1)", data: performanceBands.emerging, color: "#f39c12" },
              { label: "Foundational (Level 0)", data: performanceBands.foundational, color: "#e74c3c" }
            ].map((band, i) => (
              <div key={i} style={styles.bandRow}>
                <div style={styles.bandLabel}>
                  {band.label} — {band.data.count} students ({band.data.percent}%)
                </div>
                <div style={styles.bandBarBackground}>
                  <div
                    style={{
                      ...styles.bandBarFill,
                      width: `${band.data.percent}%`,
                      backgroundColor: band.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {growthChartData.length > 1 && (
          <div style={{ marginBottom: 40 }}>
            <h3>📈 Class Growth Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthChartData}>
                <XAxis dataKey="attempt" />
                <YAxis domain={[0, 3]} />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </>
    )}

    <input
      placeholder="Search student..."
      value={filterStudent}
      onChange={e => setFilterStudent(e.target.value)}
      style={styles.search}
    />

    <table border="1" cellPadding="8" width="100%">
      <thead>
        <tr>
          <th>Student</th>
          <th>Score</th>
          <th>Audio</th>
          <th>PDF</th>
        </tr>
      </thead>
      <tbody>
        {filteredResponses.map(r => (
          <tr key={r.id}>
            <td>{r.student}</td>
            <td>{r.score}</td>
            <td><AudioPlayer url={r.audioURL} /></td>
            <td>
              <button onClick={() => downloadStudentPDF(r)}>📄</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
}

/* ================= STYLES ================= */

const styles = {
  red: { background: "#e74c3c", color: "white", padding: "8px 12px", border: "none", borderRadius: 6, marginRight: 10 },
  green: { background: "#2ecc71", color: "white", padding: "8px 12px", border: "none", borderRadius: 6, marginRight: 10 },
  blue: { background: "#3498db", color: "white", padding: "8px 12px", border: "none", borderRadius: 6, marginRight: 10 },
  summary: { padding: 12, background: "#f1f3f5", marginBottom: 20, borderRadius: 6 },
  search: { padding: 10, marginBottom: 20, width: "100%", maxWidth: 300 },
  execBox: { marginTop: 10, padding: 10, background: "#fff", borderRadius: 6 }
};