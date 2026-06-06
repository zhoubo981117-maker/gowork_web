import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { ScraperSource } from "../types";

interface Props {
  onSearch: (keyword: string, city: string, sources: string[]) => void;
  loading: boolean;
  resultCount?: number;
}

const DEFAULT_SOURCES = [
  { id: "boss", label: "Boss直聘" },
  { id: "zhilian", label: "智联招聘" },
  { id: "51job", label: "前程无忧" },
];

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-500",
  unavailable: "bg-red-500",
  untested: "bg-yellow-500",
};

export default function ScraperSearch({ onSearch, loading, resultCount }: Props) {
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("");
  const [sources, setSources] = useState<string[]>(["boss", "zhilian", "51job"]);
  const [sourceStatus, setSourceStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get<ScraperSource[]>("/api/scraper/sources").then((list) => {
      const statusMap: Record<string, string> = {};
      list.forEach((s) => { statusMap[s.name] = s.status; });
      setSourceStatus(statusMap);
    }).catch(() => {});
  }, []);

  const toggleSource = (id: string) => {
    if (sourceStatus[id] === "unavailable") return;
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    onSearch(keyword.trim(), city.trim(), sources);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">关键词</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="如：前端开发、Python工程师"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="如：北京、上海"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">来源网站</label>
        <div className="flex gap-3">
          {DEFAULT_SOURCES.map((src) => {
            const status = sourceStatus[src.id] || "untested";
            const disabled = status === "unavailable";
            return (
              <label
                key={src.id}
                className={`flex items-center gap-1.5 text-sm ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={sources.includes(src.id)}
                  onChange={() => toggleSource(src.id)}
                  disabled={disabled}
                  className="rounded"
                />
                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
                {src.label}
              </label>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading || sources.length === 0}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "搜索中..." : "搜索"}
        </button>
        {resultCount != null && (
          <span className="text-sm text-gray-500">找到 {resultCount} 个职位</span>
        )}
      </div>
    </form>
  );
}
