import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { JobPosition } from "../types";
import PositionCompare from "../components/PositionCompare";

export default function ComparePage() {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<JobPosition[]>("/api/positions").then(setPositions).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  };

  const selectedPositions = positions.filter((p) => selected.includes(p.id));

  if (loading) {
    return <div className="p-6 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">岗位对比</h1>
        <p className="text-sm text-gray-500">选择 2-3 个岗位进行并排对比</p>

        {positions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">暂无职位数据</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {positions.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 bg-white rounded-lg shadow p-4 cursor-pointer transition ${
                    selected.includes(p.id) ? "ring-2 ring-blue-500" : "hover:shadow-md"
                  } ${selected.length >= 3 && !selected.includes(p.id) ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    disabled={selected.length >= 3 && !selected.includes(p.id)}
                    className="rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.title}</div>
                    <div className="text-xs text-gray-500 truncate">{p.company}</div>
                  </div>
                  {p.match_score != null && (
                    <span className="text-sm font-bold text-blue-600">{p.match_score}%</span>
                  )}
                </label>
              ))}
            </div>

            {selectedPositions.length >= 2 && (
              <PositionCompare
                positions={selectedPositions}
                onClose={() => setSelected([])}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
