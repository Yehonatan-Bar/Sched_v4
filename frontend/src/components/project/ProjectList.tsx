import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useApp } from "../../contexts";
import { SortableProjectCard } from "./SortableProjectCard";
import { ProjectDescriptionModal, NotebookModal } from "../modals";
import styles from "./ProjectList.module.css";

// Lock timeout: 1 hour in milliseconds
const LOCK_TIMEOUT_MS = 60 * 60 * 1000;
const LOCK_STORAGE_KEY = "sched_locked_project";

interface LockData {
  projectId: string;
  timestamp: number;
}

function loadLockFromStorage(): LockData | null {
  try {
    const stored = sessionStorage.getItem(LOCK_STORAGE_KEY);
    if (!stored) return null;

    const data: LockData = JSON.parse(stored);
    const elapsed = Date.now() - data.timestamp;

    // If lock has expired, clear it
    if (elapsed >= LOCK_TIMEOUT_MS) {
      sessionStorage.removeItem(LOCK_STORAGE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function saveLockToStorage(projectId: string): void {
  const data: LockData = {
    projectId,
    timestamp: Date.now(),
  };
  sessionStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(data));
}

function clearLockFromStorage(): void {
  sessionStorage.removeItem(LOCK_STORAGE_KEY);
}

interface ProjectListProps {
  onNavigateToProject?: (projectId: string) => void;
}

export function ProjectList({ onNavigateToProject }: ProjectListProps) {
  const { getOrderedProjects, reorderProjects, loadingState } = useApp();

  // Initialize lock state from sessionStorage
  const [lockedProjectId, setLockedProjectId] = useState<string | null>(() => {
    const stored = loadLockFromStorage();
    return stored?.projectId ?? null;
  });
  const [lockTimestamp, setLockTimestamp] = useState<number | null>(() => {
    const stored = loadLockFromStorage();
    return stored?.timestamp ?? null;
  });

  // Track which item is being dragged
  const [activeId, setActiveId] = useState<string | null>(null);

  // Modal state
  const [descriptionModalProjectId, setDescriptionModalProjectId] = useState<string | null>(null);
  const [notebookModalProjectId, setNotebookModalProjectId] = useState<string | null>(null);

  const projects = getOrderedProjects();

  // Find projects for modals
  const descriptionModalProject = projects.find((p) => p.id === descriptionModalProjectId);
  const notebookModalProject = projects.find((p) => p.id === notebookModalProjectId);

  // Set up sensors for different input methods
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Start drag after 8px movement
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Long press to start drag on touch
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Clear lock after timeout
  useEffect(() => {
    if (!lockedProjectId || !lockTimestamp) return;

    const timeRemaining = Math.max(0, LOCK_TIMEOUT_MS - (Date.now() - lockTimestamp));

    const timeout = setTimeout(() => {
      setLockedProjectId(null);
      setLockTimestamp(null);
      clearLockFromStorage();
    }, timeRemaining);

    return () => clearTimeout(timeout);
  }, [lockedProjectId, lockTimestamp]);

  const handleLock = useCallback((projectId: string) => {
    const now = Date.now();
    setLockedProjectId(projectId);
    setLockTimestamp(now);
    saveLockToStorage(projectId);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(
          projects.map((p) => p.id),
          oldIndex,
          newIndex
        );
        reorderProjects(newOrder);
      }
    }
  }, [projects, reorderProjects]);

  const handleNavigate = useCallback((projectId: string) => {
    onNavigateToProject?.(projectId);
  }, [onNavigateToProject]);

  const handleOpenDescription = useCallback((projectId: string) => {
    setDescriptionModalProjectId(projectId);
  }, []);

  const handleCloseDescription = useCallback(() => {
    setDescriptionModalProjectId(null);
  }, []);

  const handleOpenNotebook = useCallback((projectId: string) => {
    setNotebookModalProjectId(projectId);
  }, []);

  const handleCloseNotebook = useCallback(() => {
    setNotebookModalProjectId(null);
  }, []);

  if (loadingState === "loading") {
    return null; // Loading is handled by AppLayout
  }

  if (projects.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyContent}>
          <h2 className={styles.emptyTitle}>אין פרויקטים עדיין</h2>
          <p className={styles.emptyDescription}>
            לחץ על כפתור ה-"+" כדי ליצור את הפרויקט הראשון שלך
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.list} role="list" aria-label="רשימת פרויקטים">
            {projects.map((project, index) => (
              <SortableProjectCard
                key={project.id}
                project={project}
                index={index}
                totalProjects={projects.length}
                isLocked={lockedProjectId === project.id}
                isDragging={activeId === project.id}
                onLock={handleLock}
                onNavigate={handleNavigate}
                onOpenDescription={handleOpenDescription}
                onOpenNotebook={handleOpenNotebook}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Project Description Modal */}
      {descriptionModalProject && (
        <ProjectDescriptionModal
          project={descriptionModalProject}
          isOpen={true}
          onClose={handleCloseDescription}
        />
      )}

      {/* Notebook Modal */}
      {notebookModalProject && (
        <NotebookModal
          project={notebookModalProject}
          isOpen={true}
          onClose={handleCloseNotebook}
        />
      )}
    </>
  );
}
