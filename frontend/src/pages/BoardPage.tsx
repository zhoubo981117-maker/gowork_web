import { useState, useRef, useEffect } from "react";
import KanbanBoard from "../components/KanbanBoard";
import PositionDetail from "../components/PositionDetail";
import InterviewChat from "../components/InterviewChat";
import InterviewSummary from "../components/InterviewSummary";
import { api } from "../api/client";
import type {
  JobPosition,
  InterviewFeedback,
  InterviewSession,
  InterviewQuestion,
  InterviewStartResponse,
  InterviewAnswerResponse,
  InterviewEndResponse,
} from "../types";

function toQuestion(q: { id: number; text: string; category: string; difficulty: string; order?: number }): InterviewQuestion {
  return { id: q.id, question_text: q.text, category: q.category, difficulty: q.difficulty, expected_topics: [] };
}

const INTERVIEWER_ROLES = ["技术面试官", "HR面试官", "业务面试官", "部门主管", "总监"];
const FOCUS_TYPES = ["综合", "专业技能", "项目经验", "管理能力", "综合素质", "文化匹配"];

export default function BoardPage() {
  const [selected, setSelected] = useState<JobPosition | null>(null);

  // Interview state
  const [interviewPos, setInterviewPos] = useState<JobPosition | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [ivRole, setIvRole] = useState("技术面试官");
  const [ivTitle, setIvTitle] = useState("");
  const [ivFocus, setIvFocus] = useState("综合");

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [feedbacks, setFeedbacks] = useState<InterviewFeedback[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const interviewRef = useRef<HTMLDivElement>(null);

  const handleStartInterview = (position: JobPosition) => {
    setInterviewPos(position);
    setShowConfig(true);
    setSession(null);
    setFeedbacks([]);
    setAnswers([]);
    // Auto-fill interviewer title from job_title
    setIvTitle(position.job_title ? position.job_title + " 主管" : "");
    setTimeout(() => interviewRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleConfirmStart = async () => {
    if (!interviewPos) return;
    setStarting(true);
    setShowConfig(false);
    try {
      const res = await api.post<InterviewStartResponse>("/api/interview/start", {
        jd_text: interviewPos.job_description || "",
        resume_text: interviewPos.resume_text || "",
        interviewer: { role: ivRole, title: ivTitle, focus: ivFocus },
      });
      const questions: InterviewQuestion[] = res.first_question ? [toQuestion(res.first_question)] : [];
      setSession({
        session_id: String(res.session_id),
        questions,
        current_index: 0,
        feedback: [],
        is_complete: false,
      });
      setFeedbacks([]);
      setAnswers([]);
    } catch (err) {
      console.error("Start failed:", err);
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitAnswer = async (answer: string) => {
    if (!session) return;
    setAnswers((prev) => [...prev, answer]); // show my answer immediately
    setLoading(true);
    try {
      const res = await api.post<InterviewAnswerResponse>(
        `/api/interview/${session.session_id}/answer`,
        { answer_text: answer },
      );
      const fb: InterviewFeedback = {
        evaluation: res.feedback.evaluation,
        strengths: res.feedback.strengths,
        improvements: res.feedback.improvements,
        suggested_answer: res.feedback.suggested_answer || "",
        score: res.feedback.score,
      };
      const newFeedbacks = [...feedbacks, fb];
      setFeedbacks(newFeedbacks);
      const newQuestions = [...session.questions];
      if (res.next_question) newQuestions.push(toQuestion(res.next_question));
      setSession({
        ...session,
        questions: newQuestions,
        current_index: session.current_index + 1,
        feedback: newFeedbacks,
        is_complete: res.status === "completed",
        total_score: res.summary?.overall_score != null ? Math.round(res.summary.overall_score * 100) : undefined,
      });
    } catch (err) {
      console.error("Answer failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndInterview = async () => {
    if (!session) return;
    try {
      const res = await api.post<InterviewEndResponse>(`/api/interview/${session.session_id}/end`);
      setSession({
        ...session,
        is_complete: true,
        total_score: res.summary?.overall_score != null ? Math.round(res.summary.overall_score * 100) : undefined,
      });
    } catch (err) {
      console.error("End failed:", err);
    }
  };

  const handleCloseInterview = () => {
    setInterviewPos(null);
    setSession(null);
    setShowConfig(false);
    setFeedbacks([]);
    setAnswers([]);
  };

  // Keep the same position but reopen the interviewer config to start a fresh
  // interview with a different interviewer.
  const handleSwitchInterviewer = () => {
    setSession(null);
    setFeedbacks([]);
    setAnswers([]);
    setShowConfig(true);
    setTimeout(() => interviewRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  useEffect(() => {
    if (session) interviewRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">职位看板</h1>
        <KanbanBoard
          onCardClick={setSelected}
          onStartInterview={handleStartInterview}
        />
      </div>

      {/* Inline interview section */}
      <div ref={interviewRef}>
        {/* Config panel — show after dragging a card to interview zone */}
        {showConfig && interviewPos && (
          <div className="max-w-3xl mx-auto mt-6 bg-white rounded-lg shadow p-6 space-y-4 border-2 border-purple-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-purple-700">
                面试模拟 — {interviewPos.company_name} · {interviewPos.job_title}
              </h2>
              <button onClick={() => { setShowConfig(false); setInterviewPos(null); }} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">面试官角色</label>
                <select value={ivRole} onChange={(e) => setIvRole(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                  {INTERVIEWER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">面试官岗位</label>
                <input value={ivTitle} onChange={(e) => setIvTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="如：生产计划主管" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">面试侧重</label>
                <select value={ivFocus} onChange={(e) => setIvFocus(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                  {FOCUS_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={handleConfirmStart}
              disabled={starting}
              className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {starting ? "正在生成面试题..." : "开始面试"}
            </button>
          </div>
        )}

        {/* Active interview chat */}
        {session && interviewPos && (
          <div className="max-w-3xl mx-auto mt-6 bg-white rounded-lg shadow overflow-hidden border-2 border-purple-200">
            <div className="px-6 py-3 bg-purple-50 border-b flex items-center justify-between">
              <div>
                <span className="font-semibold text-purple-700">面试模拟</span>
                <span className="text-sm text-gray-500 ml-2">{interviewPos.company_name} · {interviewPos.job_title}</span>
                <span className="text-xs text-purple-500 ml-2">({ivRole} · {ivFocus})</span>
              </div>
              <div className="flex gap-2 items-center">
                {!session.is_complete ? (
                  <button onClick={handleEndInterview} className="text-sm bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-200">结束面试</button>
                ) : (
                  <button onClick={handleSwitchInterviewer} className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700">换面试官重新开始</button>
                )}
                <button onClick={handleCloseInterview} className="text-sm text-red-500 hover:text-red-700">关闭</button>
              </div>
            </div>
            <InterviewChat
              questions={session.questions}
              currentIndex={session.current_index}
              feedbacks={feedbacks}
              answers={answers}
              onSubmitAnswer={handleSubmitAnswer}
              loading={loading}
            />
            {session.is_complete && (
              <div className="p-4 border-t">
                <InterviewSummary
                  totalScore={session.total_score}
                  feedbacks={feedbacks}
                  sessionId={session.session_id}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <PositionDetail
          position={selected}
          onClose={() => setSelected(null)}
          onStartInterview={handleStartInterview}
        />
      )}
    </div>
  );
}
