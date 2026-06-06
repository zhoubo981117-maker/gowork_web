import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { PositionPickerItem } from "../types";

const ROLE_OPTIONS = ["技术面试官", "HR面试官", "业务面试官", "部门主管", "总监"];
const FOCUS_OPTIONS = ["综合", "专业技能", "项目经验", "管理能力", "综合素质", "文化匹配"];

interface InterviewerInput {
  id: number;
  role: string;
  title: string;
  focus: string;
}

interface FollowUp {
  question: string;
  answer: string;
}

interface PrepQuestion {
  question: string;
  standard_answer: string;
  follow_ups: FollowUp[];
  tips: string;
}

interface PrepInterviewer {
  role: string;
  title: string;
  focus: string;
  questions: PrepQuestion[];
}

let nextId = 1;

export default function InterviewPrepPage() {
  const [picker, setPicker] = useState<PositionPickerItem[]>([]);
  const [selectedPos, setSelectedPos] = useState<PositionPickerItem | null>(null);
  const [interviewers, setInterviewers] = useState<InterviewerInput[]>([
    { id: nextId++, role: "技术面试官", title: "", focus: "专业技能" },
  ]);
  const [questionsPerIv, setQuestionsPerIv] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<PrepInterviewer[] | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<PositionPickerItem[]>("/api/positions/picker").then(setPicker).catch(() => {});
  }, []);

  const handleSelectPosition = async (posId: string) => {
    const item = picker.find((p) => String(p.id) === posId);
    setSelectedPos(item || null);
    setResult(null);
    setSavedAt(null);
    setError("");
    if (!item) return;
    // Load a previously saved question bank for this position, if any.
    try {
      const saved = await api.get<{ interviewers: PrepInterviewer[] | null; saved_at: string | null }>(
        `/api/interview/prep/${item.id}`,
      );
      if (saved.interviewers && saved.interviewers.length) {
        setResult(saved.interviewers);
        setSavedAt(saved.saved_at);
      }
    } catch {
      /* no saved bank — ignore */
    }
  };

  const addInterviewer = () => {
    setInterviewers((prev) => [...prev, { id: nextId++, role: "HR面试官", title: "", focus: "综合素质" }]);
  };

  const removeInterviewer = (id: number) => {
    setInterviewers((prev) => prev.filter((iv) => iv.id !== id));
  };

  const updateInterviewer = (id: number, field: keyof InterviewerInput, value: string) => {
    setInterviewers((prev) => prev.map((iv) => iv.id === id ? { ...iv, [field]: value } : iv));
  };

  const handleGenerate = async () => {
    if (!selectedPos) return;
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post<{ interviewers: PrepInterviewer[]; saved?: boolean }>("/api/interview/generate-prep", {
        jd_text: selectedPos.job_description || "",
        resume_text: selectedPos.resume_text || "",
        interviewers: interviewers.map((iv) => ({ role: iv.role, title: iv.title, focus: iv.focus })),
        questions_per_interviewer: questionsPerIv,
        position_id: selectedPos.id,
      });
      setResult(res.interviewers);
      setSavedAt(res.saved ? new Date().toISOString() : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">面试题库</h1>
        <p className="text-sm text-gray-500">根据岗位 JD 和简历，为不同面试官角色生成可能的问题、标准答案和追问</p>

        {/* Position selector */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择岗位（从看板）</label>
            {picker.length === 0 ? (
              <p className="text-sm text-gray-400">看板中暂无岗位</p>
            ) : (
              <select
                defaultValue=""
                onChange={(e) => handleSelectPosition(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">-- 选择岗位 --</option>
                {picker.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.company_name} — {p.job_title}
                    {p.match_score != null ? ` (${p.match_score}%)` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Interviewer list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">面试官设置</label>
              <button onClick={addInterviewer} className="text-sm text-blue-600 hover:text-blue-700">+ 添加面试官</button>
            </div>
            <p className="text-xs text-gray-400 mb-2">提示：「岗位」填的是<strong>面试官本人的职位</strong>（提问视角），不是你要应聘的岗位。应聘岗位来自该职位的 JD。</p>
            <div className="space-y-2">
              {interviewers.map((iv) => (
                <div key={iv.id} className="flex gap-2 items-center bg-gray-50 rounded p-2">
                  <select
                    value={iv.role}
                    onChange={(e) => updateInterviewer(iv.id, "role", e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm flex-1"
                  >
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input
                    value={iv.title}
                    onChange={(e) => updateInterviewer(iv.id, "title", e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm flex-1"
                    placeholder="面试官岗位，如 生产计划主管"
                  />
                  <select
                    value={iv.focus}
                    onChange={(e) => updateInterviewer(iv.id, "focus", e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm flex-1"
                  >
                    {FOCUS_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  {interviewers.length > 1 && (
                    <button onClick={() => removeInterviewer(iv.id)} className="text-red-400 hover:text-red-600 px-1">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">每位面试官题数</label>
              <select value={questionsPerIv} onChange={(e) => setQuestionsPerIv(Number(e.target.value))} className="border rounded px-2 py-1.5 text-sm">
                {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} 题</option>)}
              </select>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {savedAt && (
                <span className="text-xs text-green-600">
                  已保存{(() => { const d = new Date(savedAt); return isNaN(d.getTime()) ? "" : `（${d.toLocaleString("zh-CN")}）`; })()}
                </span>
              )}
              <button
                onClick={handleGenerate}
                disabled={generating || !selectedPos}
                className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {generating ? "AI 生成中..." : result ? "重新生成" : "生成面试题库"}
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 rounded p-3">{error}</div>}
        </div>

        {/* Results */}
        {result && result.map((iv, ivIdx) => (
          <div key={ivIdx} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-purple-50 border-b">
              <div className="font-semibold text-purple-700">
                {iv.role}{iv.title ? ` · ${iv.title}` : ""}
              </div>
              <div className="text-xs text-purple-500">侧重: {iv.focus}</div>
            </div>
            <div className="divide-y">
              {iv.questions.map((q, qi) => (
                <div key={qi} className="px-6 py-4 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 mr-2">Q{qi + 1}</span>
                    <span className="text-sm font-medium text-gray-800">{q.question}</span>
                  </div>
                  <div className="bg-green-50 rounded p-3">
                    <div className="text-xs font-semibold text-green-700 mb-1">标准答案</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{q.standard_answer}</div>
                  </div>
                  {q.follow_ups.length > 0 && (
                    <div className="bg-orange-50 rounded p-3 space-y-2">
                      <div className="text-xs font-semibold text-orange-700">可能的追问及建议回答</div>
                      {q.follow_ups.map((fu, fi) => (
                        <div key={fi} className="text-sm">
                          <div className="text-gray-800">• {fu.question}</div>
                          {fu.answer && (
                            <div className="ml-3 mt-0.5 text-gray-600 whitespace-pre-wrap">
                              <span className="text-orange-600 font-medium">建议回答：</span>{fu.answer}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.tips && (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                      💡 {q.tips}
                    </div>
                  )}
                </div>
              ))}
              {iv.questions.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-400">该面试官暂无生成结果</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
