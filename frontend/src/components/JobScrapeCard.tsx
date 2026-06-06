import { Draggable } from "@hello-pangea/dnd";
import type { ScrapedJob } from "../types";
import { getSkills } from "../types";

interface Props {
  job: ScrapedJob;
  index: number;
  onClick: (job: ScrapedJob) => void;
}

const SOURCE_COLORS: Record<string, string> = {
  boss: "bg-blue-100 text-blue-700",
  zhilian: "bg-green-100 text-green-700",
  "51job": "bg-purple-100 text-purple-700",
};

export default function JobScrapeCard({ job, index, onClick }: Props) {
  const skills = getSkills(job);
  return (
    <Draggable draggableId={`scrape-${job.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(job)}
          className={`bg-white rounded-lg p-3 mb-2 border cursor-pointer transition-shadow ${
            snapshot.isDragging ? "shadow-lg border-blue-300" : "shadow-sm hover:shadow-md border-gray-200"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 text-sm truncate">{job.title}</div>
              <div className="text-xs text-gray-500 truncate">{job.company}</div>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${SOURCE_COLORS[job.source] || "bg-gray-100 text-gray-600"}`}>
              {job.source}
            </span>
          </div>
          {job.salary && (
            <div className="mt-1 text-xs text-green-600">{job.salary}</div>
          )}
          {job.location && (
            <div className="text-xs text-gray-400">{job.location}</div>
          )}
          {skills.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {skills.slice(0, 4).map((skill) => (
                <span key={skill} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {skill}
                </span>
              ))}
              {skills.length > 4 && (
                <span className="text-xs text-gray-400">+{skills.length - 4}</span>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
