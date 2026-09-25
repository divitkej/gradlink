/** Marks a mock screen so its numbers and names never read as real results. */
export default function SampleDataLabel() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.04em",
        color: "var(--text-2)",
        border: "1px solid var(--border-strong)",
        borderRadius: 4,
        padding: "3px 8px",
        whiteSpace: "nowrap",
      }}
    >
      Product preview · sample data
    </span>
  );
}
