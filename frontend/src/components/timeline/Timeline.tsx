import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { Project, Task, TaskSchedule } from "../../types/schema";
import { useApp } from "../../contexts";
import {
  type ZoomLevel,
  ZOOM_CONFIGS,
  timeToPixel,
  snapTime,
  getZoomLevelForDuration,
  zoomIn,
  zoomOut,
  generateTicks,
  calculateRowAssignments,
  getMilestoneColor,
} from "./types";
import { MilestoneEditor } from "./MilestoneEditor";
import { SubtaskTimeline } from "./SubtaskTimeline";
import { PlusIcon, ZoomInIcon, ZoomOutIcon, ChevronDownIcon, ChevronUpIcon } from "../icons";
import styles from "./Timeline.module.css";

interface TimelineProps {
  project: Project;
  isLocked: boolean;
}

interface DragState {
  type: "move" | "resize-start" | "resize-end";
  taskId: string;
  startX: number;
  originalStart: number;
  originalEnd: number;
}

export function Timeline({ project, isLocked }: TimelineProps) {
  const { getProjectMilestones, getTaskSubtasks, updateTask, createMilestone } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // View state
  const [viewStart, setViewStart] = useState(() => new Date(project.time_range.start_iso).getTime());
  const [viewEnd, setViewEnd] = useState(() => new Date(project.time_range.end_iso).getTime());
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(() =>
    getZoomLevelForDuration(viewEnd - viewStart)
  );
  const [isHoveringTimeline, setIsHoveringTimeline] = useState(false);

  // Drag state
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Selected milestone for editing
  const [selectedMilestone, setSelectedMilestone] = useState<{
    task: Task;
    anchorRect: DOMRect;
  } | null>(null);

  // Ref for the add button (to position editor when creating new task)
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // Track newly created task ID to open editor after state updates
  const [pendingEditTaskId, setPendingEditTaskId] = useState<string | null>(null);

  // Subtask drill-down state
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null);

  // Get milestones for this project
  const milestones = getProjectMilestones(project.id);

  // Get subtasks for expanded milestone
  const expandedMilestone = milestones.find((m) => m.id === expandedMilestoneId);
  const subtasks = expandedMilestone ? getTaskSubtasks(expandedMilestoneId!) : [];
  const selectedSubtask = subtasks.find((s) => s.id === selectedSubtaskId);

  // Calculate row positions for overlapping milestones
  const milestonePositions = useMemo(() => {
    const positions = milestones.map((m) => {
      if (m.schedule.mode === "range") {
        return {
          id: m.id,
          start: new Date(m.schedule.start_iso).getTime(),
          end: new Date(m.schedule.end_iso).getTime(),
        };
      } else {
        const pointTime = new Date(m.schedule.point_iso).getTime();
        // For points, give them a small width for overlap detection
        return {
          id: m.id,
          start: pointTime - 1000 * 60 * 30, // 30 min buffer
          end: pointTime + 1000 * 60 * 30,
        };
      }
    });
    return calculateRowAssignments(positions);
  }, [milestones]);

  // Get row assignment for a milestone
  const getRowForMilestone = useCallback(
    (id: string) => milestonePositions.find((p) => p.id === id)?.row ?? 0,
    [milestonePositions]
  );

  // Total rows needed
  const totalRows = useMemo(
    () => Math.max(1, ...milestonePositions.map((p) => p.row + 1)),
    [milestonePositions]
  );

  // Update container width on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    setContainerWidth(container.clientWidth);

    return () => observer.disconnect();
  }, []);

  // Handle zoom via wheel
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Only zoom if locked and hovering, or Shift is held
      const shouldZoom = (isLocked && isHoveringTimeline) || e.shiftKey;

      if (!shouldZoom) return;

      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY;
      if (delta < 0) {
        // Scroll up = zoom in
        setZoomLevel((prev) => zoomIn(prev));
        // Narrow the view
        const center = (viewStart + viewEnd) / 2;
        const duration = viewEnd - viewStart;
        const newDuration = duration * 0.8;
        setViewStart(center - newDuration / 2);
        setViewEnd(center + newDuration / 2);
      } else {
        // Scroll down = zoom out
        setZoomLevel((prev) => zoomOut(prev));
        // Widen the view
        const center = (viewStart + viewEnd) / 2;
        const duration = viewEnd - viewStart;
        const newDuration = duration * 1.25;
        setViewStart(center - newDuration / 2);
        setViewEnd(center + newDuration / 2);
      }
    },
    [isLocked, isHoveringTimeline, viewStart, viewEnd]
  );

  // Attach wheel listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Handle Escape key to close subtask drill-down
  useEffect(() => {
    if (!selectedSubtaskId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedSubtaskId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedSubtaskId]);

  // Open editor when a new task is created and appears in state
  useEffect(() => {
    if (!pendingEditTaskId) return;

    const newTask = milestones.find((m) => m.id === pendingEditTaskId);
    if (newTask && addButtonRef.current) {
      const rect = addButtonRef.current.getBoundingClientRect();
      setSelectedMilestone({ task: newTask, anchorRect: rect });
      setPendingEditTaskId(null);
    }
  }, [pendingEditTaskId, milestones]);

  // Toggle milestone expansion
  const handleToggleExpand = useCallback((milestoneId: string) => {
    setExpandedMilestoneId((prev) => (prev === milestoneId ? null : milestoneId));
    setSelectedSubtaskId(null);
  }, []);

  // Select a subtask
  const handleSelectSubtask = useCallback((subtaskId: string) => {
    setSelectedSubtaskId((prev) => (prev === subtaskId ? null : subtaskId));
  }, []);

  // Close subtask timeline
  const handleCloseSubtaskTimeline = useCallback(() => {
    setSelectedSubtaskId(null);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback(
    (
      e: React.MouseEvent | React.TouchEvent,
      taskId: string,
      type: "move" | "resize-start" | "resize-end"
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const task = milestones.find((m) => m.id === taskId);
      if (!task) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;

      let originalStart: number;
      let originalEnd: number;

      if (task.schedule.mode === "range") {
        originalStart = new Date(task.schedule.start_iso).getTime();
        originalEnd = new Date(task.schedule.end_iso).getTime();
      } else {
        const pointTime = new Date(task.schedule.point_iso).getTime();
        originalStart = pointTime;
        originalEnd = pointTime;
      }

      setDragState({
        type,
        taskId,
        startX: clientX,
        originalStart,
        originalEnd,
      });
    },
    [milestones]
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragState || containerWidth === 0) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - dragState.startX;
      const config = ZOOM_CONFIGS[zoomLevel];

      // Convert pixel delta to time delta (RTL: negative deltaX = forward in time)
      const timeDelta = -deltaX * ((viewEnd - viewStart) / containerWidth);

      const task = milestones.find((m) => m.id === dragState.taskId);
      if (!task) return;

      let newSchedule: TaskSchedule;

      if (task.schedule.mode === "range") {
        let newStart = dragState.originalStart;
        let newEnd = dragState.originalEnd;

        if (dragState.type === "move") {
          newStart = snapTime(dragState.originalStart + timeDelta, config.snapInterval);
          newEnd = snapTime(dragState.originalEnd + timeDelta, config.snapInterval);
        } else if (dragState.type === "resize-start") {
          // RTL: resize-start affects the end time
          newEnd = snapTime(dragState.originalEnd + timeDelta, config.snapInterval);
          // Don't allow end before start
          if (newEnd <= newStart) {
            newEnd = newStart + config.snapInterval;
          }
        } else if (dragState.type === "resize-end") {
          // RTL: resize-end affects the start time
          newStart = snapTime(dragState.originalStart + timeDelta, config.snapInterval);
          // Don't allow start after end
          if (newStart >= newEnd) {
            newStart = newEnd - config.snapInterval;
          }
        }

        newSchedule = {
          mode: "range",
          start_iso: new Date(newStart).toISOString(),
          end_iso: new Date(newEnd).toISOString(),
        };
      } else {
        const newPoint = snapTime(dragState.originalStart + timeDelta, config.snapInterval);
        newSchedule = {
          mode: "point",
          point_iso: new Date(newPoint).toISOString(),
        };
      }

      updateTask(dragState.taskId, { schedule: newSchedule });
    },
    [dragState, containerWidth, viewStart, viewEnd, zoomLevel, milestones, updateTask]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

  // Attach drag listeners
  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
    const handleEnd = () => handleDragEnd();

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [dragState, handleDragMove, handleDragEnd]);

  // Generate axis ticks
  const ticks = useMemo(
    () => generateTicks(viewStart, viewEnd, zoomLevel),
    [viewStart, viewEnd, zoomLevel]
  );

  // Handle adding a new milestone
  const handleAddMilestone = useCallback(() => {
    const center = (viewStart + viewEnd) / 2;
    const duration = (viewEnd - viewStart) / 10;
    const config = ZOOM_CONFIGS[zoomLevel];

    const newSchedule: TaskSchedule = {
      mode: "range",
      start_iso: new Date(snapTime(center - duration / 2, config.snapInterval)).toISOString(),
      end_iso: new Date(snapTime(center + duration / 2, config.snapInterval)).toISOString(),
    };

    const newTaskId = createMilestone(project.id, newSchedule);
    // Open editor for the new task
    setPendingEditTaskId(newTaskId);
  }, [viewStart, viewEnd, zoomLevel, project.id, createMilestone]);

  // Zoom button handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => zoomIn(prev));
    const center = (viewStart + viewEnd) / 2;
    const duration = viewEnd - viewStart;
    const newDuration = duration * 0.8;
    setViewStart(center - newDuration / 2);
    setViewEnd(center + newDuration / 2);
  }, [viewStart, viewEnd]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => zoomOut(prev));
    const center = (viewStart + viewEnd) / 2;
    const duration = viewEnd - viewStart;
    const newDuration = duration * 1.25;
    setViewStart(center - newDuration / 2);
    setViewEnd(center + newDuration / 2);
  }, [viewStart, viewEnd]);

  // Handle milestone double-click for editing
  const handleMilestoneDoubleClick = useCallback((e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    setSelectedMilestone({ task, anchorRect: rect });
  }, []);

  // Today marker position
  const todayPosition = timeToPixel(Date.now(), viewStart, viewEnd, containerWidth);
  const showTodayMarker = todayPosition >= 0 && todayPosition <= containerWidth;

  // Zoom level display names
  const zoomLevelNames: Record<ZoomLevel, string> = {
    months: "חודשים",
    weeks: "שבועות",
    days: "ימים",
    hours: "שעות",
    minutes: "דקות",
  };

  // Render a milestone
  const renderMilestone = (task: Task, row: number) => {
    const color = getMilestoneColor(row);
    const isDragging = dragState?.taskId === task.id;

    if (task.schedule.mode === "range") {
      const startTime = new Date(task.schedule.start_iso).getTime();
      const endTime = new Date(task.schedule.end_iso).getTime();

      const startPixel = timeToPixel(startTime, viewStart, viewEnd, containerWidth);
      const endPixel = timeToPixel(endTime, viewStart, viewEnd, containerWidth);

      // In RTL: startPixel > endPixel
      const left = Math.min(startPixel, endPixel);
      const width = Math.abs(endPixel - startPixel);

      return (
        <div
          key={task.id}
          className={`${styles.milestoneBar} ${isDragging ? styles.dragging : ""}`}
          style={{
            left: `${left}px`,
            width: `${Math.max(width, 20)}px`,
            top: `${row * 28}px`,
            backgroundColor: color,
          }}
          onMouseDown={(e) => handleDragStart(e, task.id, "move")}
          onTouchStart={(e) => handleDragStart(e, task.id, "move")}
          onDoubleClick={(e) => handleMilestoneDoubleClick(e, task)}
          title={`${task.title} (לחץ פעמיים לעריכה)`}
        >
          {/* Resize handles - RTL: end on left, start on right */}
          <div
            className={`${styles.resizeHandle} ${styles.end}`}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart(e, task.id, "resize-end");
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart(e, task.id, "resize-end");
            }}
          />
          <div
            className={`${styles.resizeHandle} ${styles.start}`}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart(e, task.id, "resize-start");
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart(e, task.id, "resize-start");
            }}
          />
        </div>
      );
    } else {
      // Point milestone
      const pointTime = new Date(task.schedule.point_iso).getTime();
      const position = timeToPixel(pointTime, viewStart, viewEnd, containerWidth);

      return (
        <div
          key={task.id}
          className={`${styles.milestonePoint} ${isDragging ? styles.dragging : ""}`}
          style={{
            left: `${position}px`,
            top: `${row * 28 + 2}px`,
            backgroundColor: color,
          }}
          onMouseDown={(e) => handleDragStart(e, task.id, "move")}
          onTouchStart={(e) => handleDragStart(e, task.id, "move")}
          onDoubleClick={(e) => handleMilestoneDoubleClick(e, task)}
          title={`${task.title} (לחץ פעמיים לעריכה)`}
        />
      );
    }
  };

  // Render milestone labels below the bars
  const renderMilestoneLabels = () => {
    return milestones.map((task) => {
      const row = getRowForMilestone(task.id);
      const color = getMilestoneColor(row);

      let centerX: number;
      if (task.schedule.mode === "range") {
        const startTime = new Date(task.schedule.start_iso).getTime();
        const endTime = new Date(task.schedule.end_iso).getTime();
        const startPixel = timeToPixel(startTime, viewStart, viewEnd, containerWidth);
        const endPixel = timeToPixel(endTime, viewStart, viewEnd, containerWidth);
        centerX = (startPixel + endPixel) / 2;
      } else {
        const pointTime = new Date(task.schedule.point_iso).getTime();
        centerX = timeToPixel(pointTime, viewStart, viewEnd, containerWidth);
      }

      const labelTop = totalRows * 28 + 8;

      return (
        <div key={`label-${task.id}`}>
          {/* Connector line */}
          {totalRows > 1 && (
            <div
              className={styles.connectorLine}
              style={{
                left: `${centerX}px`,
                top: `${row * 28 + 20}px`,
                height: `${labelTop - (row * 28 + 20)}px`,
                backgroundColor: color,
                opacity: 0.5,
              }}
            />
          )}
          {/* Label with expand button */}
          <div
            className={`${styles.milestoneLabel} ${expandedMilestoneId === task.id ? styles.expanded : ""}`}
            style={{
              left: `${centerX}px`,
              top: `${labelTop}px`,
              transform: "translateX(-50%)",
              borderColor: color,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            <span className={styles.milestoneLabelText}>{task.title || "משימה"}</span>
            {task.child_task_ids.length > 0 && (
              <button
                className={styles.expandButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(task.id);
                }}
                title={expandedMilestoneId === task.id ? "סגור תתי-משימות" : "הצג תתי-משימות"}
              >
                {expandedMilestoneId === task.id ? (
                  <ChevronUpIcon size={12} />
                ) : (
                  <ChevronDownIcon size={12} />
                )}
                <span className={styles.subtaskCount}>{task.child_task_ids.length}</span>
              </button>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      className={styles.timelineContainer}
      onMouseEnter={() => setIsHoveringTimeline(true)}
      onMouseLeave={() => setIsHoveringTimeline(false)}
    >
      <div
        className={`${styles.timeline} ${isLocked && isHoveringTimeline ? styles.zoomActive : ""}`}
      >
        {/* Zoom controls */}
        <div className={styles.zoomControls}>
          <button
            className={styles.zoomButton}
            onClick={handleZoomOut}
            disabled={zoomLevel === "months"}
            title="הרחק"
          >
            <ZoomOutIcon size={14} />
          </button>
          <span className={styles.zoomLevel}>{zoomLevelNames[zoomLevel]}</span>
          <button
            className={styles.zoomButton}
            onClick={handleZoomIn}
            disabled={zoomLevel === "minutes"}
            title="קרב"
          >
            <ZoomInIcon size={14} />
          </button>
        </div>

        {/* Axis area with date labels */}
        <div className={styles.axisArea}>
          <div className={styles.axisContent}>
            <div className={styles.axisLine} />
            <div className={styles.axisArrow} />
            {ticks.map((tick, i) => {
              const position = timeToPixel(tick.time, viewStart, viewEnd, containerWidth);
              if (position < 0 || position > containerWidth) return null;

              return (
                <div key={i}>
                  <div
                    className={`${styles.tick} ${tick.isMajor ? styles.major : styles.minor}`}
                    style={{ left: `${position}px` }}
                  />
                  {tick.label && (
                    <div className={styles.tickLabel} style={{ left: `${position}px` }}>
                      {tick.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Milestones area */}
        <div className={styles.milestonesArea}>
          {milestones.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon}>📅</span>
              <span>אין משימות עדיין</span>
            </div>
          ) : (
            <div
              className={styles.milestonesContent}
              style={{ minHeight: `${totalRows * 28 + 40}px` }}
            >
              {/* Today marker */}
              {showTodayMarker && (
                <div className={styles.todayMarker} style={{ left: `${todayPosition}px` }} />
              )}

              {/* Milestone bars/points */}
              {milestones.map((task) => {
                const row = getRowForMilestone(task.id);
                return renderMilestone(task, row);
              })}

              {/* Milestone labels */}
              {renderMilestoneLabels()}
            </div>
          )}
        </div>

        {/* Add milestone button */}
        <button
          ref={addButtonRef}
          className={styles.addButton}
          onClick={handleAddMilestone}
          title="הוסף משימה"
        >
          <PlusIcon size={16} />
        </button>

        {/* Subtask list (when milestone is expanded) */}
        {expandedMilestone && subtasks.length > 0 && (
          <div className={styles.subtaskSection}>
            <div className={styles.subtaskList}>
              {subtasks.map((subtask) => (
                <button
                  key={subtask.id}
                  className={`${styles.subtaskItem} ${
                    selectedSubtaskId === subtask.id ? styles.selected : ""
                  } ${
                    selectedSubtaskId && selectedSubtaskId !== subtask.id ? styles.dimmed : ""
                  }`}
                  onClick={() => handleSelectSubtask(subtask.id)}
                >
                  <span className={styles.subtaskTitle}>{subtask.title}</span>
                  <span className={styles.subtaskStatus}>
                    {subtask.status.type === "waiting_for"
                      ? `מחכה ל${subtask.status.waiting_for}`
                      : subtask.status.type === "done"
                      ? "הושלם"
                      : subtask.status.type === "in_progress"
                      ? "בתהליך"
                      : subtask.status.type === "stuck"
                      ? "תקוע"
                      : "לא התחיל"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected subtask timeline */}
        {selectedSubtask && (
          <SubtaskTimeline
            subtask={selectedSubtask}
            parentTask={expandedMilestone!}
            onClose={handleCloseSubtaskTimeline}
          />
        )}
      </div>

      {/* Milestone Editor */}
      {selectedMilestone && (
        <MilestoneEditor
          task={selectedMilestone.task}
          anchorRect={selectedMilestone.anchorRect}
          onClose={() => setSelectedMilestone(null)}
        />
      )}
    </div>
  );
}
