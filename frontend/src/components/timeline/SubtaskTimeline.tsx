import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { Task, TaskSchedule } from "../../types/schema";
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
} from "./types";
import { MilestoneEditor } from "./MilestoneEditor";
import { XIcon, ZoomInIcon, ZoomOutIcon, PlusIcon } from "../icons";
import styles from "./SubtaskTimeline.module.css";

interface SubtaskTimelineProps {
  subtask: Task;
  parentTask: Task;
  onClose: () => void;
}

export function SubtaskTimeline({ subtask, parentTask: _parentTask, onClose }: SubtaskTimelineProps) {
  const { updateTask, createSubtask, getTaskSubtasks } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate view range based on subtask schedule
  const getTimeRange = () => {
    if (subtask.schedule.mode === "range") {
      return {
        start: new Date(subtask.schedule.start_iso).getTime(),
        end: new Date(subtask.schedule.end_iso).getTime(),
      };
    } else {
      const pointTime = new Date(subtask.schedule.point_iso).getTime();
      // Give 24 hours padding around a point
      const padding = 12 * 60 * 60 * 1000;
      return {
        start: pointTime - padding,
        end: pointTime + padding,
      };
    }
  };

  const initialRange = getTimeRange();

  // View state
  const [viewStart, setViewStart] = useState(initialRange.start);
  const [viewEnd, setViewEnd] = useState(initialRange.end);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(() =>
    getZoomLevelForDuration(initialRange.end - initialRange.start)
  );

  // Drag state
  const [dragState, setDragState] = useState<{
    type: "move" | "resize-start" | "resize-end";
    startX: number;
    originalStart: number;
    originalEnd: number;
  } | null>(null);

  // Selected sub-subtask for editing
  const [selectedTask, setSelectedTask] = useState<{
    task: Task;
    anchorRect: DOMRect;
  } | null>(null);

  // Get child tasks (sub-subtasks) - reserved for future use
  const _childTasks = getTaskSubtasks(subtask.id);
  void _childTasks; // suppress unused warning

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

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to prevent immediate close
    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Zoom handlers
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

  // Generate ticks
  const ticks = useMemo(
    () => generateTicks(viewStart, viewEnd, zoomLevel),
    [viewStart, viewEnd, zoomLevel]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, type: "move" | "resize-start" | "resize-end") => {
      e.preventDefault();
      e.stopPropagation();

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;

      let originalStart: number;
      let originalEnd: number;

      if (subtask.schedule.mode === "range") {
        originalStart = new Date(subtask.schedule.start_iso).getTime();
        originalEnd = new Date(subtask.schedule.end_iso).getTime();
      } else {
        const pointTime = new Date(subtask.schedule.point_iso).getTime();
        originalStart = pointTime;
        originalEnd = pointTime;
      }

      setDragState({
        type,
        startX: clientX,
        originalStart,
        originalEnd,
      });
    },
    [subtask.schedule]
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragState || containerWidth === 0) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - dragState.startX;
      const config = ZOOM_CONFIGS[zoomLevel];

      // RTL: negative deltaX = forward in time
      const timeDelta = -deltaX * ((viewEnd - viewStart) / containerWidth);

      let newSchedule: TaskSchedule;

      if (subtask.schedule.mode === "range") {
        let newStart = dragState.originalStart;
        let newEnd = dragState.originalEnd;

        if (dragState.type === "move") {
          newStart = snapTime(dragState.originalStart + timeDelta, config.snapInterval);
          newEnd = snapTime(dragState.originalEnd + timeDelta, config.snapInterval);
        } else if (dragState.type === "resize-start") {
          newEnd = snapTime(dragState.originalEnd + timeDelta, config.snapInterval);
          if (newEnd <= newStart) {
            newEnd = newStart + config.snapInterval;
          }
        } else if (dragState.type === "resize-end") {
          newStart = snapTime(dragState.originalStart + timeDelta, config.snapInterval);
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

      updateTask(subtask.id, { schedule: newSchedule });
    },
    [dragState, containerWidth, viewStart, viewEnd, zoomLevel, subtask, updateTask]
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

  // Add new sub-subtask
  const handleAddSubtask = useCallback(() => {
    const center = (viewStart + viewEnd) / 2;
    const duration = (viewEnd - viewStart) / 10;
    const config = ZOOM_CONFIGS[zoomLevel];

    const newSchedule: TaskSchedule = {
      mode: "range",
      start_iso: new Date(snapTime(center - duration / 2, config.snapInterval)).toISOString(),
      end_iso: new Date(snapTime(center + duration / 2, config.snapInterval)).toISOString(),
    };

    createSubtask(subtask.id, newSchedule);
  }, [viewStart, viewEnd, zoomLevel, subtask.id, createSubtask]);

  // Handle double-click on subtask bar
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    setSelectedTask({ task: subtask, anchorRect: rect });
  }, [subtask]);

  // Today marker
  const todayPosition = timeToPixel(Date.now(), viewStart, viewEnd, containerWidth);
  const showTodayMarker = todayPosition >= 0 && todayPosition <= containerWidth;

  // Zoom level names
  const zoomLevelNames: Record<ZoomLevel, string> = {
    months: "חודשים",
    weeks: "שבועות",
    days: "ימים",
    hours: "שעות",
    minutes: "דקות",
  };

  // Render the subtask bar
  const renderSubtaskBar = () => {
    if (subtask.schedule.mode === "range") {
      const startTime = new Date(subtask.schedule.start_iso).getTime();
      const endTime = new Date(subtask.schedule.end_iso).getTime();

      const startPixel = timeToPixel(startTime, viewStart, viewEnd, containerWidth);
      const endPixel = timeToPixel(endTime, viewStart, viewEnd, containerWidth);

      const left = Math.min(startPixel, endPixel);
      const width = Math.abs(endPixel - startPixel);

      return (
        <div
          className={`${styles.subtaskBar} ${dragState ? styles.dragging : ""}`}
          style={{
            left: `${left}px`,
            width: `${Math.max(width, 20)}px`,
          }}
          onMouseDown={(e) => handleDragStart(e, "move")}
          onTouchStart={(e) => handleDragStart(e, "move")}
          onDoubleClick={handleDoubleClick}
          title={`${subtask.title} (לחץ פעמיים לעריכה)`}
        >
          {/* Resize handles */}
          <div
            className={`${styles.resizeHandle} ${styles.end}`}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart(e, "resize-end");
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart(e, "resize-end");
            }}
          />
          <div
            className={`${styles.resizeHandle} ${styles.start}`}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart(e, "resize-start");
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart(e, "resize-start");
            }}
          />
        </div>
      );
    } else {
      const pointTime = new Date(subtask.schedule.point_iso).getTime();
      const position = timeToPixel(pointTime, viewStart, viewEnd, containerWidth);

      return (
        <div
          className={`${styles.subtaskPoint} ${dragState ? styles.dragging : ""}`}
          style={{ left: `${position}px` }}
          onMouseDown={(e) => handleDragStart(e, "move")}
          onTouchStart={(e) => handleDragStart(e, "move")}
          onDoubleClick={handleDoubleClick}
          title={`${subtask.title} (לחץ פעמיים לעריכה)`}
        />
      );
    }
  };

  return (
    <div ref={containerRef} className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>{subtask.title}</span>
        <button className={styles.closeButton} onClick={onClose} title="סגור">
          <XIcon size={14} />
        </button>
      </div>

      {/* Mini timeline */}
      <div className={styles.timeline}>
        {/* Zoom controls */}
        <div className={styles.zoomControls}>
          <button
            className={styles.zoomButton}
            onClick={handleZoomOut}
            disabled={zoomLevel === "months"}
            title="הרחק"
          >
            <ZoomOutIcon size={12} />
          </button>
          <span className={styles.zoomLevel}>{zoomLevelNames[zoomLevel]}</span>
          <button
            className={styles.zoomButton}
            onClick={handleZoomIn}
            disabled={zoomLevel === "minutes"}
            title="קרב"
          >
            <ZoomInIcon size={12} />
          </button>
        </div>

        {/* Axis */}
        <div className={styles.axis}>
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

        {/* Subtask bar area */}
        <div className={styles.barArea}>
          {/* Today marker */}
          {showTodayMarker && (
            <div className={styles.todayMarker} style={{ left: `${todayPosition}px` }} />
          )}

          {/* Subtask bar */}
          {renderSubtaskBar()}

          {/* Subtask label */}
          <div className={styles.subtaskLabel}>
            {subtask.title}
          </div>
        </div>

        {/* Add sub-subtask button */}
        <button
          className={styles.addButton}
          onClick={handleAddSubtask}
          title="הוסף תת-משימה"
        >
          <PlusIcon size={14} />
        </button>
      </div>

      {/* Task editor popover */}
      {selectedTask && (
        <MilestoneEditor
          task={selectedTask.task}
          anchorRect={selectedTask.anchorRect}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
