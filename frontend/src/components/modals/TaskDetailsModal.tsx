import { useState, useEffect, useMemo } from "react";
import type { Task, StatusType, TaskSchedule } from "../../types/schema";
import { useApp } from "../../contexts";
import { Modal } from "../common";
import { TrashIcon } from "../icons";
import styles from "./TaskDetailsModal.module.css";
import modalStyles from "../common/Modal.module.css";

interface TaskDetailsModalProps {
  task: Task;
  isOpen: boolean;
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

export function TaskDetailsModal({
  task,
  isOpen,
  onClose,
}: TaskDetailsModalProps) {
  const { updateTask, deleteTask } = useApp();

  // Form state
  const [title, setTitle] = useState(task.title);
  const [details, setDetails] = useState(task.details);
  const [notes, setNotes] = useState(task.notes);
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
  const [priority, setPriority] = useState(task.priority);
  const [people, setPeople] = useState(task.people.join(", "));

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

  // Sync with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(task.title);
      setDetails(task.details);
      setNotes(task.notes);
      setMode(task.schedule.mode);
      setStartDate(
        task.schedule.mode === "range"
          ? formatDateForInput(task.schedule.start_iso)
          : formatDateForInput(task.schedule.point_iso)
      );
      setEndDate(
        task.schedule.mode === "range"
          ? formatDateForInput(task.schedule.end_iso)
          : formatDateForInput(task.schedule.point_iso)
      );
      setStatus(task.status.type);
      setWaitingFor(task.status.waiting_for || "");
      setPriority(task.priority);
      setPeople(task.people.join(", "));
      setError(null);
    }
  }, [isOpen, task]);

  const handleSave = () => {
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

    // Parse people array
    const peopleArray = people
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Update task
    updateTask(task.id, {
      title,
      details,
      notes,
      schedule,
      status: {
        type: status,
        waiting_for: status === "waiting_for" ? waitingFor : null,
      },
      priority,
      people: peopleArray,
    });

    onClose();
  };

  const handleDelete = () => {
    if (confirm("האם למחוק את המשימה?")) {
      deleteTask(task.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`פרטי משימה - ${task.title}`}
      size="large"
      footer={
        <>
          <button className={styles.deleteButton} onClick={handleDelete}>
            <TrashIcon size={14} />
            מחק
          </button>
          <div className={styles.spacer} />
          <button className={modalStyles.cancelButton} onClick={onClose}>
            ביטול
          </button>
          <button className={modalStyles.saveButton} onClick={handleSave}>
            שמור
          </button>
        </>
      }
    >
      <div className={styles.formGrid}>
        {/* Title */}
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

        {/* Details */}
        <div className={styles.field}>
          <label className={styles.label}>תיאור מפורט</label>
          <textarea
            className={styles.textarea}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="תיאור מפורט של המשימה..."
            style={{ minHeight: "100px" }}
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

        {/* Status and Priority row */}
        <div className={styles.twoColumns}>
          <div className={styles.field}>
            <label className={styles.label}>סטטוס</label>
            <select
              className={styles.select}
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

          <div className={styles.field}>
            <label className={styles.label}>עדיפות</label>
            <input
              type="number"
              className={styles.input}
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
              min={1}
              max={10}
            />
          </div>
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

        {/* People */}
        <div className={styles.field}>
          <label className={styles.label}>אנשים מעורבים (מופרדים בפסיקים)</label>
          <input
            type="text"
            className={styles.input}
            value={people}
            onChange={(e) => setPeople(e.target.value)}
            placeholder="לדוגמא: יוסי, מרים, דוד"
          />
        </div>

        {/* Notes */}
        <div className={styles.field}>
          <label className={styles.label}>הערות</label>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הערות חופשיות..."
            style={{ minHeight: "120px" }}
          />
        </div>
      </div>
    </Modal>
  );
}
