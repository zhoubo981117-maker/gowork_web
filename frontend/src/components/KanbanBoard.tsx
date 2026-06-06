import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import { api } from "../api/client";
import type { JobPosition } from "../types";

const COLUMNS = [
  { title: "待投递", status: "todo" },
  { title: "已投递", status: "applied" },
  { title: "面试中", status: "interviewing" },
  { title: "已offer", status: "offered" },
  { title: "已拒绝", status: "rejected" },
];

const INTERVIEW_DROP_ID = "__interview__";

interface Props {
  onCardClick: (position: JobPosition) => void;
  onStartInterview?: (position: JobPosition) => void;
  onDeletePosition?: (positionId: number) => void;
}

export default function KanbanBoard({ onCardClick, onStartInterview, onDeletePosition }: Props) {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    api.get<JobPosition[]>("/api/positions").then(setPositions).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get<JobPosition[]>("/api/positions").then(
      (data) => { if (!cancelled) setPositions(data); },
      (err) => { if (!cancelled) console.error("Failed to load positions:", err); },
    ).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (positionId: number) => {
    setPositions((prev) => prev.filter((p) => p.id !== positionId));
    try {
      await api.delete(`/api/positions/${positionId}`);
      onDeletePosition?.(positionId);
    } catch {
      reload();
    }
  };

  const grouped = COLUMNS.map((col) => ({
    ...col,
    positions: positions.filter((p) => p.status === col.status),
  }));

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;

    const pos = positions.find((p) => String(p.id) === draggableId);
    if (!pos) return;

    // Dropped into interview zone
    if (destination.droppableId === INTERVIEW_DROP_ID) {
      onStartInterview?.(pos);
      return;
    }

    if (pos.status === destination.droppableId) return;

    const newStatus = destination.droppableId;
    setPositions((prev) =>
      prev.map((p) => (p.id === pos.id ? { ...p, status: newStatus } : p)),
    );

    try {
      await api.patch(`/api/positions/${pos.id}`, { status: newStatus });
    } catch {
      setPositions((prev) =>
        prev.map((p) => (p.id === pos.id ? { ...p, status: pos.status } : p)),
      );
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500 py-12">加载中...</div>;
  }

  return (
    <div>
      {positions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">还没有职位</p>
          <p className="text-gray-400 text-sm mt-2">去「分析」页面创建第一个职位吧</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {grouped.map((col) => (
              <KanbanColumn
                key={col.status}
                title={col.title}
                status={col.status}
                positions={col.positions}
                onCardClick={onCardClick}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Interview drop zone */}
          <Droppable droppableId={INTERVIEW_DROP_ID}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`mt-4 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  snapshot.isDraggingOver
                    ? "border-purple-400 bg-purple-50 text-purple-700"
                    : "border-gray-300 bg-gray-50 text-gray-400"
                }`}
              >
                <div className="text-lg font-medium">
                  {snapshot.isDraggingOver ? "松手开始面试模拟" : "拖拽岗位到此处开始面试模拟"}
                </div>
                <div className="text-sm mt-1">
                  {snapshot.isDraggingOver ? "将使用该岗位的 JD 和简历生成面试题" : "支持从任意列拖入"}
                </div>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
