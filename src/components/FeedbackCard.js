export default function FeedbackCard({ title, items }) {
  return (
    <div style={{ border: "1px solid #CED4DA", borderRadius: "8px", padding: "10px", marginTop: "10px" }}>
      <h3>{title}</h3>
      <ul>
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
