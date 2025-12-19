import { useState, useRef } from "react";

export default function Editor({ setResult, result }) {
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const API = "http://localhost:8000/proofread";

  // Generic analyze (text already in textarea)
  const analyze = async (payloadText = null) => {
    const body = new FormData();
    body.append("text", payloadText ?? text);

    setLoading(true);
    try {
      const res = await fetch(API, { method: "POST", body });
      const data = await res.json();
      // backend might return either a "process result" or a wrapped doc response
      // try to be flexible:
      if (data.result) {
        setResult(data.result);
      } else if (
        data.paragraphs ||
        data.corrected_text ||
        data.formatted_text
      ) {
        // if your backend returns paragraphs (array) or corrected_text
        // construct a result-like object for the frontend to show
        // prefer formatted/highlighted fields if present
        const unified = {
          highlighted_original:
            data.highlighted_original ??
            (data.paragraphs
              ? data.paragraphs.map((p) => p.highlighted_original).join("\n")
              : ""),
          highlighted_corrected:
            data.highlighted_corrected ??
            (data.paragraphs
              ? data.paragraphs.map((p) => p.highlighted_corrected).join("\n")
              : ""),
          corrected_text:
            data.corrected_text ??
            (data.paragraphs
              ? data.paragraphs.map((p) => p.formatted_text).join("\n\n")
              : ""),
          issues: data.paragraphs
            ? data.paragraphs.flatMap((p) => p.issues || [])
            : data.issues || [],
        };
        setResult(unified);
      } else {
        // fallback
        setResult(data);
      }
    } catch (err) {
      console.error("Analyze error:", err);
      alert("Analysis failed — check backend console.");
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload: send file to backend -> set textarea to returned text -> auto analyze
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];

    // ❌ No file selected → show alert
    if (!file) {
      alert("There is no content. Please upload a .docx file.");
      return;
    }

    // ❌ Not a DOCX file
    if (!file.name.toLowerCase().endsWith(".docx")) {
      alert("Please upload a valid .docx file.");
      return;
    }

    setFilename(file.name);
    setLoading(true);
    setResult(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(API, { method: "POST", body: form });
      const data = await res.json();

      const originalText =
        data.original_text ||
        data.corrected_text ||
        (data.paragraphs
          ? data.paragraphs.map((p) => p.formatted_text || p).join("\n\n")
          : "");

      // ❌ File uploaded but EMPTY document
      if (!originalText.trim()) {
        alert("There is no content inside this file!");
        return;
      }

      // Put extracted content into textarea
      setText(originalText);

      // Auto Analyze after slight delay
      setTimeout(() => analyze(originalText), 100);
    } catch (err) {
      console.error("Upload error:", err);
      alert("File reading failed — backend error.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Copy corrected to clipboard (uses result.corrected_text or corrected_text fallback)
  const copyCorrected = async () => {
    const corrected =
      result?.corrected_text ||
      result?.clean_text ||
      result?.formatted_text ||
      "";
    if (!corrected) {
      alert("Nothing to copy yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(corrected);
      alert("Corrected text copied ✔");
    } catch {
      alert("Copy failed — your browser may block clipboard access.");
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex gap-3 mb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileUpload}
          className="border p-2 rounded"
        />
        <div className="flex items-center text-sm text-gray-600">
          {filename ? (
            <span>
              Uploaded: <strong>{filename}</strong>
            </span>
          ) : (
            <span>No file uploaded</span>
          )}
        </div>
        <button
          onClick={() => analyze()}
          className={`px-4 py-2 rounded-md text-white 
    ${
      text.trim().length === 0
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-600 hover:bg-blue-700"
    }`}
          disabled={text.trim().length === 0 || loading}
        >
          {loading ? "Working..." : "Analyze"}
        </button>

        <button
          onClick={copyCorrected}
          className={`px-4 py-2 rounded-md text-white 
    ${
      !result
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-green-600 hover:bg-green-700"
    }`}
          disabled={!result}
        >
          Copy Corrected
        </button>
      </div>

      {/* Textarea showing (and editing) the document content */}
      <textarea
        rows={12}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Uploaded document contents will appear here."
        className="w-full flex-1 border p-4 rounded-md focus:ring ring-blue-300 outline-none resize-none"
      />

      {/* Show the analysis results if present */}
      {result && (
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="font-semibold mb-1">Corrected (green highlights)</h3>
            <div
              className="p-3 border bg-green-50 rounded-md leading-relaxed"
              dangerouslySetInnerHTML={{
                __html:
                  result.highlighted_corrected || result.corrected_text || "",
              }}
            />
          </div>

          <div>
            <h3 className="font-semibold mb-1">
              Original (mistakes highlighted)
            </h3>
            <div
              className="p-3 border bg-red-50 rounded-md leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: result.highlighted_original || "",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
