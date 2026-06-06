import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import type { JobPosition } from "../types";

interface Props {
  position: JobPosition;
  index: number;
  onClick: (position: JobPosition) => void;
  onDelete?: (positionId: number) => void;
}

export default function PositionCard({ position, index, onClick, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirming) {
      onDelete?.(position.id);
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000); // auto-cancel after 3s
    }
  };

  return (
    <Draggable draggableId={String(position.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(position)}
          className={`bg-white rounded-lg p-4 mb-2 border cursor-pointer transition-shadow group relative ${
            snapshot.isDragging ? "shadow-lg border-blue-300" : "shadow-sm hover:shadow-md border-gray-200"
          }`}
        >
          {/* Delete button — top right, visible on hover */}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className={`absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded transition-opacity ${
                confirming
                  ? "bg-red-500 text-white opacity-100"
                  : "text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
              }`}
              title={confirming ? "再次点击确认删除" : "删除"}
            >
              {confirming ? "确认?" : "×"}
            </button>
          )}

          <div className="font-medium text-gray-900 truncate pr-6">{position.company_name}</div>
          <div className="text-sm text-gray-600 truncate">{position.job_title}</div>
          {position.match_score != null && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: `${position.match_score}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{position.match_score}%</span>
            </div>
          )}
          {position.salary_range && (
            <div className="mt-1 text-xs text-green-600">{position.salary_range}</div>
          )}
        </div>
      )}
    </Draggable>
  );
}
