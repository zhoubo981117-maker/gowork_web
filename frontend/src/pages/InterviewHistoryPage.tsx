import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { InterviewHistoryItem } from "../types";

interface HistoryResponse {
  archives: InterviewHistoryItem[];
  total: number;
}

interface SessionDetail {
  session_id: number;
  status: string;
  // NB: /api/interview/{id} serializes the question text under `text` (not question_text)
  questions: { id: number; text: string; category: string; difficulty: string }[];
  conversation_history: { role: string; content: string; question_id?: number }[];
  feedback: { question_id: number; evaluation: string; score: number; strengths: string[]; improvements: string[]; suggested_answer: string }[];
}

interface QAItem {
  question: string;
  category: string;
  answer: string;
  evaluation: string;
  score: number;
  suggested_answer: string;
  strengths: string[];
  improvements: string[];
}

function buildQAItems(detail: SessionDetail): QAItem[] {
  const items: QAItem[] = [];
  for (const q of detail.questions) {
    const answerTurn = detail.conversation_history.find(
      (t) => t.role === "candidate" && t.question_id === q.id
    );
    const fb = detail.feedback.find((f) => f.question_id === q.id);
    items.push({
      question: q.text,
      category: q.category,
      answer: answerTurn?.content || "(未回答)",
      evaluation: fb?.evaluation || "",
      score: fb?.score ?? 0,
      suggested_answer: fb?.suggested_answer || "",
      strengths: fb?.strengths || [],
      improvements: fb?.improvements || [],
    });
  }
  return items;
}

export default function InterviewHistoryPage() {
  const [archives, setArchives] = useState<InterviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api.get<HistoryResponse>("/api/interview/history?limit=50").then((res) => {
      setArchives(res.archives);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleExpand = async (archiveId: number) => {
    if (expandedId === archiveId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(archiveId);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.get<SessionDetail>(`/api/interview/${archiveId}`);
      setDetail(res);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">面试历史</h1>

        {archives.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">暂无面试记录</p>
            <p className="text-sm text-gray-400 mt-1">完成一次面试模拟后，记录会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-3">
            {archives.map((archive) => {
              const isExpanded = expandedId === archive.id;
              let meta: Record<string, unknown> = {};
              try { meta = JSON.parse(archive.session_data); } catch { /* */ }
              const interviewer = meta.interviewer as Record<string, string> | undefined;

              return (
                <div key={archive.id} className="bg-white rounded-lg shadow">
                  <button
                    onClick={() => handleExpand(archive.id)}
                    className="w-full px-6 py-4 text-left hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          面试 #{archive.id}
                          {interviewer && (
                            <span className="text-xs text-purple-600 ml-2">
                              {interviewer.role}{interviewer.title ? ` · ${interviewer.title}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {archive.created_at ? new Date(archive.created_at).toLocaleString("zh-CN") : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {archive.score != null && (
                          <span className={`text-lg font-bold ${
                            archive.score >= 70 ? "text-green-600" : archive.score >= 40 ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {archive.score}
                          </span>
                        )}
                        <span className="text-gray-400 text-sm">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-4 border-t pt-3">
                      {detailLoading ? (
                        <div className="text-center text-gray-400 py-4">加载详情...</div>
                      ) : detail ? (
                        <div className="space-y-4">
                          {buildQAItems(detail).map((item, i) => (
                            <div key={i} className="border rounded-lg overflow-hidden">
                              <div className="bg-blue-50 px-4 py-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-blue-600">Q{i + 1}</span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{item.category}</span>
                                  {item.score > 0 && (
                                    <span className={`text-xs font-bold ml-auto ${
                                      item.score >= 0.7 ? "text-green-600" : item.score >= 0.4 ? "text-yellow-600" : "text-red-500"
                                    }`}>
                                      {Math.round(item.score * 100)}分
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm font-medium text-gray-800">{item.question}</div>
                              </div>
                              <div className="px-4 py-3 bg-white border-t">
                                <div className="text-xs font-semibold text-gray-500 mb-1">你的回答</div>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{item.answer}</div>
                              </div>
                              {item.evaluation && (
                                <div className="px-4 py-3 bg-yellow-50 border-t text-sm">
                                  <div className="font-medium text-yellow-800 mb-1">评价: {item.evaluation}</div>
                                  {item.strengths.length > 0 && (
                                    <div className="text-green-700"><span className="font-medium">优点:</span> {item.strengths.join("；")}</div>
                                  )}
                                  {item.improvements.length > 0 && (
                                    <div className="text-orange-700"><span className="font-medium">改进:</span> {item.improvements.join("；")}</div>
                                  )}
                                </div>
                              )}
                              {item.suggested_answer && (
                                <div className="px-4 py-3 bg-green-50 border-t">
                                  <div className="text-xs font-semibold text-green-700 mb-1">参考标准答案</div>
                                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{item.suggested_answer}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 py-4">无法加载详情</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
