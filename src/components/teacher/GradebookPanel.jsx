import React, { useMemo, useState } from "react";
import ScoringRubricPanel from "./ScoringRubricPanel";

function toMillis(value) {
  if (typeof value === "number") return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  return 0;
}

function formatDate(value) {
  const millis = toMillis(value);
  if (!millis) return "—";

  return new Date(millis).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function csvEscape(value) {
  const safe = `${value ?? ""}`.replace(/"/g, '""');
  return `"${safe}"`;
}

export default function GradebookPanel({
  responses = [],
  sessions = [],
  className = "ThinkOutLoud Class",
  analytics = null,
  roster = [],
  studentNotes = [],
  onDeleteResponse
}) {
  const [studentFilter, setStudentFilter] = useState("");
  const [questionFilter, setQuestionFilter] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [makeupOnly, setMakeupOnly] = useState(false);

  const sessionLookup = useMemo(() => {
    return sessions.reduce((map, session) => {
      map[session.id] = session;
      return map;
    }, {});
  }, [sessions]);

  const grouped = useMemo(() => {
    const buckets = new Map();

    responses.forEach((response) => {
      const studentName = response.studentName || response.studentId || "Student";
      const session = sessionLookup[response.sessionId] || {};
      const questionText =
        session.questionText || response.questionText || "Untitled question";
      const key = `${studentName}::${response.sessionId || questionText}`;

      if (!buckets.has(key)) {
        buckets.set(key, {
          studentName,
          studentId: response.studentId || studentName,
          questionText,
          category: response.category || session.category || "General",
          isMakeup: Boolean(session.isMakeup),
          attempts: []
        });
      }

      buckets.get(key).attempts.push(response);
    });

    return Array.from(buckets.values())
      .map((entry) => {
        const attempts = [...entry.attempts].sort((a, b) => {
          return toMillis(a.createdAt) - toMillis(b.createdAt);
        });
        const scoredAttempts = attempts.filter(
          (attempt) => attempt.score !== undefined && attempt.score !== null
        );
        const latestAttempt = attempts[attempts.length - 1] || null;
        const bestAttempt = scoredAttempts.reduce((best, attempt) => {
          if (!best || (attempt.score || 0) > (best.score || 0)) {
            return attempt;
          }
          return best;
        }, null);

        return {
          ...entry,
          attempts,
          latestAttempt,
          bestAttempt
        };
      })
      .sort((a, b) => {
        if (a.studentName !== b.studentName) {
          return a.studentName.localeCompare(b.studentName);
        }
        return a.questionText.localeCompare(b.questionText);
      });
  }, [responses, sessionLookup]);

  const studentOptions = useMemo(() => {
    return Array.from(new Set(grouped.map((entry) => entry.studentName))).sort();
  }, [grouped]);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(grouped.map((entry) => entry.category))).sort();
  }, [grouped]);

  const notesLookup = useMemo(() => {
    return studentNotes.reduce((map, noteRow) => {
      if (noteRow.studentKey) map[noteRow.studentKey] = noteRow;
      if (noteRow.studentName) map[noteRow.studentName] = noteRow;
      return map;
    }, {});
  }, [studentNotes]);

  const filtered = useMemo(() => {
    return grouped.filter((entry) => {
      const matchesStudent =
        !studentFilter || entry.studentName === studentFilter;
      const matchesQuestion =
        !questionFilter ||
        entry.category === questionFilter ||
        entry.questionText === questionFilter;
      const matchesScore =
        scoreFilter === "all" ||
        `${entry.bestAttempt?.score ?? ""}` === scoreFilter;
      const matchesMakeup = !makeupOnly || entry.isMakeup;

      return (
        matchesStudent && matchesQuestion && matchesScore && matchesMakeup
      );
    });
  }, [grouped, makeupOnly, questionFilter, scoreFilter, studentFilter]);

  const studentCount = new Set(
    filtered.map((entry) => entry.studentId || entry.studentName)
  ).size;

  const exportVisibleRows = () => {
    const headers = [
      "Student",
      "Question",
      "Category",
      "Best Score",
      "Latest Score",
      "Attempts",
      "Makeup",
      "Last Submitted",
      "Follow-Up",
      "Teacher Note"
    ];

    const rows = filtered.map((entry) => {
      const noteRow = notesLookup[entry.studentId] || notesLookup[entry.studentName];

      return [
        entry.studentName,
        entry.questionText,
        entry.category,
        entry.bestAttempt?.score ?? "",
        entry.latestAttempt?.score ?? "",
        entry.attempts
          .map(
            (attempt, index) =>
              `A${attempt.attemptNumber || index + 1}:${attempt.score ?? ""}`
          )
          .join(" | "),
        entry.isMakeup ? "Yes" : "No",
        formatDate(entry.latestAttempt?.completedAt || entry.latestAttempt?.createdAt),
        noteRow?.followUp ? "Yes" : "No",
        noteRow?.note || ""
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "thinkoutloud-gradebook.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportSummaryReport = () => {
    const totalResponses = analytics?.totalResponses || responses.length;
    const averageScore = totalResponses
      ? (
          responses.reduce((sum, response) => sum + Number(response.score || 0), 0) /
          totalResponses
        ).toFixed(2)
      : "0.00";
    const followUpRows = studentNotes.filter((noteRow) => noteRow.followUp);

    const summaryRows = [
      ["Class", className],
      ["Generated", new Date().toLocaleString()],
      ["Roster Count", roster.length],
      ["Visible Gradebook Records", filtered.length],
      ["Total Responses", totalResponses],
      ["Average Score", `${averageScore} / 3`],
      ["Students Flagged for Follow-Up", followUpRows.length]
    ];

    const studentRows = filtered.map((entry) => {
      const noteRow = notesLookup[entry.studentId] || notesLookup[entry.studentName];
      return [
        entry.studentName,
        entry.category,
        entry.questionText,
        entry.bestAttempt?.score ?? "",
        entry.latestAttempt?.score ?? "",
        entry.attempts.length,
        noteRow?.followUp ? "Yes" : "No",
        noteRow?.note || ""
      ];
    });

    const csvSections = [
      ["Summary", ""],
      ...summaryRows,
      ["", ""],
      ["Student", "Category", "Question", "Best Score", "Latest Score", "Attempts", "Follow-Up", "Teacher Note"],
      ...studentRows
    ];

    const csv = csvSections
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "thinkoutloud-summary-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!grouped.length) {
    return (
      <div style={styles.card}>
        <h3 style={styles.title}>Gradebook</h3>
        <div style={styles.empty}>No scored responses yet.</div>
      </div>
    );
  }

  return (
    <>
      <ScoringRubricPanel />

      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>Gradebook</h3>
            <div style={styles.subtle}>
              {studentCount} students • {filtered.length} visible records
            </div>
          </div>

          <button onClick={exportVisibleRows} style={styles.exportButton}>
            Export Gradebook CSV
          </button>
          <button onClick={exportSummaryReport} style={styles.exportButtonSecondary}>
            Export Summary Report
          </button>
        </div>

        <div style={styles.filters}>
          <select
            value={studentFilter}
            onChange={(event) => setStudentFilter(event.target.value)}
            style={styles.filterControl}
          >
            <option value="">All students</option>
            {studentOptions.map((studentName) => (
              <option key={studentName} value={studentName}>
                {studentName}
              </option>
            ))}
          </select>

          <select
            value={questionFilter}
            onChange={(event) => setQuestionFilter(event.target.value)}
            style={styles.filterControl}
          >
            <option value="">All questions/categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={scoreFilter}
            onChange={(event) => setScoreFilter(event.target.value)}
            style={styles.filterControl}
          >
            <option value="all">All scores</option>
            <option value="3">Best score 3</option>
            <option value="2">Best score 2</option>
            <option value="1">Best score 1</option>
            <option value="0">Best score 0</option>
          </select>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={makeupOnly}
              onChange={(event) => setMakeupOnly(event.target.checked)}
            />
            Missed questions only
          </label>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th align="left">Student</th>
                <th align="left">Question</th>
                <th align="left">Category</th>
                <th align="left">Best</th>
                <th align="left">Latest</th>
                <th align="left">Attempts</th>
                <th align="left">Last Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={`${entry.studentId}-${entry.questionText}`}>
                  <td style={styles.cellStrong}>{entry.studentName}</td>
                  <td>
                    <div style={styles.question}>{entry.questionText}</div>
                    {entry.isMakeup && <div style={styles.makeupPill}>Missed question</div>}
                  </td>
                  <td>{entry.category}</td>
                  <td>{entry.bestAttempt?.score ?? "—"} / 3</td>
                  <td>{entry.latestAttempt?.score ?? "—"} / 3</td>
                  <td>
                    <div style={styles.attemptList}>
                      {entry.attempts.map((attempt, index) => (
                        <span key={attempt.id} style={styles.attemptChip}>
                          A{attempt.attemptNumber || index + 1}: {attempt.score ?? "—"}
                          {onDeleteResponse && attempt?.id ? (
                            <button
                              onClick={() => onDeleteResponse(attempt)}
                              style={styles.deleteAttemptBtn}
                              title="Delete this response attempt"
                            >
                              Delete
                            </button>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {formatDate(
                      entry.latestAttempt?.completedAt || entry.latestAttempt?.createdAt
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
    flexWrap: "wrap"
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
  exportButton: {
    background: "#228be6",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer"
  },
  exportButtonSecondary: {
    background: "#495057",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer"
  },
  filters: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16
  },
  filterControl: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ced4da",
    background: "white",
    minWidth: 180
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ced4da",
    background: "white"
  },
  empty: {
    color: "#666",
    fontStyle: "italic"
  },
  tableWrap: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 980
  },
  cellStrong: {
    fontWeight: 700
  },
  question: {
    maxWidth: 340,
    lineHeight: 1.4
  },
  makeupPill: {
    display: "inline-block",
    marginTop: 6,
    background: "#f3d9fa",
    color: "#862e9c",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 700
  },
  attemptList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6
  },
  attemptChip: {
    background: "#edf2ff",
    color: "#364fc7",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 6
  },
  deleteAttemptBtn: {
    border: "none",
    borderRadius: 999,
    background: "#ffd8d8",
    color: "#c92a2a",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 11,
    padding: "2px 8px"
  }
};
