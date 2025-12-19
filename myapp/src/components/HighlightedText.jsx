export default function HighlightedText({ html }) {
  return (
    <div
      className="leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
