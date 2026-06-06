import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import InterviewChat from "../components/InterviewChat";
import InterviewSummary from "../components/InterviewSummary";
import { api } from "../api/client";
import type {
  InterviewFeedback,
  InterviewSession,
  InterviewQuestion,
  InterviewStartResponse,
  InterviewAnswerResponse,
  InterviewEndResponse,
  PositionPickerItem,
  JobPosition,
} from "../types";

function toQuestion(q: { id: number; text: string; category: string; difficulty: string; order?: number }): InterviewQuestion {
  return { id: q.id, question_text: q.text, category: q.category, difficulty: q.difficulty, expected_topics: [] };
}

export default function InterviewPage() {
  const location = useLocation();
  const navPosition = (location.state as { position?: JobPosition } | null)?.position;

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [feedbacks, setFeedbacks] = useState<InterviewFeedback[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [jdText, setJdText] = useState(navPosition?.job_description || "");
  const [resumeText, setResumeText] = useState(navPosition?.resume_text || "");
  const [starting, setStarting] = useState(false);
  const [picker, setPicker] = useState<PositionPickerItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<PositionPickerItem | null>(null);
  const [noResumeWarning, setNoResumeWarning] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);

  useEffect(() => {
    api.get<PositionPickerItem[]>("/api/positions/picker")
      .then(setPicker)
      .catch(() => {});
  }, []);

  // Auto-start if navigated from board with a position
  useEffect(() => {
    if (navPosition && jdText.trim() && !autoStarted && !session) {
      setAutoStarted(true);
      handleStart();
    }
  }, [navPosition, jdText, autoStarted, session]);

  const handleSelectPosition = (posId: string) => {
    if (!posId) {
      setSelectedItem(null);
      setJdText("");
      setResumeText("");
      setNoResumeWarning(false);
      return;
    }
    const item = picker.find((p) => String(p.id) === posId);
    if (!item) return;
    setSelectedItem(item);
    setJdText(item.job_description || "");
    setResumeText(item.resume_text || "");
    setNoResumeWarning(!item.has_resume);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await api.post<InterviewStartResponse>("/api/interview/start", {
        jd_text: jdText,
        resume_text: resumeText,
      });
      const questions: InterviewQuestion[] = res.first_question
        ? [toQuestion(res.first_question)]
        : [];
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

  // Reset everything back to the picker so the user can pick another position /
  // interviewer and start a fresh interview.
  const handleRestart = () => {
    setSession(null);
    setFeedbacks([]);
    setAnswers([]);
    setAutoStarted(true); // avoid auto-restart loop when navigated from board
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
      const newFeedback: InterviewFeedback = {
        evaluation: res.feedback.evaluation,
        strengths: res.feedback.strengths,
        improvements: res.feedback.improvements,
        suggested_answer: res.feedback.suggested_answer || "",
        score: res.feedback.score,
      };
      const newFeedbacks = [...feedbacks, newFeedback];
      setFeedbacks(newFeedbacks);

      const newQuestions = [...session.questions];
      if (res.next_question) {
        newQuestions.push(toQuestion(res.next_question));
      }

      const isComplete = res.status === "completed";
      setSession({
        ...session,
        questions: newQuestions,
        current_index: session.current_index + 1,
        feedback: newFeedbacks,
        is_complete: isComplete,
        total_score: res.summary?.overall_score != null
          ? Math.round(res.summary.overall_score * 100)
          : undefined,
      });
    } catch (err) {
      console.error("Answer failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!session) return;
    try {
      const res = await api.post<InterviewEndResponse>(
        `/api/interview/${session.session_id}/end`,
      );
      setSession({
        ...session,
        is_complete: true,
        total_score: res.summary?.overall_score != null
          ? Math.round(res.summary.overall_score * 100)
          : undefined,
      });
    } catch (err) {
      console.error("End failed:", err);
    }
  };

  // Show preparing state when auto-starting from board
  if (navPosition && starting && !session) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="text-lg text-gray-600">正在为「{navPosition.company_name} — {navPosition.job_title}」准备面试题...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">面试模拟</h1>
          <div className="bg-white rounded-lg shadow p-6 space-y-4">

            {/* Position picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                选择岗位（从看板加载）
              </label>
              {picker.length === 0 ? (
                <p className="text-sm text-gray-400">
                  看板中暂无岗位，请先在<Link to="/board" className="text-blue-500 underline mx-1">职位看板</Link>添加岗位
                </p>
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
                      {p.match_score != null ? ` (匹配度 ${p.match_score}%)` : ""}
                      {!p.has_resume ? " ⚠️ 无简历" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {noResumeWarning && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                该岗位没有上传简历文档，面试题将只基于职位描述生成。
                你也可以在下方手动输入简历内容。
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">职位描述</label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                className="w-full border rounded px-3 py-2 h-32 resize-none"
                placeholder="选择岗位后自动填入，或手动粘贴..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">简历内容</label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full border rounded px-3 py-2 h-32 resize-none"
                placeholder="选择岗位后自动填入，或手动粘贴..."
              />
            </div>

            <button
              onClick={handleStart}
              disabled={starting || !jdText.trim()}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {starting ? "准备中..." : "开始面试"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">面试模拟</h1>
          <div className="flex gap-3 items-center">
            <Link to="/board" className="text-sm text-blue-600 hover:text-blue-700">返回看板</Link>
            {!session.is_complete ? (
              <button
                onClick={handleEnd}
                className="text-sm bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-200"
              >
                结束面试
              </button>
            ) : (
              <button
                onClick={handleRestart}
                className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700"
              >
                换面试官重新开始
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <InterviewChat
            questions={session.questions}
            currentIndex={session.current_index}
            feedbacks={feedbacks}
            answers={answers}
            onSubmitAnswer={handleSubmitAnswer}
            loading={loading}
          />
        </div>

        {session.is_complete && (
          <InterviewSummary
            totalScore={session.total_score}
            feedbacks={feedbacks}
            sessionId={session.session_id}
          />
        )}
      </div>
    </div>
  );
}
