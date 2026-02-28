import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";
import { db } from "../firebase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function AdminDashboard({ roleData }) {
  const [responses, setResponses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  /* ================= LOAD SCHOOL RESPONSES ================= */
  useEffect(() => {
    if (!roleData?.schoolId) return;

    const q = query(
      collection(db, "responses"),
      where("schoolId", "==", roleData.schoolId)
    );

    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setResponses(data);
    });

    return () => unsub();
  }, [roleData]);

  /* ================= LOAD TEACHERS ================= */
  useEffect(() => {
    if (!roleData?.schoolId) return;

    const q = query(
      collection(db, "teachers"),
      where("schoolId", "==", roleData.schoolId)
    );

    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeachers(data);
    });

    return () => unsub();
  }, [roleData]);

  /* ================= ANALYTICS ================= */
  const analytics = useMemo(() => {
    if (!responses.length) return null;

    let totalScore = 0;
    const studentSet = new Set();
    const teacherStats = {};

    responses.forEach(r => {
      totalScore += r.score || 0;
      studentSet.add(r.student);

      if (!teacherStats[r.teacherId]) {
        teacherStats[r.teacherId] = {
          count: 0,
          totalScore: 0
        };
      }

      teacherStats[r.teacherId].count += 1;
      teacherStats[r.teacherId].totalScore += r.score || 0;
    });

    const schoolAvg = (totalScore / responses.length).toFixed(2);

    const teacherLeaderboard = Object.entries(teacherStats)
      .map(([teacherId, data]) => ({
        teacherId,
        avg: data.totalScore / data.count
      }))
      .sort((a, b) => b.avg - a.avg);

    return {
      totalStudents: studentSet.size,
      totalResponses: responses.length,
      schoolAvg,
      teacherLeaderboard
    };
  }, [responses]);

  /* ================= TREND DATA ================= */
  const trendData = useMemo(() => {
    const grouped = {};

    responses.forEach(r => {
      const date = r.timestamp?.toDate()?.toLocaleDateString();
      if (!date) return;

      if (!grouped[date]) {
        grouped[date] = { date, total: 0, count: 0 };
      }

      grouped[date].total += r.score || 0;
      grouped[date].count += 1;
    });

    return Object.values(grouped).map(d => ({
      date: d.date,
      avg: d.total / d.count
    }));
  }, [responses]);

  /* ================= HEATMAP DATA ================= */
  const heatmapData = useMemo(() => {
    const teacherMap = {};

    responses.forEach(r => {
      if (!teacherMap[r.teacherId]) {
        teacherMap[r.teacherId] = { low: 0, mid: 0, high: 0 };
      }

      if (r.score <= 1) teacherMap[r.teacherId].low++;
      else if (r.score === 2) teacherMap[r.teacherId].mid++;
      else if (r.score >= 3) teacherMap[r.teacherId].high++;
    });

    return Object.entries(teacherMap).map(([teacherId, stats]) => ({
      teacherId,
      ...stats
    }));
  }, [responses]);

  /* ================= EXECUTIVE SUMMARY ================= */
  const executiveSummary = useMemo(() => {
    if (!analytics) return "";

    const {
      totalStudents,
      totalResponses,
      schoolAvg,
      teacherLeaderboard
    } = analytics;

    const avg = parseFloat(schoolAvg);
    const topTeacher = teacherLeaderboard?.[0];
    const bottomTeacher =
      teacherLeaderboard?.[teacherLeaderboard.length - 1];

    let performanceLevel = "stable";
    if (avg >= 2.5) performanceLevel = "strong";
    else if (avg >= 2.0) performanceLevel = "developing";
    else performanceLevel = "needs attention";

    return `
ThinkOutLoud School Performance Summary

The school currently has ${totalStudents} active students
and ${totalResponses} recorded responses.

Overall performance is ${performanceLevel}
with an average score of ${schoolAvg} out of 3.

Top performing instruction is associated with teacher ${
      topTeacher?.teacherId || "N/A"
    } (avg ${topTeacher?.avg?.toFixed(2) || "0.00"}).

Lowest performing instructional group is associated with teacher ${
      bottomTeacher?.teacherId || "N/A"
    } (avg ${bottomTeacher?.avg?.toFixed(2) || "0.00"}).

Strategic Recommendation:
Focus coaching on low-performing groups while studying
high-performing classrooms for transferable practices.
`;
  }, [analytics]);

  return (
    <div style={styles.page}>
      <h2>🏫 School Admin Dashboard</h2>

      {/* ANALYTICS CARDS */}
      {analytics && (
        <div style={styles.analytics}>
          <Card title="Students" value={analytics.totalStudents} />
          <Card title="Responses" value={analytics.totalResponses} />
          <Card title="School Avg Score" value={analytics.schoolAvg} />
          <Card title="Teachers" value={teachers.length} />
        </div>
      )}

      {/* EXECUTIVE SUMMARY */}
      {executiveSummary && (
        <div style={styles.section}>
          <h3>🧠 Executive Summary</h3>
          <div style={styles.summaryCard}>
            <pre style={styles.summaryText}>
              {executiveSummary}
            </pre>
          </div>
        </div>
      )}

      {/* SCHOOL TREND */}
      {trendData.length > 0 && (
        <div style={styles.section}>
          <h3>School Performance Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <XAxis dataKey="date" />
              <YAxis domain={[0, 3]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#4dabf7"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* TEACHER LEADERBOARD */}
      {analytics?.teacherLeaderboard?.length > 0 && (
        <div style={styles.section}>
          <h3>Teacher Leaderboard</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Teacher ID</th>
                <th>Average Score</th>
              </tr>
            </thead>
            <tbody>
              {analytics.teacherLeaderboard.map((t, i) => (
                <tr key={t.teacherId}>
                  <td>{i + 1}</td>
                  <td>{t.teacherId}</td>
                  <td>{t.avg.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PERFORMANCE HEATMAP */}
      {heatmapData.length > 0 && (
        <div style={styles.section}>
          <h3>Performance Heatmap</h3>

          <div style={styles.heatmapGrid}>
            <div></div>
            <div style={styles.heatHeader}>Low (0–1)</div>
            <div style={styles.heatHeader}>Mid (2)</div>
            <div style={styles.heatHeader}>High (3)</div>

            {heatmapData.map(row => (
              <React.Fragment key={row.teacherId}>
                <div style={styles.teacherLabel}>
                  {row.teacherId}
                </div>
                <HeatCell value={row.low} color="#ff6b6b" />
                <HeatCell value={row.mid} color="#ffd43b" />
                <HeatCell value={row.high} color="#40c057" />
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= COMPONENTS ================= */
function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

function HeatCell({ value, color }) {
  const intensity = Math.min(value / 10, 1);
  return (
    <div
      style={{
        background: color,
        opacity: intensity,
        padding: 12,
        borderRadius: 6,
        textAlign: "center",
        fontWeight: "bold",
        color: "white"
      }}
    >
      {value}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: {
    padding: 40,
    background: "#f8f9fa",
    minHeight: "100vh"
  },
  analytics: {
    display: "flex",
    gap: 20,
    marginTop: 20,
    flexWrap: "wrap"
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 14,
    minWidth: 160,
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)"
  },
  cardTitle: {
    fontSize: 14,
    color: "#868e96"
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 6
  },
  section: {
    marginTop: 40
  },
  summaryCard: {
    background: "white",
    padding: 25,
    borderRadius: 14,
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)"
  },
  summaryText: {
    whiteSpace: "pre-wrap",
    fontFamily: "inherit",
    lineHeight: 1.6
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "white"
  },
  heatmapGrid: {
    display: "grid",
    gridTemplateColumns: "200px repeat(3, 1fr)",
    gap: 10,
    alignItems: "center"
  },
  heatHeader: {
    fontWeight: "bold",
    textAlign: "center"
  },
  teacherLabel: {
    fontWeight: 500
  }
};