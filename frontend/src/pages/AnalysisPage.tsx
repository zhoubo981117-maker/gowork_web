import { useState, useEffect } from "react";
import AnalysisForm from "../components/AnalysisForm";
import type { ArchiveData } from "../components/AnalysisForm";
import AnalysisReport from "../components/AnalysisReport";
import RewritePanel from "../components/RewritePanel";
import { api } from "../api/client";
import type { AnalyzeResponse } from "../types";

const SESSION_KEY = "analysis_result";

/** Build a File from text content for archiving. */
function textToFile(text: string, filename: string): File {
  return new File([text], filename, { type: "text/markdown;charset=utf-8" });
}

/** Return a copy of a File with a new name (preserves contents/type). */
function renameFile(file: File, name: string): File {
  return new File([file], name, { type: file.type });
}

export default function AnalysisPage() {
  const [formKey, setFormKey] = useState(0); // increment to force AnalysisForm remount
  const [formState, setFormState] = useState({ jdText: "", resumeText: "", resumeFileId: undefined as string | undefined, company: "", title: "" });
  const [result, setResult] = useState<AnalyzeResponse | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [archiveData, setArchiveData] = useState<ArchiveData | null>(null);
  const [archiveNote, setArchiveNote] = useState("");

  // Company / title state for the save dialog
  const [saveCompany, setSaveCompany] = useState("");
  const [saveTitle, setSaveTitle] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Persist result to sessionStorage whenever it changes
  useEffect(() => {
    if (result) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(result));
      } catch {
        // storage full — ignore
      }
    }
  }, [result]);

  // Pre-fill company/title from LLM hints when result arrives
  const handleResult = (r: AnalyzeResponse) => {
    setResult(r);
    setSaved(false);
    setSaveError("");
    // Form values take priority; fall back to LLM hints
    setSaveCompany(formState.company || r.company_hint || "");
    setSaveTitle(formState.title || r.title_hint || "");
  };

  const handleExportPdf = async () => {
    if (!result) return;
    setExporting(true);
    try {
      const blob = await api.downloadBlob("/api/export/pdf", { type: "analysis", data: result });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "analysis-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    setSaveError("");
    setArchiveNote("");
    try {
      const pos = await api.post<{ id: number }>("/api/positions", {
        company_name: saveCompany || "待补充",
        job_title: saveTitle || "待补充",
        application_date: new Date().toISOString().split("T")[0],
        status: "applied",
        job_description: formState.jdText || "",
        match_score: result.match_score,
        resume_text: formState.resumeText || "",
        notes: `匹配度 ${result.match_score}% — ${result.llm_insights?.verdict || result.verdict}`,
      });

      // Archive originals + optimized resume as position documents (best-effort).
      const archived = await archiveDocuments(pos.id);
      if (archived.length) {
        setArchiveNote(`已归档：${archived.join("、")}`);
      }

      setSaved(true);
      setShowSaveForm(false);
      // Clear sessionStorage so next visit starts fresh
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem("analysis_form");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  /** Upload the original JD screenshot, original resume, and optimized resume. */
  const archiveDocuments = async (positionId: number): Promise<string[]> => {
    const archived: string[] = [];
    const docs: { file: File; label: string }[] = [];

    if (archiveData?.jdImageFile) {
      const ext = archiveData.jdImageFile.name.split(".").pop() || "png";
      docs.push({ file: renameFile(archiveData.jdImageFile, `原始JD截图.${ext}`), label: "原始JD截图" });
    }
    if (archiveData?.originalResumeFile) {
      const ext = archiveData.originalResumeFile.name.split(".").pop() || "txt";
      docs.push({ file: renameFile(archiveData.originalResumeFile, `原始简历.${ext}`), label: "原始简历" });
    } else if (archiveData?.originalResumeText?.trim()) {
      docs.push({ file: textToFile(archiveData.originalResumeText, "原始简历.md"), label: "原始简历" });
    }
    if (archiveData?.optimizedResumeText?.trim()) {
      docs.push({ file: textToFile(archiveData.optimizedResumeText, "优化后简历.md"), label: "优化后简历" });
    }

    for (const d of docs) {
      try {
        await api.upload(`/api/positions/${positionId}/documents`, d.file);
        archived.push(d.label);
      } catch (err) {
        console.error(`归档「${d.label}」失败:`, err);
      }
    }
    return archived;
  };

  const handleNewAnalysis = () => {
    setResult(null);
    setSaved(false);
    setSaveError("");
    setShowSaveForm(false);
    setSaveCompany("");
    setSaveTitle("");
    setArchiveData(null);
    setArchiveNote("");
    setFormState({ jdText: "", resumeText: "", resumeFileId: undefined, company: "", title: "" });
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("analysis_form");
    setFormKey((k) => k + 1); // force AnalysisForm to remount with clean state
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">简历分析</h1>
          {result && (
            <button
              onClick={handleNewAnalysis}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              新建分析
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">分析输入</h2>
          <AnalysisForm
            key={formKey}
            onResult={handleResult}
            onFormChange={(jdText, resumeText, resumeFileId, company, title) =>
              setFormState({ jdText, resumeText, resumeFileId, company: company || "", title: title || "" })
            }
            onArchiveChange={setArchiveData}
          />
        </div>

        {result && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">分析报告</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportPdf}
                    disabled={exporting}
                    className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                  >
                    {exporting ? "导出中..." : "导出 PDF"}
                  </button>
                  {saved ? (
                    <span className="bg-green-100 text-green-700 px-4 py-2 rounded text-sm">
                      ✅ 已保存到看板{archiveNote ? `（${archiveNote}）` : ""}
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowSaveForm(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
                    >
                      保存到看板
                    </button>
                  )}
                </div>
              </div>

              {/* Save to board inline form */}
              {showSaveForm && !saved && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border space-y-3">
                  <p className="text-sm font-medium text-gray-700">确认公司和职位名称</p>
                  {saveError && (
                    <div className="text-sm text-red-600">{saveError}</div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">公司名</label>
                      <input
                        type="text"
                        value={saveCompany}
                        onChange={(e) => setSaveCompany(e.target.value)}
                        className="w-full border rounded px-3 py-1.5 text-sm"
                        placeholder="公司名称"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">目标职位</label>
                      <input
                        type="text"
                        value={saveTitle}
                        onChange={(e) => setSaveTitle(e.target.value)}
                        className="w-full border rounded px-3 py-1.5 text-sm"
                        placeholder="职位名称"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? "保存中..." : "确认保存"}
                    </button>
                    <button
                      onClick={() => setShowSaveForm(false)}
                      className="text-sm text-gray-500 px-3 py-1.5"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              <AnalysisReport result={result} />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">简历改写</h2>
              <RewritePanel
                jdText={formState.jdText}
                resumeText={formState.resumeText}
                resumeFileId={formState.resumeFileId}
                onApplyRewrite={(text) => setFormState((prev) => ({ ...prev, resumeText: text }))}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
