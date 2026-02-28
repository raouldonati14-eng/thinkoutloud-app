import React, { useMemo } from "react";

export default function InterventionPanel({ responses }) {
  const interventionData = useMemo(() => {
    const studentMap = {};

    // ✅ Only use responses that have valid numeric scores
    responses
      .filter((r) => typeof r.score === "number")
      .forEach((r) => {
        if (!studentMap[r.student]) {
          studentMap[r.student] = [];
        }
        studentMap[r.student].push(r);
      });

    const flagged = [];

    Object.entries(studentMap).forEach(
      ([student, studentResponses]) => {
        // Sort ascending by time
        const sorted = studentResponses.sort(
          (a, b) =>
            new Date(a.timestamp) -
            new Date(b.timestamp)
        );

        const total = sorted.length;

        if (total === 0) return; // safety guard

        const masteryCount = sorted.filter(
          (r) =>
            typeof r.score === "number" &&
            r.score >= 2
        ).length;

        const masteryPercent =
          total > 0
            ? (masteryCount / total) * 100
            : 0;

        // -----------------------------
        // Condition 1: Low overall mastery
        // -----------------------------
        const lowMastery =
          masteryPercent < 60;

        // -----------------------------
        // Condition 2: 2+ low scores in a row
        // -----------------------------
        let consecutiveLow = 0;
        let hasLowStreak = false;

        sorted.forEach((r) => {
          if (
            typeof r.score === "number" &&
            r.score < 2
          ) {
            consecutiveLow++;
            if (consecutiveLow >= 2)
              hasLowStreak = true;
          } else {
            consecutiveLow = 0;
          }
        });

        // -----------------------------
        // Condition 3: No improvement trend
        // -----------------------------
        const recent = sorted.slice(-5);
        let noImprovement = false;

        if (recent.length >= 3) {
          const midpoint = Math.floor(
            recent.length / 2
          );

          const firstHalf =
            recent.slice(0, midpoint);
          const secondHalf =
            recent.slice(midpoint);

          const firstAvg =
            firstHalf.reduce(
              (sum, r) =>
                sum + (r.score || 0),
              0
            ) / firstHalf.length;

          const secondAvg =
            secondHalf.reduce(
              (sum, r) =>
                sum + (r.score || 0),
              0
            ) / secondHalf.length;

          noImprovement =
            secondAvg <= firstAvg;
        }

        if (
          lowMastery ||
          hasLowStreak ||
          noImprovement
        ) {
          flagged.push({
            student,
            masteryPercent:
              masteryPercent.toFixed(1),
            lowMastery,
            hasLowStreak,
            noImprovement
          });
        }
      }
    );

    return flagged.sort(
      (a, b) =>
        a.masteryPercent - b.masteryPercent
    );
  }, [responses]);

  if (interventionData.length === 0) {
    return (
      <div style={{ marginTop: 40 }}>
        <h3>🚨 Intervention Watch</h3>
        <div style={{ color: "green" }}>
          No students currently flagged.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 40 }}>
      <h3>🚨 Students Needing Attention</h3>

      {interventionData.map((s) => (
        <div
          key={s.student}
          style={{
            padding: 12,
            marginBottom: 8,
            borderRadius: 6,
            background: "#ffe5e5",
            border: "1px solid #e74c3c"
          }}
        >
          <strong>{s.student}</strong>
          <div>
            Mastery: {s.masteryPercent}%
          </div>
          <div>
            {s.lowMastery &&
              "• Low overall mastery "}
            {s.hasLowStreak &&
              "• Consecutive low scores "}
            {s.noImprovement &&
              "• No improvement trend "}
          </div>
        </div>
      ))}
    </div>
  );
}
