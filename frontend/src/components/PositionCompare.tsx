import type { JobPosition } from "../types";

interface Props {
  positions: JobPosition[];
  onClose: () => void;
}

export default function PositionCompare({ positions, onClose }: Props) {
  if (positions.length < 2) return null;

  const rows = [
    { label: "公司", getValue: (p: JobPosition) => p.company_name },
    { label: "职位", getValue: (p: JobPosition) => p.job_title },
    { label: "匹配度", getValue: (p: JobPosition) => p.match_score != null ? `${p.match_score}%` : "-" },
    { label: "薪资", getValue: (p: JobPosition) => p.salary_range || "-" },
    { label: "地点", getValue: (p: JobPosition) => p.location || "-" },
    { label: "状态", getValue: (p: JobPosition) => p.status },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="m-auto w-full max-w-3xl bg-white rounded-lg shadow-xl overflow-hidden relative">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">岗位对比</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-24">项目</th>
                {positions.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    {p.company}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm text-gray-500">{row.label}</td>
                  {positions.map((p) => (
                    <td key={p.id} className="px-4 py-3 text-sm text-gray-900">
                      {row.getValue(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
