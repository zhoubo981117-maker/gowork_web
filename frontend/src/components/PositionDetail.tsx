import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { JobPosition, PositionDocument, InterviewEvent, SimulationArchive } from "../types";

interface Props {
  position: JobPosition;
  onClose: () => void;
  onStartInterview?: (position: JobPosition) => void;
}

export default function PositionDetail({ position, onClose, onStartInterview }: Props) {
  const [documents, setDocuments] = useState<PositionDocument[]>([]);
  const [events, setEvents] = useState<InterviewEvent[]>([]);
  const [archives, setArchives] = useState<SimulationArchive[]>([]);
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    api.get<PositionDocument[]>(`/api/positions/${position.id}/documents`).then(setDocuments).catch(() => {});
    api.get<InterviewEvent[]>(`/api/positions/${position.id}/events`).then(setEvents).catch(() => {});
    api.get<SimulationArchive[]>(`/api/positions/${position.id}/archives`).then(setArchives).catch(() => {});
  }, [position.id]);

  // Download a position document through an authenticated request (the download
  // endpoint needs the bearer token, which a plain <a href> can't carry).
  const downloadDoc = async (doc: PositionDocument) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/positions/${position.id}/documents/${doc.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("下载失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.original_name || doc.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("文档下载失败:", err);
    }
  };

  const score = position.match_score;
  const scoreColor =
    score != null && score >= 70 ? "#16a34a" : score != null && score >= 40 ? "#ca8a04" : "#ef4444";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="ml-auto w-full max-w-lg bg-white shadow-xl overflow-y-auto relative">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">{position.company_name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="px-6 py-4 space-y-5">

          {/* Title + Score ring */}
          <div className="flex items-center gap-4">
            {score != null && (
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="16" fill="none"
                    stroke={scoreColor}
                    strokeWidth="3"
                    strokeDasharray={`${score} ${100 - score}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: scoreColor }}>
                  {score}
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">{position.job_title}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {position.status === "todo" && "待投递"}
                {position.status === "applied" && "已投递"}
                {position.status === "interviewing" && "面试中"}
                {position.status === "offered" && "已offer"}
                {position.status === "rejected" && "已拒绝"}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {onStartInterview && (
            <button
              onClick={() => onStartInterview(position)}
              className="w-full bg-purple-600 text-white py-2 rounded text-sm hover:bg-purple-700"
            >
              开始面试模拟
            </button>
          )}

          {position.salary_range && (
            <div>
              <div className="text-sm text-gray-500">薪资</div>
              <div className="font-medium text-green-600">{position.salary_range}</div>
            </div>
          )}
          {position.location && (
            <div>
              <div className="text-sm text-gray-500">地点</div>
              <div className="font-medium">{position.location}</div>
            </div>
          )}
          {position.notes && (
            <div>
              <div className="text-sm text-gray-500">分析摘要</div>
              <div className="text-sm text-gray-700 bg-blue-50 rounded p-2">{position.notes}</div>
            </div>
          )}

          {position.job_description && (
            <div>
              <div className="text-sm text-gray-500 mb-1">职位描述</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-3 max-h-48 overflow-y-auto">
                {position.job_description}
              </div>
            </div>
          )}

          {/* Resume section */}
          {position.resume_text && (
            <div>
              <button
                onClick={() => setShowResume(!showResume)}
                className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-700"
              >
                <span>{showResume ? "▼" : "▶"}</span>
                简历内容
              </button>
              {showResume && (
                <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap bg-green-50 rounded p-3 max-h-60 overflow-y-auto">
                  {position.resume_text}
                </div>
              )}
            </div>
          )}

          {documents.length > 0 && (
            <div>
              <div className="text-sm text-gray-500 mb-2">关联文档 ({documents.length})</div>
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded p-2 mb-1">
                  <span className="mr-1">{doc.is_image ? "🖼️" : "📄"}</span>
                  <span className="font-medium flex-1 truncate" title={doc.original_name}>
                    {doc.original_name || doc.filename}
                  </span>
                  <span className="text-gray-400">{(doc.file_type || "").toUpperCase()}</span>
                  <button
                    onClick={() => downloadDoc(doc)}
                    className="text-blue-600 hover:text-blue-700 text-xs border border-blue-200 rounded px-2 py-0.5"
                  >
                    下载
                  </button>
                </div>
              ))}
            </div>
          )}

          {events.length > 0 && (
            <div>
              <div className="text-sm text-gray-500 mb-2">事件记录 ({events.length})</div>
              {events.map((evt) => (
                <div key={evt.id} className="text-sm bg-gray-50 rounded p-2 mb-1">
                  <span className="text-gray-400">{evt.event_type}</span>
                  <span className="ml-2">{evt.content}</span>
                </div>
              ))}
            </div>
          )}

          {archives.length > 0 && (
            <div>
              <div className="text-sm text-gray-500 mb-2">模拟面试 ({archives.length})</div>
              {archives.map((arc) => (
                <div key={arc.id} className="text-sm bg-gray-50 rounded p-2 mb-1">
                  {arc.score != null && <span className="font-medium">得分: {arc.score}</span>}
                  <span className="text-gray-400 ml-2">{arc.created_at}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
