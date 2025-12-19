export default function IssuePanel({ result }) {
  if (!result)
    return (
      <div className="p-6 text-gray-500">
        No issues yet. Analyze text to see results.
      </div>
    );

  const issues = result.issues ?? [];

  return (
    <div className="p-4">
      <h2 className="font-bold text-xl mb-4">Issues ({issues.length})</h2>

      {issues.length === 0 && (
        <p className="text-green-600 font-semibold">Perfect! No issues ✔</p>
      )}

      {issues.map((i, idx) => (
        <div
          key={idx}
          className="p-3 mb-2 border rounded-md bg-white shadow-sm cursor-pointer hover:bg-blue-50"
          onClick={() => {
            const el = document.querySelector(`[data-word="${i.word}"]`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        >
          <p className="font-semibold">{i.type.toUpperCase()}</p>
          <p className="text-sm">{i.message}</p>
          <p className="text-xs text-gray-500">{i.word}</p>

          {i.suggestions && (
            <p className="text-xs mt-1 text-blue-600">
              Suggestions: {i.suggestions.join(", ")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
