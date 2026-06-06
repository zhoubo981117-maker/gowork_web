import type { AnalyzeResponse } from "../types";

interface Props {
  result: AnalyzeResponse;
}

export default function AnalysisReport({ result }: Props) {
  const score = result.match_score;
  const scoreColor =
    score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-500";
  const ringColor =
    score >= 70 ? "#16a34a" : score >= 40 ? "#ca8a04" : "#ef4444";

  const llm = result.llm_insights;
  const isLLM = result.provider_used === "llm";

  // Use LLM matched/missing skills when available, else fall back to gaps
  const matchedSkills = llm?.matched_skills ?? [];
  const missingSkills = llm?.missing_skills ?? [];

  return (
    <div className="space-y-6">

      {/* Score + verdict */}
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="16" fill="none"
              stroke={ringColor}
              strokeWidth="3"
              strokeDasharray={`${score} ${100 - score}`}
              strokeLinecap="round"
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${scoreColor}`}>
            {score}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-400">匹配度</div>
          <div className="text-base font-semibold text-gray-900">{result.verdict}</div>
          <div className="text-xs text-gray-400">
            {isLLM ? "🤖 AI 分析" : "📊 关键词匹配"}
          </div>
        </div>
      </div>

      {/* LLM skill summary (primary display) */}
      {isLLM && (matchedSkills.length > 0 || missingSkills.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {matchedSkills.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-green-700 mb-2">✅ 已具备的技能</div>
              <div className="flex flex-wrap gap-1">
                {matchedSkills.map((s) => (
                  <span key={s} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
          {missingSkills.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-red-700 mb-2">❌ 需要补充的技能</div>
              <div className="flex flex-wrap gap-1">
                {missingSkills.map((s) => (
                  <span key={s} className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gaps (keyword analysis fallback or merged) */}
      {result.gaps.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">差距分析</h3>
          <ul className="list-disc list-inside space-y-1">
            {result.gaps.map((gap, i) => (
              <li key={i} className="text-sm text-gray-600">{gap}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">改进建议</h3>
          <ul className="list-disc list-inside space-y-1">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-gray-600">{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Interview questions */}
      {result.interview_questions.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">面试题预测</h3>
          <ol className="list-decimal list-inside space-y-1">
            {result.interview_questions.map((q, i) => (
              <li key={i} className="text-sm text-gray-600">{q}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Keyword category scores (collapsible detail) */}
      {result.category_scores.length > 0 && (
        <details className="group">
          <summary className="text-sm font-semibold text-gray-500 cursor-pointer select-none">
            关键词分类明细 ▼
          </summary>
          <div className="mt-3 space-y-3">
            {result.category_scores.map((cs) => (
              <div key={cs.category}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-24 text-xs text-gray-500 truncate">{cs.category}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${cs.score}%` }} />
                  </div>
                  <div className="w-10 text-xs text-gray-400 text-right">{cs.score}%</div>
                </div>
                <div className="pl-28 flex flex-wrap gap-1">
                  {cs.matched.map((s) => (
                    <span key={s} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{s}</span>
                  ))}
                  {cs.missing.map((s) => (
                    <span key={s} className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded line-through">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Tool trace */}
      {result.tool_trace.length > 0 && (
        <details>
          <summary className="text-xs text-gray-400 cursor-pointer select-none">
            ▶ 工具调用记录 ({result.tool_trace.length})
          </summary>
          <div className="mt-2 space-y-1">
            {result.tool_trace.map((t, i) => (
              <div key={i} className="text-xs text-gray-500 pl-3 border-l-2 border-gray-200">
                <span className={`font-medium ${t.status === "error" ? "text-red-500" : "text-blue-500"}`}>
                  {t.name}
                </span>
                {" — "}{t.summary}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
