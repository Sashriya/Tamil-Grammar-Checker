import Editor from "./components/Editor";
import IssuePanel from "./components/IssuePanel";
import { useState } from "react";

export default function App() {
  const [result, setResult] = useState(null);

  return (
    <div className="h-screen flex bg-gray-100">
      {/* LEFT: Editor */}
      <div className="flex-1 border-r bg-white shadow-sm">
        <Editor setResult={setResult} result={result} />
      </div>

      {/* RIGHT: Issues */}
      <div className="w-96 bg-gray-50 border-l shadow-inner overflow-y-auto">
        <IssuePanel result={result} />
      </div>
    </div>
  );
}
