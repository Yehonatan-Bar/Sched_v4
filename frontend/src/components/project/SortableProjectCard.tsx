import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Project } from "../../types/schema";
import { ProjectCard } from "./ProjectCard";

interface SortableProjectCardProps {
  project: Project;
  index: number;
  totalProjects: number;
  isLocked?: boolean;
  isDragging?: boolean;
  onLock?: (projectId: string) => void;
  onNavigate?: (projectId: string) => void;
  onOpenDescription?: (projectId: string) => void;
  onOpenNotebook?: (projectId: string) => void;
}

export function SortableProjectCard({
  project,
  index,
  totalProjects,
  isLocked = false,
  isDragging = false,
  onLock,
  onNavigate,
  onOpenDescription,
  onOpenNotebook,
}: SortableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="listitem"
    >
      <ProjectCard
        project={project}
        index={index}
        totalProjects={totalProjects}
        isLocked={isLocked}
        isDragging={isDragging || isSortableDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onLock={onLock}
        onNavigate={onNavigate}
        onOpenDescription={onOpenDescription}
        onOpenNotebook={onOpenNotebook}
      />
    </div>
  );
}
