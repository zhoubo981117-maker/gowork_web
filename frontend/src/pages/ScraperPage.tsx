import { useState, useCallback } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import ScraperSearch from "../components/ScraperSearch";
import JobScrapeBoard from "../components/JobScrapeBoard";
import JobDetailPanel from "../components/JobDetailPanel";
import type { ScrapedJob, ParsedJdImport } from "../types";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

const POOLS = [
  { title: "搜索结果", id: "results" },
  { title: "候选池", id: "candidate" },
  { title: "已投递", id: "applied" },
  { title: "已忽略", id: "ignored" },
];

export default function ScraperPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState<ScrapedJob[]>([]);
  const [candidate, setCandidate] = useState<ScrapedJob[]>([]);
  const [applied, setApplied] = useState<ScrapedJob[]>([]);
  const [ignored, setIgnored] = useState<ScrapedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ScrapedJob | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Paste-import state (replaces broken scraper)
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedJdImport | null>(null);
  const [parseError, setParseError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const poolMap: Record<string, ScrapedJob[]> = { results, candidate, applied, ignored };

  const handlePasteImport = async () => {
    if (pasteText.trim().length < 50) {
      setParseError("文本太短，请粘贴完整的招聘页面内容");
      return;
    }
    setParsing(true);
    setParsed(null);
    setParseError("");
    setSaveSuccess(false);
    try {
      const result = await api.post<ParsedJdImport>("/api/scraper/paste-import", {
        text: pasteText,
      });
      setParsed(result);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "解析失败");
    } finally {
      setParsing(false);
    }
  };

  const handleSaveToBoard = async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      // Extract company/title from raw_text best-effort or use defaults
      const title = parsed.job_category !== "other" ? parsed.job_category : "未知职位";
      await api.post("/api/positions", {
        company_name: "待补充",
        job_title: title,
        application_date: new Date().toISOString().split("T")[0],
        status: "applied",
        job_description: parsed.raw_text,
        salary_range: parsed.salary_range
          ? `${parsed.salary_range.min}-${parsed.salary_range.max}K`
          : "",
        location: parsed.region?.city || "",
      });
      setSaveSuccess(true);
      setPasteText("");
      setParsed(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async (keyword: string, city: string, sources: string[]) => {
    setLoading(true);
    try {
      const res = await api.post<{ jobs: ScrapedJob[]; warnings?: string[] }>("/api/scraper/search", {
        keyword, city, sources,
      });
      setResults(res.jobs);
      setWarnings(res.warnings || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const pools: Record<string, ScrapedJob[]> = { results, candidate, applied, ignored };
    const setters: Record<string, (fn: (prev: ScrapedJob[]) => ScrapedJob[]) => void> = {
      results: setResults,
      candidate: setCandidate,
      applied: setApplied,
      ignored: setIgnored,
    };

    const srcPool = [...pools[source.droppableId]];
    const [moved] = srcPool.splice(source.index, 1);
    if (!moved) return;

    setters[source.droppableId](() => srcPool);

    if (source.droppableId !== destination.droppableId) {
      const destPool = [...pools[destination.droppableId]];
      destPool.splice(destination.index, 0, moved);
      setters[destination.droppableId](() => destPool);

      if (destination.droppableId !== "results") {
        api.post(`/api/scraper/jobs/${moved.id}/pool`, {
          pool_type: destination.droppableId,
        }).catch(() => {});
      }
    } else {
      srcPool.splice(destination.index, 0, moved);
      setters[source.droppableId](() => srcPool);
    }
  }, [results, candidate, applied, ignored]);

  const handleAnalyze = (jd: string) => {
    navigate(`/analysis?jd=${encodeURIComponent(jd)}`);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">职位搜索</h1>

      {/* ------------------------------------------------------------------ */}
      {/* Paste-Import Panel (primary flow)                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-lg shadow p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800">从网页粘贴职位信息</h2>
          <p className="text-sm text-gray-500 mt-1">
            在招聘网站（Boss直聘、智联招聘等）找到心仪职位，全选页面内容（Ctrl+A）并复制，粘贴到下方解析
          </p>
        </div>
        {saveSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            ✅ 已保存到职位看板！前往<a href="/board" className="underline mx-1">看板</a>查看
          </div>
        )}
        {parseError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {parseError}
          </div>
        )}
        <textarea
          value={pasteText}
          onChange={(e) => { setPasteText(e.target.value); setSaveSuccess(false); setParseError(""); }}
          className="w-full border rounded px-3 py-2 h-36 resize-none text-sm"
          placeholder="粘贴招聘网页全文..."
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handlePasteImport}
            disabled={parsing || pasteText.trim().length < 50}
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {parsing ? "解析中..." : "解析职位信息"}
          </button>
          {parsed && (
            <button
              onClick={handleSaveToBoard}
              disabled={saving}
              className="bg-green-600 text-white px-5 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存到看板"}
            </button>
          )}
        </div>

        {/* Parsed preview */}
        {parsed && (
          <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
            <div className="font-medium text-gray-700">解析结果</div>
            <div><span className="text-gray-500">类别：</span>{parsed.job_category}</div>
            <div><span className="text-gray-500">技能：</span>{parsed.skills.slice(0, 8).join("、") || "未识别"}</div>
            {parsed.salary_range?.max > 0 && (
              <div>
                <span className="text-gray-500">薪资：</span>
                {parsed.salary_range.min}–{parsed.salary_range.max}K
              </div>
            )}
            {parsed.experience_years?.max > 0 && (
              <div>
                <span className="text-gray-500">经验：</span>
                {parsed.experience_years.min}–{parsed.experience_years.max}年
              </div>
            )}
            {parsed.region?.city && parsed.region.city !== "unknown" && (
              <div><span className="text-gray-500">城市：</span>{parsed.region.city}</div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Automated Scraper (secondary, often blocked)                        */}
      {/* ------------------------------------------------------------------ */}
      <details className="bg-white rounded-lg shadow">
        <summary className="px-5 py-3 text-sm font-medium text-gray-600 cursor-pointer select-none">
          自动搜索（可能被反爬拦截，结果不保证）▼
        </summary>
        <div className="px-5 pb-5 pt-3 space-y-3 border-t">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
            ⚠️ Boss直聘、智联招聘等平台反爬机制较严，自动搜索经常返回空结果。
            建议优先使用上方的"粘贴职位信息"功能。
          </div>
          <ScraperSearch onSearch={handleSearch} loading={loading} resultCount={results.length} />
        </div>
      </details>

      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm font-medium text-yellow-800 mb-1">搜索提示</div>
          <ul className="text-sm text-yellow-700 space-y-1">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {(results.length > 0 || candidate.length > 0 || applied.length > 0 || ignored.length > 0) && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {POOLS.map((pool) => (
              <JobScrapeBoard
                key={pool.id}
                title={pool.title}
                droppableId={pool.id}
                jobs={poolMap[pool.id]}
                onCardClick={setSelected}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      {selected && (
        <JobDetailPanel
          job={selected}
          onClose={() => setSelected(null)}
          onAnalyze={handleAnalyze}
        />
      )}
    </div>
  );
}
