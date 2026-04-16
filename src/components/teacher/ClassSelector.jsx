export default function ClassSelector({
  classes = [],
  selectedClassId,
  onSelect
}) {
  // Filter out any "ghost" classes that don't have a name or ID
  const validClasses = classes.filter(c => c.className);

  if (validClasses.length === 0) {
    return <div style={{ color: 'gray', italic: 'true' }}>No named classes available.</div>;
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
            {c.name || c.className}
          </option>
        ))}
      </select>
    </div>
  );
}