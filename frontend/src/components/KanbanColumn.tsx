import { Droppable } from "@hello-pangea/dnd";
import PositionCard from "./PositionCard";
import type { JobPosition } from "../types";

interface Props {
  title: string;
  status: string;
  positions: JobPosition[];
  onCardClick: (position: JobPosition) => void;
  onDelete?: (positionId: number) => void;
}

export default function KanbanColumn({ title, status, positions, onCardClick, onDelete }: Props) {
  return (
    <div className="flex flex-col min-w-[280px] w-[280px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
          {positions.length}
        </span>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded-lg p-2 min-h-[200px] transition-colors ${
              snapshot.isDraggingOver ? "bg-blue-50" : "bg-gray-50"
            }`}
          >
            {positions.map((pos, index) => (
              <PositionCard
                key={pos.id}
                position={pos}
                index={index}
                onClick={onCardClick}
                onDelete={onDelete}
              />
            ))}
            {positions.length === 0 && (
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
