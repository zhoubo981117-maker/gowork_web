import { useState, useRef, useCallback, useEffect } from "react";
import type { AnalyzeResponse } from "../types";
import { api } from "../api/client";

const FORM_SESSION_KEY = "analysis_form";

/** Originals + optimized resume to archive onto a board position when saved. */
export interface ArchiveData {
  jdImageFile: File | null;        // original recognized JD screenshot
  originalResumeFile: File | null; // original uploaded resume file
  originalResumeText: string;      // original pasted resume text (when no file)
  optimizedResumeText: string;     // AI-optimized resume text (empty if not optimized)
}

interface Props {
  onResult: (result: AnalyzeResponse) => void;
  /** Called whenever form values change so parent can sync state */
  onFormChange?: (jdText: string, resumeText: string, resumeFileId?: string, company?: string, title?: string) => void;
  /** Called whenever archivable originals/optimized resume change */
  onArchiveChange?: (data: ArchiveData) => void;
}

/** Convert a File/Blob to base64 string (data-uri stripped). */
async function fileToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Extract first image from a ClipboardEvent, or null. */
function getImageFromClipboard(e: React.ClipboardEvent): File | null {
  const items = Array.from(e.clipboardData?.items ?? []);
  const imageItem = items.find((item) => item.type.startsWith("image/"));
  return imageItem ? imageItem.getAsFile() : null;
}

interface ExtractResult {
  company: string;
  title: string;
  jd_text: string;
  success: boolean;
  error: string;
}

interface ResumeUploadResult {
  file_id: string;
  filename: string;
  size_bytes: number;
  download_url: string;
}

export default function AnalysisForm({ onResult, onFormChange, onArchiveChange }: Props) {
  const [company, setCompany] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(FORM_SESSION_KEY) || "{}").company || ""; } catch { return ""; }
  });
  const [title, setTitle] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(FORM_SESSION_KEY) || "{}").title || ""; } catch { return ""; }
  });
  const [jdText, setJdText] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(FORM_SESSION_KEY) || "{}").jdText || ""; } catch { return ""; }
  });
  const [resumeText, setResumeText] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(FORM_SESSION_KEY) || "{}").resumeText || ""; } catch { return ""; }
  });

  // Pending image state — paste stores image, button triggers AI
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [recognizedImage, setRecognizedImage] = useState<string | null>(null); // previewUrl kept after recognition
  const [recognizing, setRecognizing] = useState(false);

  // Resume file attachment state
  const [resumeFile, setResumeFile] = useState<ResumeUploadResult | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [rewriting, setRewriting] = useState(false);

  // --- Archive tracking (original screenshot / original resume / optimized resume) ---
  const [jdImageFile, setJdImageFile] = useState<File | null>(null);
  const [originalResumeFile, setOriginalResumeFile] = useState<File | null>(null);
  const [originalResumeText, setOriginalResumeText] = useState("");
  const [optimizedResumeText, setOptimizedResumeText] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Persist form to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_SESSION_KEY, JSON.stringify({ company, title, jdText, resumeText }));
    } catch { /* ignore */ }
    onFormChange?.(jdText, resumeText, resumeFile?.file_id, company, title);
  }, [jdText, resumeText, resumeFile]);

  // Emit archivable originals/optimized resume to the parent
  useEffect(() => {
    onArchiveChange?.({
      jdImageFile,
      originalResumeFile,
      originalResumeText,
      optimizedResumeText,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jdImageFile, originalResumeFile, originalResumeText, optimizedResumeText]);

  // Paste image into JD area — STORE, don't trigger AI
  const handleJdPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const image = getImageFromClipboard(e);
    if (!image) return; // plain text — default browser behavior
    e.preventDefault();
    const previewUrl = URL.createObjectURL(image);
    setPendingImage({ file: image, previewUrl });
    setError("");
  }, []);

  // User clicks "识别" button — NOW call AI
  const handleRecognize = async () => {
    if (!pendingImage) return;
    setRecognizing(true);
    setError("");
    try {
      const b64 = await fileToBase64(pendingImage.file);
      const result = await api.post<ExtractResult>("/api/documents/extract-jd-image", { image_b64: b64 });
      if (!result.success) {
        setError(result.error || "AI 识图失败，请直接粘贴文字");
        return;
      }
      if (result.jd_text) setJdText(result.jd_text);
      if (result.company) setCompany(result.company);
      if (result.title) setTitle(result.title);
      // Keep the image as a recognized preview, clear pending state
      setRecognizedImage(pendingImage.previewUrl);
      setJdImageFile(pendingImage.file); // remember original screenshot for archiving
      setPendingImage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 识图失败，请直接粘贴文字");
    } finally {
      setRecognizing(false);
    }
  };

  const clearPendingImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
  };

  // Upload resume as file attachment (no text extraction)
  const handleResumeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploadingResume(true);
    try {
      const result = await api.upload<ResumeUploadResult>("/api/resume/upload", file);
      setResumeFile(result);
      setOriginalResumeFile(file); // remember original resume for archiving
      setOptimizedResumeText(""); // reset any prior optimization
      setResumeText(""); // clear manual text since file is uploaded
    } catch (err) {
      setError(err instanceof Error ? err.message : "简历上传失败");
    } finally {
      setUploadingResume(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // AI rewrite via uploaded file
  const handleAIRewrite = async () => {
    if (!resumeFile) return;
    setRewriting(true);
    setError("");
    try {
      const result = await api.post<{ rewritten_text: string }>("/api/resume/rewrite", {
        file_id: resumeFile.file_id,
        jd_text: jdText,
        focus: "full",
      });
      setResumeText(result.rewritten_text);
      setOptimizedResumeText(result.rewritten_text); // remember optimized resume for archiving
      setResumeFile(null); // switch to manual text mode after rewrite
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 改写失败");
    } finally {
      setRewriting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Snapshot the original pasted resume text (when not from a file and not yet optimized)
    if (!originalResumeFile && !optimizedResumeText && resumeText.trim()) {
      setOriginalResumeText(resumeText);
    }
    try {
      const result = await api.post<AnalyzeResponse>("/api/analyze", {
        jd_text: jdText,
        resume_text: resumeText,
        target_role: title || undefined,
      });
      if (!company && result.company_hint) setCompany(result.company_hint);
      if (!title && result.title_hint) setTitle(result.title_hint);
      onResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded text-sm">{error}</div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        💡 在 JD 框粘贴截图（Ctrl+V）后，点击"识别"按钮由 AI 自动填入公司、职位和岗位描述
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">公司名</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="AI 识别后自动填入..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">目标职位</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="AI 识别后自动填入..."
          />
        </div>
      </div>

      {/* JD area with pending image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">职位描述 (JD)</label>

        {pendingImage && (
          <div className="mb-2 flex items-center gap-3 p-2 bg-gray-50 border rounded">
            <img
              src={pendingImage.previewUrl}
              alt="待识别截图"
              className="h-16 w-24 object-cover rounded border"
            />
            <div className="flex-1 text-sm text-gray-600">截图已粘贴，点击识别</div>
            <button
              type="button"
              onClick={handleRecognize}
              disabled={recognizing}
              className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {recognizing ? "识别中..." : "🤖 AI 识别"}
            </button>
            <button
              type="button"
              onClick={clearPendingImage}
              className="text-gray-400 hover:text-gray-600 text-lg px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Recognized image kept as reference */}
        {recognizedImage && !pendingImage && (
          <div className="mb-2 flex items-center gap-3 p-2 bg-green-50 border border-green-200 rounded">
            <img
              src={recognizedImage}
              alt="已识别截图"
              className="h-16 w-24 object-cover rounded border cursor-pointer"
              onClick={() => window.open(recognizedImage, "_blank")}
              title="点击查看大图"
            />
            <div className="flex-1 text-xs text-green-700">已识别的 JD 截图（点击查看大图）</div>
            <button
              type="button"
              onClick={() => { URL.revokeObjectURL(recognizedImage); setRecognizedImage(null); }}
              className="text-gray-400 hover:text-gray-600 text-lg px-1"
            >
              ×
            </button>
          </div>
        )}

        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          onPaste={handleJdPaste}
          className="w-full border rounded px-3 py-2 h-36 resize-none"
          placeholder="粘贴职位描述文字，或粘贴截图（Ctrl+V）后点击 AI 识别..."
          required
        />
      </div>

      {/* Resume area — file upload as attachment */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">简历内容</label>
          <label className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
            {uploadingResume ? "上传中..." : "上传附件"}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={handleResumeFileUpload}
              className="hidden"
              disabled={uploadingResume}
            />
          </label>
        </div>

        {resumeFile && (
          <div className="mb-2 flex items-center gap-3 p-2 bg-green-50 border border-green-200 rounded">
            <span className="text-sm text-green-700 flex-1">
              📎 {resumeFile.filename} ({Math.round(resumeFile.size_bytes / 1024)} KB)
            </span>
            <button
              type="button"
              onClick={handleAIRewrite}
              disabled={rewriting || !jdText.trim()}
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
              title={!jdText.trim() ? "请先填写 JD" : ""}
            >
              {rewriting ? "AI 改写中..." : "AI 优化简历"}
            </button>
            <button
              type="button"
              onClick={() => setResumeFile(null)}
              className="text-gray-400 hover:text-gray-600 text-lg px-1"
            >
              ×
            </button>
          </div>
        )}

        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          className="w-full border rounded px-3 py-2 h-36 resize-none"
          placeholder={resumeFile ? "点击【AI 优化简历】由 AI 改写后填入，或直接在此输入..." : "粘贴简历内容，或上传附件后 AI 优化..."}
          required={!resumeFile}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "AI 分析中..." : "开始分析"}
      </button>
    </form>
  );
}
