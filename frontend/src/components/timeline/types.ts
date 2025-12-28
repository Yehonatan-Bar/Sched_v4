/**
 * Timeline types and utilities
 */

export type ZoomLevel = "months" | "weeks" | "days" | "hours" | "minutes";

export interface ZoomConfig {
  level: ZoomLevel;
  /** Pixels per unit (e.g., pixels per day at "days" level) */
  pixelsPerUnit: number;
  /** Snap interval in milliseconds */
  snapInterval: number;
  /** Format for date labels */
  labelFormat: string;
  /** Minor tick interval in milliseconds */
  minorTickInterval: number;
  /** Major tick interval in milliseconds */
  majorTickInterval: number;
}

export const ZOOM_LEVELS: ZoomLevel[] = ["months", "weeks", "days", "hours", "minutes"];

export const ZOOM_CONFIGS: Record<ZoomLevel, ZoomConfig> = {
  months: {
    level: "months",
    pixelsPerUnit: 120, // pixels per month
    snapInterval: 7 * 24 * 60 * 60 * 1000, // snap to week
    labelFormat: "MM/YY",
    minorTickInterval: 7 * 24 * 60 * 60 * 1000, // week
    majorTickInterval: 30 * 24 * 60 * 60 * 1000, // month (approx)
  },
  weeks: {
    level: "weeks",
    pixelsPerUnit: 100, // pixels per week
    snapInterval: 24 * 60 * 60 * 1000, // snap to day
    labelFormat: "DD/MM",
    minorTickInterval: 24 * 60 * 60 * 1000, // day
    majorTickInterval: 7 * 24 * 60 * 60 * 1000, // week
  },
  days: {
    level: "days",
    pixelsPerUnit: 80, // pixels per day
    snapInterval: 60 * 60 * 1000, // snap to hour
    labelFormat: "DD/MM",
    minorTickInterval: 6 * 60 * 60 * 1000, // 6 hours
    majorTickInterval: 24 * 60 * 60 * 1000, // day
  },
  hours: {
    level: "hours",
    pixelsPerUnit: 40, // pixels per hour
    snapInterval: 15 * 60 * 1000, // snap to 15 minutes
    labelFormat: "HH:mm",
    minorTickInterval: 15 * 60 * 1000, // 15 minutes
    majorTickInterval: 60 * 60 * 1000, // hour
  },
  minutes: {
    level: "minutes",
    pixelsPerUnit: 8, // pixels per minute
    snapInterval: 5 * 60 * 1000, // snap to 5 minutes
    labelFormat: "HH:mm",
    minorTickInterval: 5 * 60 * 1000, // 5 minutes
    majorTickInterval: 15 * 60 * 1000, // 15 minutes
  },
};

/** Convert time to pixel position (RTL: higher time = more left) */
export function timeToPixel(
  time: number,
  viewStart: number,
  viewEnd: number,
  width: number
): number {
  const duration = viewEnd - viewStart;
  if (duration <= 0) return 0;
  // RTL: past (higher values relative to start) is on the right
  // So we invert: position from right
  const ratio = (time - viewStart) / duration;
  return width * (1 - ratio); // Invert for RTL
}

/** Convert pixel position to time (RTL) */
export function pixelToTime(
  pixel: number,
  viewStart: number,
  viewEnd: number,
  width: number
): number {
  if (width <= 0) return viewStart;
  const duration = viewEnd - viewStart;
  // RTL: left side = future, right side = past
  const ratio = 1 - pixel / width;
  return viewStart + ratio * duration;
}

/** Snap time to nearest interval */
export function snapTime(time: number, snapInterval: number): number {
  return Math.round(time / snapInterval) * snapInterval;
}

/** Get zoom level for a given duration */
export function getZoomLevelForDuration(durationMs: number): ZoomLevel {
  const DAY = 24 * 60 * 60 * 1000;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;

  if (durationMs > 3 * MONTH) return "months";
  if (durationMs > 2 * WEEK) return "weeks";
  if (durationMs > 3 * DAY) return "days";
  if (durationMs > 6 * 60 * 60 * 1000) return "hours";
  return "minutes";
}

/** Get next zoom level (zoom in) */
export function zoomIn(current: ZoomLevel): ZoomLevel {
  const index = ZOOM_LEVELS.indexOf(current);
  if (index < ZOOM_LEVELS.length - 1) {
    return ZOOM_LEVELS[index + 1];
  }
  return current;
}

/** Get previous zoom level (zoom out) */
export function zoomOut(current: ZoomLevel): ZoomLevel {
  const index = ZOOM_LEVELS.indexOf(current);
  if (index > 0) {
    return ZOOM_LEVELS[index - 1];
  }
  return current;
}

/** Format date based on zoom level */
export function formatDate(date: Date, zoomLevel: ZoomLevel): string {
  const pad = (n: number) => n.toString().padStart(2, "0");

  switch (zoomLevel) {
    case "months":
      return `${pad(date.getMonth() + 1)}/${(date.getFullYear() % 100).toString().padStart(2, "0")}`;
    case "weeks":
    case "days":
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
    case "hours":
    case "minutes":
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}

/** Generate tick marks for the timeline */
export function generateTicks(
  viewStart: number,
  viewEnd: number,
  zoomLevel: ZoomLevel
): { time: number; isMajor: boolean; label: string }[] {
  const config = ZOOM_CONFIGS[zoomLevel];
  const ticks: { time: number; isMajor: boolean; label: string }[] = [];

  // Align to nearest major tick
  const alignedStart = Math.floor(viewStart / config.majorTickInterval) * config.majorTickInterval;

  for (let time = alignedStart; time <= viewEnd; time += config.minorTickInterval) {
    if (time < viewStart) continue;

    const isMajor = time % config.majorTickInterval === 0;
    const date = new Date(time);

    ticks.push({
      time,
      isMajor,
      label: isMajor ? formatDate(date, zoomLevel) : "",
    });
  }

  return ticks;
}

/** Calculate row assignments for overlapping milestones */
export interface MilestonePosition {
  id: string;
  start: number;
  end: number;
  row: number;
}

export function calculateRowAssignments(
  milestones: { id: string; start: number; end: number }[]
): MilestonePosition[] {
  if (milestones.length === 0) return [];

  // Sort by start time
  const sorted = [...milestones].sort((a, b) => a.start - b.start);

  // Track end times for each row
  const rowEndTimes: number[] = [];
  const result: MilestonePosition[] = [];

  for (const milestone of sorted) {
    // Find the first row where this milestone fits
    let assignedRow = -1;
    for (let row = 0; row < rowEndTimes.length; row++) {
      if (rowEndTimes[row] <= milestone.start) {
        assignedRow = row;
        break;
      }
    }

    // If no existing row works, create a new one
    if (assignedRow === -1) {
      assignedRow = rowEndTimes.length;
      rowEndTimes.push(0);
    }

    // Update row end time
    rowEndTimes[assignedRow] = milestone.end;

    result.push({
      id: milestone.id,
      start: milestone.start,
      end: milestone.end,
      row: assignedRow,
    });
  }

  return result;
}

/** Color palette for milestones */
export const MILESTONE_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#14b8a6", // teal
];

/** Get color for a milestone based on its row */
export function getMilestoneColor(row: number): string {
  return MILESTONE_COLORS[row % MILESTONE_COLORS.length];
}
