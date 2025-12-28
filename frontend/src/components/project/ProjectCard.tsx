import { useState, useRef, useEffect, useCallback, memo } from "react";
import type { Project } from "../../types/schema";
import { useApp } from "../../contexts";
import { ExternalLinkIcon, FileTextIcon, BookIcon, GripVerticalIcon } from "../icons";
import { Timeline } from "../timeline";
import styles from "./ProjectCard.module.css";

interface DragHandleProps {
  [key: string]: unknown;
}

interface ProjectCardProps {
  project: Project;
  /** Position index in the list (0-based), used for depth effect */
  index: number;
  /** Total number of projects, used for depth effect calculation */
  totalProjects: number;
  /** Whether this project is currently "locked" (focused) */
  isLocked?: boolean;
  /** Whether this card is being dragged */
  isDragging?: boolean;
  /** Props to spread on the drag handle element */
  dragHandleProps?: DragHandleProps;
  /** Callback when project is clicked for locking */
  onLock?: (projectId: string) => void;
  /** Callback when navigation icon is clicked */
  onNavigate?: (projectId: string) => void;
  /** Callback when description modal should open */
  onOpenDescription?: (projectId: string) => void;
  /** Callback when notebook modal should open */
  onOpenNotebook?: (projectId: string) => void;
}

export const ProjectCard = memo(function ProjectCard({
  project,
  index,
  totalProjects,
  isLocked = false,
  isDragging = false,
  dragHandleProps,
  onLock,
  onNavigate,
  onOpenDescription,
  onOpenNotebook,
}: ProjectCardProps) {
  const { updateProject } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const [isTapped, setIsTapped] = useState(false); // For mobile tap-as-hover
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState(project.title);
  const [editDescription, setEditDescription] = useState(project.short_description);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const tapTimeoutRef = useRef<number | null>(null);

  // Calculate depth effect (0 = top, 1 = bottom)
  const depthRatio = totalProjects > 1 ? index / (totalProjects - 1) : 0;

  // Determine if card should show full size (no depth effect)
  const isFullSize = isHovered || isLocked || isTapped || isDragging;

  // Scale: 1 at top, 0.85 at bottom
  const scale = isFullSize ? 1 : 1 - depthRatio * 0.15;

  // Opacity: 1 at top, 0.6 at bottom
  const opacity = isFullSize ? 1 : 1 - depthRatio * 0.4;

  // Clean up tap timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  // Focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Focus description input when editing starts
  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
      descriptionInputRef.current.select();
    }
  }, [isEditingDescription]);

  function handleTitleClick() {
    setIsEditingTitle(true);
    setEditTitle(project.title);
  }

  function handleTitleBlur() {
    setIsEditingTitle(false);
    if (editTitle !== project.title) {
      updateProject(project.id, { title: editTitle });
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleTitleBlur();
    } else if (e.key === "Escape") {
      setEditTitle(project.title);
      setIsEditingTitle(false);
    }
  }

  function handleDescriptionClick() {
    setIsEditingDescription(true);
    setEditDescription(project.short_description);
  }

  function handleDescriptionBlur() {
    setIsEditingDescription(false);
    if (editDescription !== project.short_description) {
      updateProject(project.id, { short_description: editDescription });
    }
  }

  function handleDescriptionKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleDescriptionBlur();
    } else if (e.key === "Escape") {
      setEditDescription(project.short_description);
      setIsEditingDescription(false);
    }
  }

  function handleCardClick(e: React.MouseEvent) {
    // Don't lock if clicking on buttons or inputs
    if ((e.target as HTMLElement).closest("button, input, [data-drag-handle]")) {
      return;
    }
    onLock?.(project.id);
  }

  // Handle touch for mobile tap-as-hover behavior
  const handleTouchStart = useCallback(() => {
    // Clear any existing timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    setIsTapped(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Keep tapped state for 1 second after touch ends (mimics hover)
    tapTimeoutRef.current = window.setTimeout(() => {
      setIsTapped(false);
    }, 1000);
  }, []);

  const cardClassNames = [
    styles.card,
    isLocked ? styles.locked : "",
    isHovered ? styles.hovered : "",
    isDragging ? styles.dragging : "",
    isTapped ? styles.tapped : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={cardClassNames}
      style={{
        transform: isDragging ? `scale(${scale}) rotate(2deg)` : `scale(${scale})`,
        opacity: isDragging ? 0.9 : opacity,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleCardClick}
    >
      {/* Reflection overlay */}
      <div className={styles.reflection} />

      {/* Lock indicator */}
      {isLocked && (
        <div className={styles.lockIndicator} />
      )}

      {/* Header with drag handle, circle, and actions */}
      <div className={styles.cardHeader}>
        {/* Drag handle */}
        <div
          className={styles.dragHandle}
          data-drag-handle
          title="גרור לשינוי סדר (או השתמש במקשי החצים)"
          {...dragHandleProps}
        >
          <GripVerticalIcon size={20} />
        </div>

        {/* Central circle with project info */}
        <div className={styles.centerCircle}>
          <div className={styles.circleContent}>
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                className={styles.titleInput}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                placeholder="שם פרויקט"
              />
            ) : (
              <h3
                className={styles.title}
                onClick={handleTitleClick}
                title="לחץ לעריכה"
              >
                {project.title || "פרויקט ללא שם"}
              </h3>
            )}

            {isEditingDescription ? (
              <input
                ref={descriptionInputRef}
                type="text"
                className={styles.descriptionInput}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                onKeyDown={handleDescriptionKeyDown}
                placeholder="תיאור קצר"
              />
            ) : (
              <p
                className={styles.description}
                onClick={handleDescriptionClick}
                title="לחץ לעריכה"
              >
                {project.short_description || "הוסף תיאור קצר..."}
              </p>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={() => onNavigate?.(project.id)}
            title="מעבר לעמוד פרויקט"
          >
            <ExternalLinkIcon size={18} />
          </button>

          <button
            className={styles.actionButton}
            onClick={() => onOpenDescription?.(project.id)}
            title="תיאור מפורט"
          >
            <FileTextIcon size={18} />
          </button>

          <button
            className={styles.actionButton}
            onClick={() => onOpenNotebook?.(project.id)}
            title="מחברת טיוטה"
          >
            <BookIcon size={18} />
          </button>
        </div>
      </div>

      {/* Timeline section */}
      <div
        className={styles.timelineSection}
        onClick={(e) => e.stopPropagation()}
      >
        <Timeline project={project} isLocked={isLocked} />
      </div>
    </div>
  );
});
