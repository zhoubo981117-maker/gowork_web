import { useState, useRef, useEffect } from "react";
import type { InterviewQuestion, InterviewFeedback as FeedbackType } from "../types";

interface Message {
  type: "question" | "answer" | "feedback";
  content: string;
  question?: InterviewQuestion;
  feedback?: FeedbackType;
}

interface Props {
  questions: InterviewQuestion[];
  currentIndex: number;
  feedbacks: FeedbackType[];
  /** Candidate answers, aligned by index with feedbacks/questions. */
  answers?: string[];
  onSubmitAnswer: (answer: string) => Promise<void>;
  loading: boolean;
}

export default function InterviewChat({ questions, currentIndex, feedbacks, answers = [], onSubmitAnswer, loading }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const messages: Message[] = [];
  for (let i = 0; i <= currentIndex && i < questions.length; i++) {
    messages.push({ type: "question", content: questions[i].question_text, question: questions[i] });
    // Candidate's own answer bubble (shown once the answer exists)
    if (i < answers.length) {
      messages.push({ type: "answer", content: answers[i] });
    }
    if (i < feedbacks.length) {
      messages.push({ type: "feedback", content: "", feedback: feedbacks[i] });
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  // Auto-grow the textarea up to a max height
  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };
  useEffect(autoGrow, [input]);

  const submit = async () => {
    if (!input.trim() || loading) return;
    const answer = input.trim();
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    await onSubmitAnswer(answer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter submits; Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((msg, i) => {
          if (msg.type === "question" && msg.question) {
            return (
              <div key={i} className="flex justify-start">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 max-w-[80%]">
                  <div className="flex gap-2 mb-1">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{msg.question.category}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{msg.question.difficulty}</span>
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            );
          }
          if (msg.type === "answer") {
            return (
              <div key={i} className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-lg px-4 py-3 max-w-[80%]">
                  <div className="text-xs text-blue-100 mb-1">我的回答</div>
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            );
          }
          if (msg.type === "feedback" && msg.feedback) {
            return (
              <div key={i} className="mx-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-fade-in">
                <div className="font-medium text-sm text-yellow-800 mb-2">评价: {msg.feedback.evaluation}</div>
                {msg.feedback.strengths.length > 0 && (
                  <div className="text-sm mb-1"><span className="text-green-600 font-medium">优点:</span> {msg.feedback.strengths.join("，")}</div>
                )}
                {msg.feedback.improvements.length > 0 && (
                  <div className="text-sm mb-1"><span className="text-orange-600 font-medium">改进:</span> {msg.feedback.improvements.join("，")}</div>
                )}
                {msg.feedback.suggested_answer && (
                  <div className="text-sm mt-2 text-gray-700">
                    <div className="font-medium mb-1">参考答案模板:</div>
                    <div className="bg-white border border-yellow-100 rounded p-2 whitespace-pre-wrap text-gray-700">{msg.feedback.suggested_answer}</div>
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-500">思考中...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2 items-end">
        <textarea
          ref={taRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的回答…（Enter 发送，Shift+Enter 换行）"
          className="flex-1 border rounded px-3 py-2 text-sm resize-none leading-relaxed max-h-52 overflow-y-auto"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 shrink-0"
        >
          提交
        </button>
      </form>
    </div>
  );
}
