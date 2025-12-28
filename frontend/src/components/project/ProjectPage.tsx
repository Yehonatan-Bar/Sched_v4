import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Task, StatusType } from "../../types/schema";
import { useApp } from "../../contexts";
import { TaskDetailsModal } from "../modals";
import { ArrowRightIcon, EditIcon } from "../icons";
import styles from "./ProjectPage.module.css";

const STATUS_LABELS: Record<StatusType, string> = {
  not_started: "לא התחיל",
  in_progress: "בתהליך",
  stuck: "תקוע",
  done: "הושלם",
  waiting_for: "מחכה ל...",
};

const STATUS_COLORS: Record<StatusType, string> = {
  not_started: "var(--color-text-secondary)",
  in_progress: "var(--color-primary)",
  stuck: "var(--color-error)",
  done: "var(--color-success)",
  waiting_for: "var(--color-warning)",
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function getTaskDateDisplay(task: Task): string {
  if (task.schedule.mode === "range") {
    return `${formatDate(task.schedule.start_iso)} - ${formatDate(task.schedule.end_iso)}`;
  }
  return formatDate(task.schedule.point_iso);
}

interface FlatTask extends Task {
  depth: number;
  parentTitle?: string;
}

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { state, getProjectMilestones, getTaskSubtasks } = useApp();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Get project
  const project = projectId && state ? state.projects[projectId] : null;

  // Get all tasks recursively in a flat list
  const flatTasks = useMemo((): FlatTask[] => {
    if (!projectId || !state) return [];

    const result: FlatTask[] = [];

    function collectTasks(taskId: string, depth: number, parentTitle?: string) {
      const task = state!.tasks[taskId];
      if (!task) return;

      result.push({ ...task, depth, parentTitle });

      const subtasks = getTaskSubtasks(taskId);
      for (const subtask of subtasks) {
        collectTasks(subtask.id, depth + 1, task.title);
      }
    }

    const milestones = getProjectMilestones(projectId);
    for (const milestone of milestones) {
      collectTasks(milestone.id, 0);
    }

    return result;
  }, [projectId, state, getProjectMilestones, getTaskSubtasks]);

  const handleBack = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleOpenTask = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleCloseTask = useCallback(() => {
    setSelectedTask(null);
  }, []);

  if (!project) {
    return (
      <div className={styles.notFound}>
        <h2>הפרויקט לא נמצא</h2>
        <button className={styles.backButton} onClick={handleBack}>
          <ArrowRightIcon size={18} />
          חזרה לדף הראשי
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBack} title="חזרה">
          <ArrowRightIcon size={20} />
        </button>
        <div className={styles.projectInfo}>
          <h1 className={styles.projectTitle}>{project.title}</h1>
          {project.short_description && (
            <p className={styles.projectDescription}>{project.short_description}</p>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className={styles.taskList}>
        {flatTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📋</span>
            <p>אין משימות בפרויקט זה</p>
            <p className={styles.emptyHint}>הוסף משימות מדף הבית בעזרת ציר הזמן</p>
          </div>
        ) : (
          <>
            <div className={styles.taskHeader}>
              <span className={styles.taskHeaderTitle}>משימה</span>
              <span className={styles.taskHeaderDates}>תאריכים</span>
              <span className={styles.taskHeaderStatus}>סטטוס</span>
              <span className={styles.taskHeaderActions}>פעולות</span>
            </div>
            {flatTasks.map((task) => (
              <div
                key={task.id}
                className={`${styles.taskItem} ${task.depth > 0 ? styles.subtask : ""}`}
                style={{ paddingRight: `${1 + task.depth * 1.5}rem` }}
              >
                <div className={styles.taskTitle}>
                  {task.depth > 0 && (
                    <span className={styles.taskParent}>
                      {task.parentTitle} &larr;
                    </span>
                  )}
                  <span className={styles.taskName}>{task.title || "משימה ללא שם"}</span>
                </div>
                <div className={styles.taskDates}>
                  {getTaskDateDisplay(task)}
                </div>
                <div
                  className={styles.taskStatus}
                  style={{ color: STATUS_COLORS[task.status.type] }}
                >
                  {task.status.type === "waiting_for" && task.status.waiting_for
                    ? `מחכה ל${task.status.waiting_for}`
                    : STATUS_LABELS[task.status.type]}
                </div>
                <div className={styles.taskActions}>
                  <button
                    className={styles.editButton}
                    onClick={() => handleOpenTask(task)}
                    title="ערוך משימה"
                  >
                    <EditIcon size={16} />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Task details modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={true}
          onClose={handleCloseTask}
        />
      )}
    </div>
  );
}
