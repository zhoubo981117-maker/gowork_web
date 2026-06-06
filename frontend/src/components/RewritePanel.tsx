import { useState } from "react";
import { api } from "../api/client";

interface Props {
  jdText: string;
  resumeText: string;
  resumeFileId?: string;   // if user uploaded a file, use AI rewrite endpoint
  onApplyRewrite?: (text: string) => void; // callback to apply rewritten text back to resume textarea
}

interface RewriteResult {
  rewritten_text: string;
  summary: string;
  provider_used: string;
}

export default function RewritePanel({ jdText, resumeText, resumeFileId, onApplyRewrite }: Props) {
  const [focus, setFocus] = useState("full");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const canRewrite = (resumeFileId || resumeText.trim().length > 20) && jdText.trim().length > 20;

  const handleRewrite = async () => {
    setError("");
    setLoading(true);
    setResult(null);
    try {
      if (resumeFileId) {
        // Use new file-based rewrite endpoint
        const res = await api.post<RewriteResult>("/api/resume/rewrite", {
          file_id: resumeFileId,
          jd_text: jdText,
          focus,
        });
        setResult(res);
      } else {
        // Use existing text-based rewrite endpoint
        const res = await api.post<{ original_text: string; explanation: string; provider_used: string; rewritten_bullets: { original: string; rewritten: string }[] }>(
          "/api/rewrite",
          {
            jd_text: jdText,
            resume_text: resumeText,
            rewrite_focus: focus,
          },
        );
        // Convert old format to new format for display
        const bullets = res.rewritten_bullets || [];
        const rewrittenText = bullets
          .map((b) => `**原文**: ${b.original}\n**改写**: ${b.rewritten}`)
          .join("\n\n");
        setResult({
          rewritten_text: rewrittenText || res.explanation || "改写完成",
          summary: res.explanation || "",
          provider_used: res.provider_used || "llm",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "改写失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.rewritten_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.rewritten_text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "改写简历.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const [applied, setApplied] = useState(false);
  const handleApply = () => {
    if (!result || !onApplyRewrite) return;
    onApplyRewrite(result.rewritten_text);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {!canRewrite && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
          请先完成分析（需要 JD 和简历内容），再使用简历改写功能
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">改写焦点</label>
          <select
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="full">全文改写</option>
            <option value="skills">技能部分</option>
            <option value="experience">经历部分</option>
          </select>
        </div>
        <button
          onClick={handleRewrite}
          disabled={loading || !canRewrite}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "AI 改写中..." : "改写简历"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">🤖 {result.summary || "AI 改写完成"}</span>
            <div className="flex gap-2">
              {onApplyRewrite && (
                <button
                  onClick={handleApply}
                  className="text-xs text-green-600 hover:text-green-700 px-2 py-1 border border-green-300 rounded"
                >
                  {applied ? "已应用 ✓" : "应用到简历框"}
                </button>
              )}
              <button
                onClick={handleDownload}
                className="text-xs text-purple-600 hover:text-purple-700 px-2 py-1 border border-purple-300 rounded"
              >
                下载为文件
              </button>
              <button
                onClick={handleCopy}
                className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 border rounded"
              >
                {copied ? "已复制 ✓" : "复制全文"}
              </button>
            </div>
          </div>
          <div className="bg-gray-50 rounded p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
            {result.rewritten_text}
          </div>
        </div>
      )}
    </div>
  );
}
