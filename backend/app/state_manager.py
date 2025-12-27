"""
State manager for JSON file persistence and backup snapshots.
Implements "Last write wins" conflict resolution.
"""

import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from .schemas import AppState, BackupInfo, SCHEMA_VERSION


class StateManager:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.state_file = self.data_dir / "state.json"
        self.backups_dir = self.data_dir / "backups"

        self._ensure_directories()

    def _ensure_directories(self) -> None:
        """Ensure data and backup directories exist."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.backups_dir.mkdir(parents=True, exist_ok=True)

    def _get_default_state(self) -> AppState:
        """Return a new default state."""
        return AppState(schema_version=SCHEMA_VERSION)

    def load_state(self) -> AppState:
        """
        Load state from JSON file.
        Returns default state if file doesn't exist.
        """
        if not self.state_file.exists():
            return self._get_default_state()

        try:
            with open(self.state_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return AppState.model_validate(data)
        except (json.JSONDecodeError, Exception) as e:
            print(f"Error loading state file: {e}")
            return self._get_default_state()

    def save_state(self, state: AppState, create_backup: bool = True) -> tuple[str, Optional[str]]:
        """
        Save state to JSON file and optionally create a backup.

        Args:
            state: The application state to save
            create_backup: Whether to create a backup snapshot

        Returns:
            Tuple of (saved_at_iso, backup_id or None)
        """
        now = datetime.now()
        saved_at_iso = now.isoformat()
        backup_id = None

        if create_backup:
            backup_id = self._create_backup(state, now)

        state_dict = state.model_dump(mode="json")

        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(state_dict, f, ensure_ascii=False, indent=2)

        return saved_at_iso, backup_id

    def _create_backup(self, state: AppState, timestamp: datetime) -> str:
        """
        Create a backup snapshot of the state.

        Args:
            state: The state to backup
            timestamp: The timestamp for the backup

        Returns:
            The backup ID
        """
        backup_id = f"bkp_{timestamp.strftime('%Y%m%d_%H%M%S')}"
        backup_filename = f"state_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"
        backup_path = self.backups_dir / backup_filename

        state_dict = state.model_dump(mode="json")

        backup_info = BackupInfo(
            id=backup_id,
            created_at_iso=timestamp.isoformat(),
            reason="manual_save",
            file_path=str(backup_path.relative_to(self.data_dir.parent))
        )

        if backup_info not in state.backups:
            state.backups.append(backup_info)
            state_dict = state.model_dump(mode="json")

        with open(backup_path, "w", encoding="utf-8") as f:
            json.dump(state_dict, f, ensure_ascii=False, indent=2)

        return backup_id

    def get_backups(self) -> list[BackupInfo]:
        """Get list of all available backups."""
        state = self.load_state()
        return state.backups

    def restore_backup(self, backup_id: str) -> tuple[str, AppState]:
        """
        Restore state from a backup.
        Creates a new backup before restoring (safety measure).

        Args:
            backup_id: The ID of the backup to restore

        Returns:
            Tuple of (restored_at_iso, restored_state)

        Raises:
            ValueError: If backup not found
        """
        current_state = self.load_state()

        backup_info = None
        for backup in current_state.backups:
            if backup.id == backup_id:
                backup_info = backup
                break

        if backup_info is None:
            raise ValueError(f"Backup not found: {backup_id}")

        backup_path = self.data_dir.parent / backup_info.file_path

        if not backup_path.exists():
            raise ValueError(f"Backup file not found: {backup_path}")

        now = datetime.now()
        self._create_backup(current_state, now)

        with open(backup_path, "r", encoding="utf-8") as f:
            backup_data = json.load(f)

        restored_state = AppState.model_validate(backup_data)

        restored_state.backups = current_state.backups

        self.save_state(restored_state, create_backup=False)

        return now.isoformat(), restored_state

    def backup_exists(self, backup_id: str) -> bool:
        """Check if a backup with the given ID exists."""
        backups = self.get_backups()
        return any(b.id == backup_id for b in backups)


state_manager = StateManager(data_dir="data")
