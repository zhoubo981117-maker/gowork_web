import type { ScrapedJob } from "../types";
import { getSkills } from "../types";

interface Props {
  job: ScrapedJob;
  onClose: () => void;
  onAnalyze: (jd: string) => void;
}

export default function JobDetailPanel({ job, onClose, onAnalyze }: Props) {
  const skills = getSkills(job);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="ml-auto w-full max-w-lg bg-white shadow-xl overflow-y-auto relative">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{job.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <div className="text-sm text-gray-500">公司</div>
            <div className="font-medium">{job.company}</div>
          </div>
          {job.salary && (
            <div>
              <div className="text-sm text-gray-500">薪资</div>
              <div className="font-medium text-green-600">{job.salary}</div>
            </div>
          )}
          {job.location && (
            <div>
              <div className="text-sm text-gray-500">地点</div>
              <div className="font-medium">{job.location}</div>
            </div>
          )}
          {job.experience && (
            <div>
              <div className="text-sm text-gray-500">经验要求</div>
              <div className="font-medium">{job.experience}</div>
            </div>
          )}
          {job.education && (
            <div>
              <div className="text-sm text-gray-500">学历要求</div>
              <div className="font-medium">{job.education}</div>
            </div>
          )}
          {skills.length > 0 && (
            <div>
              <div className="text-sm text-gray-500 mb-1">技能标签</div>
              <div className="flex flex-wrap gap-1">
                {skills.map((skill) => (
                  <span key={skill} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {job.original_jd && (
            <div>
              <div className="text-sm text-gray-500 mb-1">职位描述</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-3 max-h-60 overflow-y-auto">
                {job.original_jd}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onAnalyze(job.original_jd || "")}
              className="flex-1 bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700"
            >
              分析匹配
            </button>
            {job.detail_url && (
              <a
                href={job.detail_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm text-center hover:bg-gray-50"
              >
                查看原文
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
