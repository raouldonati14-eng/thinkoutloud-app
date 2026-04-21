export default function ClassSelector({
  classes = [],
  selectedClassId,
  onSelect
}) {
  const validClasses = classes.filter((c) => c?.id && (c?.className || c?.name));

  if (validClasses.length === 0) {
    return <div style={{ color: "gray", fontStyle: "italic" }}>No named classes available.</div>;
  }

  return (
    <div style={{ marginBottom: 25 }}>
      <h2>📚 Select Class</h2>
      <select
        value={selectedClassId || ""}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          padding: "10px",
          fontSize: "16px",
          minWidth: "300px",
          borderRadius: "8px" // A little styling for production
        }}
      >
        <option value="" disabled>-- Choose a Class --</option>
        {validClasses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.className || c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
