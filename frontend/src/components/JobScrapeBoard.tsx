import { Droppable } from "@hello-pangea/dnd";
import JobScrapeCard from "./JobScrapeCard";
import type { ScrapedJob } from "../types";

interface Props {
  title: string;
  droppableId: string;
  jobs: ScrapedJob[];
  onCardClick: (job: ScrapedJob) => void;
}

export default function JobScrapeBoard({ title, droppableId, jobs, onCardClick }: Props) {
  return (
    <div className="flex flex-col min-w-[260px] w-[260px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
          {jobs.length}
        </span>
      </div>
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded-lg p-2 min-h-[200px] transition-colors ${
              snapshot.isDraggingOver ? "bg-blue-50" : "bg-gray-50"
            }`}
          >
            {jobs.map((job, index) => (
              <JobScrapeCard
                key={job.id}
                job={job}
                index={index}
                onClick={onCardClick}
              />
            ))}
            {jobs.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                暂无职位
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
