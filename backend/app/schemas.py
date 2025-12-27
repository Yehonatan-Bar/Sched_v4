"""
Pydantic schemas for the scheduling application.
Based on the normalized schema from the specification.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


SCHEMA_VERSION = 1


class ThemeMode(str, Enum):
    SYSTEM = "system"
    LIGHT = "light"
    DARK = "dark"


class StatusType(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    STUCK = "stuck"
    DONE = "done"
    WAITING_FOR = "waiting_for"


class ScheduleMode(str, Enum):
    RANGE = "range"
    POINT = "point"


class AppSettings(BaseModel):
    timezone: str = "Asia/Jerusalem"
    date_format: str = "DD/MM/YY"
    rtl: bool = True
    theme: ThemeMode = ThemeMode.SYSTEM


class LockedProjectInfo(BaseModel):
    locked_until_epoch_ms: int


class UndoState(BaseModel):
    stack: list = Field(default_factory=list)
    redo_stack: list = Field(default_factory=list)


class UIState(BaseModel):
    project_order: list[str] = Field(default_factory=list)
    locked_projects_session: dict[str, LockedProjectInfo] = Field(default_factory=dict)
    undo: UndoState = Field(default_factory=UndoState)


class TimeRange(BaseModel):
    start_iso: str
    end_iso: str
    is_user_defined: bool = False


class Project(BaseModel):
    id: str
    title: str = ""
    short_description: str = ""
    detailed_description: str = ""
    notebook: str = ""
    tags: list[str] = Field(default_factory=list)
    color: str = "auto"
    time_range: TimeRange
    milestone_ids: list[str] = Field(default_factory=list)


class TaskStatus(BaseModel):
    type: StatusType = StatusType.NOT_STARTED
    waiting_for: Optional[str] = None


class TaskScheduleRange(BaseModel):
    mode: ScheduleMode = ScheduleMode.RANGE
    start_iso: str
    end_iso: str


class TaskSchedulePoint(BaseModel):
    mode: ScheduleMode = ScheduleMode.POINT
    point_iso: str


class Task(BaseModel):
    id: str
    project_id: str
    parent_task_id: Optional[str] = None
    title: str = ""
    details: str = ""
    status: TaskStatus = Field(default_factory=TaskStatus)
    priority: int = 1
    tags: list[str] = Field(default_factory=list)
    color: str = "auto"
    schedule: TaskScheduleRange | TaskSchedulePoint
    people: list[str] = Field(default_factory=list)
    notes: str = ""
    child_task_ids: list[str] = Field(default_factory=list)


class BackupInfo(BaseModel):
    id: str
    created_at_iso: str
    reason: str = "manual_save"
    file_path: str


class AppState(BaseModel):
    schema_version: int = SCHEMA_VERSION
    app: AppSettings = Field(default_factory=AppSettings)
    ui_state: UIState = Field(default_factory=UIState)
    projects: dict[str, Project] = Field(default_factory=dict)
    tasks: dict[str, Task] = Field(default_factory=dict)
    backups: list[BackupInfo] = Field(default_factory=list)


class SaveResponse(BaseModel):
    saved_at_iso: str
    backup_id: str


class RestoreResponse(BaseModel):
    restored_at_iso: str
    backup_id: str


class BackupListResponse(BaseModel):
    backups: list[BackupInfo]
