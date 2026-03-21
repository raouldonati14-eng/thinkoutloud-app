export default function ClassSelector({
  classes = [],
  selectedClassId,
  onSelect
}) {

  if (classes.length === 0) {
    return <div>No classes found</div>;
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
          minWidth: "300px"
        }}
      >

        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.className || "Untitled Class"}
          </option>
        ))}

      </select>

    </div>
  );
}