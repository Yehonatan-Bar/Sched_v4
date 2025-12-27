/**
 * TypeScript types matching the backend Pydantic schema.
 * Schema version: 1
 */

export const SCHEMA_VERSION = 1;

export type ThemeMode = "system" | "light" | "dark";

export type StatusType = "not_started" | "in_progress" | "stuck" | "done" | "waiting_for";

export type ScheduleMode = "range" | "point";

export interface AppSettings {
  timezone: string;
  date_format: string;
  rtl: boolean;
  theme: ThemeMode;
}

export interface LockedProjectInfo {
  locked_until_epoch_ms: number;
}

export interface UndoState {
  stack: unknown[];
  redo_stack: unknown[];
}

export interface UIState {
  project_order: string[];
  locked_projects_session: Record<string, LockedProjectInfo>;
  undo: UndoState;
}

export interface TimeRange {
  start_iso: string;
  end_iso: string;
  is_user_defined: boolean;
}

export interface Project {
  id: string;
  title: string;
  short_description: string;
  detailed_description: string;
  notebook: string;
  tags: string[];
  color: string;
  time_range: TimeRange;
  milestone_ids: string[];
}

export interface TaskStatus {
  type: StatusType;
  waiting_for: string | null;
}

export interface TaskScheduleRange {
  mode: "range";
  start_iso: string;
  end_iso: string;
}

export interface TaskSchedulePoint {
  mode: "point";
  point_iso: string;
}

export type TaskSchedule = TaskScheduleRange | TaskSchedulePoint;

export interface Task {
  id: string;
  project_id: string;
  parent_task_id: string | null;
  title: string;
  details: string;
  status: TaskStatus;
  priority: number;
  tags: string[];
  color: string;
  schedule: TaskSchedule;
  people: string[];
  notes: string;
  child_task_ids: string[];
}

export interface BackupInfo {
  id: string;
  created_at_iso: string;
  reason: string;
  file_path: string;
}

export interface AppState {
  schema_version: number;
  app: AppSettings;
  ui_state: UIState;
  projects: Record<string, Project>;
  tasks: Record<string, Task>;
  backups: BackupInfo[];
}

export interface SaveResponse {
  saved_at_iso: string;
  backup_id: string;
}

export interface RestoreResponse {
  restored_at_iso: string;
  backup_id: string;
}

export interface BackupListResponse {
  backups: BackupInfo[];
}

export interface HealthResponse {
  status: string;
  message: string;
}

export function createDefaultState(): AppState {
  return {
    schema_version: SCHEMA_VERSION,
    app: {
      timezone: "Asia/Jerusalem",
      date_format: "DD/MM/YY",
      rtl: true,
      theme: "system",
    },
    ui_state: {
      project_order: [],
      locked_projects_session: {},
      undo: { stack: [], redo_stack: [] },
    },
    projects: {},
    tasks: {},
    backups: [],
  };
}
