/**
 * API client for communicating with the backend.
 * Implements the Step 1 API endpoints.
 */

import type {
  AppState,
  SaveResponse,
  RestoreResponse,
  BackupListResponse,
  HealthResponse,
} from "../types/schema";

const API_BASE_URL = "http://localhost:8000/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText);
  }
  return response.json();
}

export const api = {
  /**
   * Check API health/availability
   */
  async health(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<HealthResponse>(response);
  },

  /**
   * Get the full application state
   */
  async getState(): Promise<AppState> {
    const response = await fetch(`${API_BASE_URL}/state`);
    return handleResponse<AppState>(response);
  },

  /**
   * Save full application state (creates backup automatically)
   * Implements "Last write wins" - simply sends the full state
   */
  async saveState(state: AppState): Promise<SaveResponse> {
    const response = await fetch(`${API_BASE_URL}/state`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(state),
    });
    return handleResponse<SaveResponse>(response);
  },

  /**
   * Get list of all backup snapshots
   */
  async getBackups(): Promise<BackupListResponse> {
    const response = await fetch(`${API_BASE_URL}/state/backups`);
    return handleResponse<BackupListResponse>(response);
  },

  /**
   * Restore state from a specific backup
   */
  async restoreBackup(backupId: string): Promise<RestoreResponse> {
    const response = await fetch(`${API_BASE_URL}/state/backups/${backupId}/restore`, {
      method: "POST",
    });
    return handleResponse<RestoreResponse>(response);
  },
};

export { ApiError };
