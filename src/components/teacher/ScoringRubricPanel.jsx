import React from "react";

const rubricLevels = [
  {
    score: 3,
    label: "Meets / Exceeds",
    color: "#2f9e44",
    title: "Clear, accurate, and well supported",
    criteria: [
      "The response clearly answers the essential question.",
      "The student explains the idea using accurate lesson content, not just a short opinion.",
      "The response includes specific evidence, cause-and-effect reasoning, or strong supporting details.",
      "Academic vocabulary from the lesson is used correctly.",
      "The explanation is complete enough that a teacher can follow the student’s thinking without guessing."
    ]
  },
  {
    score: 2,
    label: "Developing",
    color: "#f08c00",
    title: "Partly correct, but needs stronger support",
    criteria: [
      "The response answers part of the question, but the explanation is uneven or incomplete.",
      "Some lesson content is correct, but the student may stay general or miss an important detail.",
      "There is some reasoning or evidence, but it is limited, vague, or not fully explained.",
      "Vocabulary may appear, but it is not always used precisely.",
      "The teacher can see the student’s idea, but the answer still needs more detail or clearer reasoning."
    ]
  },
  {
    score: 1,
    label: "Beginning",
    color: "#e03131",
    title: "Minimal or weak understanding shown",
    criteria: [
      "The response is very short, off topic, or only partly connected to the essential question.",
      "The answer shows little accurate lesson knowledge.",
      "The student gives few details and little to no supporting evidence.",
      "Reasoning is unclear, missing, or hard to follow.",
      "The response needs more explanation, stronger vocabulary, and clearer support to move to the next level."
    ]
  }
];

export default function ScoringRubricPanel() {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>3-Point Scoring Rubric</h3>
          <div style={styles.subtle}>
            Use this rubric to score essential-question responses consistently.
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        {rubricLevels.map((level) => (
          <div
            key={level.score}
            style={{
              ...styles.levelCard,
              borderTop: `5px solid ${level.color}`
            }}
          >
            <div style={{ ...styles.scorePill, background: level.color }}>
              {level.score}
            </div>
            <div style={styles.levelLabel}>{level.label}</div>
            <div style={styles.levelTitle}>{level.title}</div>
            <ul style={styles.criteriaList}>
              {level.criteria.map((criterion) => (
                <li key={criterion} style={styles.criteriaItem}>
                  {criterion}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function getRubricLevel(score) {
  return rubricLevels.find((level) => level.score === score) || null;
}

const styles = {
  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    marginBottom: 20
  },
  header: {
    marginBottom: 16
  },
  title: {
    margin: 0,
    fontSize: 24
  },
  subtle: {
    color: "#666",
    fontSize: 14,
    marginTop: 4
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16
  },
  levelCard: {
    background: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    position: "relative"
  },
  scorePill: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 18,
    marginBottom: 10
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#495057",
    marginBottom: 6
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 10,
    lineHeight: 1.3
  },
  criteriaList: {
    margin: 0,
    paddingLeft: 18
  },
  criteriaItem: {
    marginBottom: 8,
    lineHeight: 1.45
  }
};
