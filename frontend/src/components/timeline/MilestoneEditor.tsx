import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { Task, TaskSchedule, StatusType } from "../../types/schema";
import { useApp } from "../../contexts";
import { XIcon, TrashIcon } from "../icons";
import styles from "./MilestoneEditor.module.css";

interface MilestoneEditorProps {
  task: Task;
  anchorRect: DOMRect;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: StatusType; label: string }[] = [
  { value: "not_started", label: "לא התחיל" },
  { value: "in_progress", label: "בתהליך" },
  { value: "stuck", label: "תקוע" },
  { value: "done", label: "הושלם" },
  { value: "waiting_for", label: "מחכה ל..." },
];

function formatDateForInput(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateFromInput(inputValue: string): string {
  const date = new Date(inputValue);
  return date.toISOString();
}

export function MilestoneEditor({ task, anchorRect, onClose }: MilestoneEditorProps) {
  const { updateTask, deleteTask } = useApp();
  const editorRef = useRef<HTMLDivElement>(null);

  // Form state
  const [title, setTitle] = useState(task.title);
  const [mode, setMode] = useState<"range" | "point">(task.schedule.mode);
  const [startDate, setStartDate] = useState(() =>
    task.schedule.mode === "range"
      ? formatDateForInput(task.schedule.start_iso)
      : formatDateForInput(task.schedule.point_iso)
  );
  const [endDate, setEndDate] = useState(() =>
    task.schedule.mode === "range"
      ? formatDateForInput(task.schedule.end_iso)
      : formatDateForInput(task.schedule.point_iso)
  );
  const [status, setStatus] = useState<StatusType>(task.status.type);
  const [waitingFor, setWaitingFor] = useState(task.status.waiting_for || "");
  const [notes, setNotes] = useState(task.notes);

  // Real-time date validation
  const dateValidationError = useMemo(() => {
    if (mode !== "range") return null;
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    if (isNaN(startTime) || isNaN(endTime)) return null;
    if (endTime <= startTime) {
      return "תאריך סיום חייב להיות אחרי תאריך התחלה";
    }
    return null;
  }, [mode, startDate, endDate]);

  const [error, setError] = useState<string | null>(null);

  // Position the editor near the milestone
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!editorRef.current) return;

    const editorRect = editorRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = anchorRect.bottom + 8;
    let left = anchorRect.left;

    // Adjust if overflowing right
    if (left + editorRect.width > viewportWidth - 16) {
      left = viewportWidth - editorRect.width - 16;
    }

    // Adjust if overflowing bottom - position above anchor instead
    if (top + editorRect.height > viewportHeight - 16) {
      top = anchorRect.top - editorRect.height - 8;
    }

    // Ensure not off-screen
    left = Math.max(16, left);
    top = Math.max(16, top);

    setPosition({ top, left });
  }, [anchorRect]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use a timeout to prevent immediate close when clicking to open
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSave = useCallback(() => {
    setError(null);

    // Check real-time validation
    if (dateValidationError) {
      setError(dateValidationError);
      return;
    }

    // Build schedule
    let schedule: TaskSchedule;
    if (mode === "range") {
      schedule = {
        mode: "range",
        start_iso: parseDateFromInput(startDate),
        end_iso: parseDateFromInput(endDate),
      };
    } else {
      schedule = {
        mode: "point",
        point_iso: parseDateFromInput(startDate),
      };
    }

    // Update task
    updateTask(task.id, {
      title,
      schedule,
      status: {
        type: status,
        waiting_for: status === "waiting_for" ? waitingFor : null,
      },
      notes,
    });

    onClose();
  }, [title, mode, startDate, endDate, status, waitingFor, notes, task.id, updateTask, onClose, dateValidationError]);

  const handleDelete = useCallback(() => {
    if (confirm("האם למחוק את המשימה?")) {
      deleteTask(task.id);
      onClose();
    }
  }, [task.id, deleteTask, onClose]);

  return (
    <>
      {/* Overlay */}
      <div className={styles.editorOverlay} onClick={onClose} />

      {/* Editor popover */}
      <div
        ref={editorRef}
        className={styles.editor}
        style={{
          top: position.top,
          left: position.left
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <h4 className={styles.title}>עריכת משימה</h4>
          <button className={styles.closeButton} onClick={onClose} title="סגור">
            <XIcon size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className={styles.editorContent}>
          {/* Title field */}
          <div className={styles.field}>
            <label className={styles.label}>שם המשימה</label>
            <input
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="שם המשימה"
            />
          </div>

          {/* Mode toggle */}
          <div className={styles.field}>
            <label className={styles.label}>סוג</label>
            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeButton} ${mode === "range" ? styles.active : ""}`}
                onClick={() => setMode("range")}
              >
                טווח זמן
              </button>
              <button
                className={`${styles.modeButton} ${mode === "point" ? styles.active : ""}`}
                onClick={() => setMode("point")}
              >
                נקודת זמן
              </button>
            </div>
          </div>

          {/* Date fields */}
          {mode === "range" ? (
            <div className={styles.dateRow}>
              <div className={styles.dateField}>
                <label className={styles.label}>התחלה</label>
                <input
                  type="datetime-local"
                  className={`${styles.dateInput} ${dateValidationError ? styles.invalid : ""}`}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className={styles.dateField}>
                <label className={styles.label}>סיום</label>
                <input
                  type="datetime-local"
                  className={`${styles.dateInput} ${dateValidationError ? styles.invalid : ""}`}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className={styles.field}>
              <label className={styles.label}>תאריך ושעה</label>
              <input
                type="datetime-local"
                className={styles.dateInput}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          )}

          {/* Real-time validation error */}
          {dateValidationError && (
            <div className={styles.error}>{dateValidationError}</div>
          )}

          {/* Save error message */}
          {error && !dateValidationError && <div className={styles.error}>{error}</div>}

          {/* Status field */}
          <div className={styles.field}>
            <label className={styles.label}>סטטוס</label>
            <select
              className={styles.statusSelect}
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusType)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Waiting for field (conditional) */}
          {status === "waiting_for" && (
            <div className={styles.field}>
              <label className={styles.label}>מחכה ל</label>
              <input
                type="text"
                className={styles.input}
                value={waitingFor}
                onChange={(e) => setWaitingFor(e.target.value)}
                placeholder="שם האדם"
              />
            </div>
          )}

          {/* Notes field */}
          <div className={styles.field}>
            <label className={styles.label}>הערות</label>
            <textarea
              className={styles.notesInput}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות חופשיות..."
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.deleteButton} onClick={handleDelete}>
            <TrashIcon size={14} />
            מחק
          </button>
          <div className={styles.spacer} />
          <button className={styles.saveButton} onClick={handleSave}>
            שמור
          </button>
        </div>
      </div>
    </>
  );
}
