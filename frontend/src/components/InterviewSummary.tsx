import { useState } from "react";
import type { InterviewFeedback } from "../types";
import { api } from "../api/client";

interface Props {
  totalScore?: number;
  feedbacks: InterviewFeedback[];
  sessionId?: string;
}

export default function InterviewSummary({ totalScore, feedbacks, sessionId }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!sessionId) return;
    setExporting(true);
    try {
      const blob = await api.downloadBlob("/api/export/pdf", {
        type: "interview",
        data: { session_id: sessionId, total_score: totalScore, feedbacks },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "interview-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };
  const allStrengths = feedbacks.flatMap((f) => f.strengths);
  const allImprovements = feedbacks.flatMap((f) => f.improvements);

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">面试总结</h2>
        {sessionId && (
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="text-sm bg-gray-600 text-white px-3 py-1.5 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {exporting ? "导出中..." : "导出 PDF"}
          </button>
        )}
      </div>

      {totalScore != null && (
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600">{totalScore}</div>
          <div className="text-sm text-gray-500">总分</div>
        </div>
      )}

      {allStrengths.length > 0 && (
        <div>
          <h3 className="font-medium text-green-700 mb-2">优点</h3>
          <ul className="list-disc list-inside space-y-1">
            {[...new Set(allStrengths)].map((s, i) => (
              <li key={i} className="text-sm text-gray-600">{s}</li>
            ))}
          </ul>
        </div>
      )}

      {allImprovements.length > 0 && (
        <div>
          <h3 className="font-medium text-orange-700 mb-2">改进建议</h3>
          <ul className="list-disc list-inside space-y-1">
            {[...new Set(allImprovements)].map((s, i) => (
              <li key={i} className="text-sm text-gray-600">{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
