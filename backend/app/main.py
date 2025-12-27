"""
FastAPI application for the scheduling system.
Step 1 API: health, state CRUD, backups, restore.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    AppState,
    SaveResponse,
    RestoreResponse,
    BackupListResponse,
)
from .state_manager import state_manager

app = FastAPI(
    title="Scheduling App API",
    description="Personal project/task management with timeline",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Check API availability."""
    return {"status": "ok", "message": "API is running"}


@app.get("/api/state", response_model=AppState)
async def get_state():
    """Get the full application state."""
    return state_manager.load_state()


@app.put("/api/state", response_model=SaveResponse)
async def save_state(state: AppState):
    """
    Save full application state.
    Creates a backup snapshot automatically.
    Implements "Last write wins" - simply overwrites existing state.
    """
    saved_at_iso, backup_id = state_manager.save_state(state, create_backup=True)
    return SaveResponse(saved_at_iso=saved_at_iso, backup_id=backup_id or "")


@app.get("/api/state/backups", response_model=BackupListResponse)
async def get_backups():
    """Get list of all backup snapshots."""
    backups = state_manager.get_backups()
    return BackupListResponse(backups=backups)


@app.post("/api/state/backups/{backup_id}/restore", response_model=RestoreResponse)
async def restore_backup(backup_id: str):
    """
    Restore state from a specific backup.
    Creates a safety backup of current state before restoring.
    """
    try:
        restored_at_iso, _ = state_manager.restore_backup(backup_id)
        return RestoreResponse(restored_at_iso=restored_at_iso, backup_id=backup_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
