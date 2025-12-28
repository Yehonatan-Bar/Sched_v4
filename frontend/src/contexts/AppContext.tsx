/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { AppState, Project, Task, BackupInfo, TaskSchedule } from "../types/schema";
import { createDefaultState } from "../types/schema";

type LoadingState = "idle" | "loading" | "loaded" | "error";

// Maximum number of undo states to keep
const MAX_UNDO_STATES = 50;

interface AppContextValue {
  /** The full application state */
  state: AppState | null;
  /** Loading state of the application */
  loadingState: LoadingState;
  /** Error message if any */
  error: string | null;
  /** List of backups */
  backups: BackupInfo[];
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Undo the last action */
  undo: () => void;
  /** Redo the last undone action */
  redo: () => void;
  /** Reload state from server */
  reload: () => Promise<void>;
  /** Save current state to server */
  save: () => Promise<void>;
  /** Create a new project */
  createProject: () => void;
  /** Update a project */
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  /** Delete a project */
  deleteProject: (projectId: string) => void;
  /** Reorder projects */
  reorderProjects: (projectIds: string[]) => void;
  /** Get projects in order */
  getOrderedProjects: () => Project[];
  /** Restore from backup */
  restoreBackup: (backupId: string) => Promise<void>;
  /** Create a new milestone (task) for a project */
  createMilestone: (projectId: string, schedule: TaskSchedule, title?: string) => string;
  /** Create a subtask under a parent task */
  createSubtask: (parentTaskId: string, schedule: TaskSchedule, title?: string) => string;
  /** Update a task */
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  /** Delete a task */
  deleteTask: (taskId: string) => void;
  /** Get milestones for a project */
  getProjectMilestones: (projectId: string) => Task[];
  /** Get subtasks for a task */
  getTaskSubtasks: (taskId: string) => Task[];
}

const AppContext = createContext<AppContextValue | null>(null);

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createNewProject(): Project {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 1);

  return {
    id: generateId("proj"),
    title: "פרויקט חדש",
    short_description: "",
    detailed_description: "",
    notebook: "",
    tags: [],
    color: "auto",
    time_range: {
      start_iso: now.toISOString(),
      end_iso: endDate.toISOString(),
      is_user_defined: false,
    },
    milestone_ids: [],
  };
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, setState] = useState<AppState | null>(null);
  const [originalState, setOriginalState] = useState<AppState | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<AppState[]>([]);
  const [redoStack, setRedoStack] = useState<AppState[]>([]);

  // Ref to track if we're doing an undo/redo operation (to skip pushing to undo stack)
  const isUndoRedoRef = useRef(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges =
    state !== null &&
    originalState !== null &&
    JSON.stringify(state) !== JSON.stringify(originalState);

  // Undo/Redo availability
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Helper to push current state to undo stack
  const pushToUndoStack = useCallback((currentState: AppState | null) => {
    if (isUndoRedoRef.current || !currentState) return;

    setUndoStack((prev) => {
      const newStack = [...prev, currentState];
      // Limit stack size
      if (newStack.length > MAX_UNDO_STATES) {
        return newStack.slice(-MAX_UNDO_STATES);
      }
      return newStack;
    });
    // Clear redo stack on new action
    setRedoStack([]);
  }, []);

  // Undo function
  const undo = useCallback(() => {
    if (undoStack.length === 0 || !state) return;

    isUndoRedoRef.current = true;

    // Push current state to redo stack
    setRedoStack((prev) => [...prev, state]);

    // Pop from undo stack
    const previousState = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setState(previousState);

    // Reset flag after state update
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [undoStack, state]);

  // Redo function
  const redo = useCallback(() => {
    if (redoStack.length === 0 || !state) return;

    isUndoRedoRef.current = true;

    // Push current state to undo stack
    setUndoStack((prev) => [...prev, state]);

    // Pop from redo stack
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setState(nextState);

    // Reset flag after state update
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [redoStack, state]);

  const reload = useCallback(async () => {
    setLoadingState("loading");
    setError(null);

    try {
      // Check health first
      await api.health();

      // Load state
      const appState = await api.getState();
      setState(appState);
      setOriginalState(appState);

      // Load backups
      const backupList = await api.getBackups();
      setBackups(backupList.backups);

      setLoadingState("loaded");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(`שגיאה בטעינה: ${message}`);
      setLoadingState("error");

      // Create default state if server is not available
      const defaultState = createDefaultState();
      setState(defaultState);
      setOriginalState(null);
    }
  }, []);

  const save = useCallback(async () => {
    if (!state) return;

    try {
      await api.saveState(state);
      setOriginalState(state);

      // Reload backups after save
      const backupList = await api.getBackups();
      setBackups(backupList.backups);

      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(`שגיאה בשמירה: ${message}`);
      throw e;
    }
  }, [state]);

  const createProject = useCallback(() => {
    setState((prev) => {
      if (!prev) {
        // Create new state if none exists
        const newState = createDefaultState();
        const project = createNewProject();
        newState.projects[project.id] = project;
        newState.ui_state.project_order = [project.id];
        return newState;
      }

      // Push to undo stack before modifying
      pushToUndoStack(prev);

      const project = createNewProject();
      return {
        ...prev,
        projects: {
          ...prev.projects,
          [project.id]: project,
        },
        ui_state: {
          ...prev.ui_state,
          project_order: [project.id, ...prev.ui_state.project_order],
        },
      };
    });
  }, [pushToUndoStack]);

  const updateProject = useCallback(
    (projectId: string, updates: Partial<Project>) => {
      setState((prev) => {
        if (!prev || !prev.projects[projectId]) return prev;

        // Push to undo stack before modifying
        pushToUndoStack(prev);

        return {
          ...prev,
          projects: {
            ...prev.projects,
            [projectId]: {
              ...prev.projects[projectId],
              ...updates,
            },
          },
        };
      });
    },
    [pushToUndoStack]
  );

  const deleteProject = useCallback((projectId: string) => {
    setState((prev) => {
      if (!prev || !prev.projects[projectId]) return prev;

      // Push to undo stack before modifying
      pushToUndoStack(prev);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [projectId]: _deleted, ...remainingProjects } = prev.projects;

      // Remove associated tasks
      const remainingTasks: typeof prev.tasks = {};
      for (const [taskId, task] of Object.entries(prev.tasks)) {
        if (task.project_id !== projectId) {
          remainingTasks[taskId] = task;
        }
      }

      return {
        ...prev,
        projects: remainingProjects,
        tasks: remainingTasks,
        ui_state: {
          ...prev.ui_state,
          project_order: prev.ui_state.project_order.filter(
            (id) => id !== projectId
          ),
        },
      };
    });
  }, [pushToUndoStack]);

  const reorderProjects = useCallback((projectIds: string[]) => {
    setState((prev) => {
      if (!prev) return prev;

      // Push to undo stack before modifying
      pushToUndoStack(prev);

      return {
        ...prev,
        ui_state: {
          ...prev.ui_state,
          project_order: projectIds,
        },
      };
    });
  }, [pushToUndoStack]);

  const getOrderedProjects = useCallback((): Project[] => {
    if (!state) return [];

    const orderedProjects: Project[] = [];
    const seenIds = new Set<string>();

    // First add projects in order
    for (const id of state.ui_state.project_order) {
      if (state.projects[id] && !seenIds.has(id)) {
        orderedProjects.push(state.projects[id]);
        seenIds.add(id);
      }
    }

    // Then add any projects not in the order (shouldn't happen normally)
    for (const project of Object.values(state.projects)) {
      if (!seenIds.has(project.id)) {
        orderedProjects.push(project);
      }
    }

    return orderedProjects;
  }, [state]);

  const restoreBackup = useCallback(async (backupId: string) => {
    try {
      await api.restoreBackup(backupId);
      // Reload state after restore
      const appState = await api.getState();
      setState(appState);
      setOriginalState(appState);

      // Reload backups
      const backupList = await api.getBackups();
      setBackups(backupList.backups);

      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(`שגיאה בשחזור: ${message}`);
      throw e;
    }
  }, []);

  const createMilestone = useCallback((projectId: string, schedule: TaskSchedule, title?: string): string => {
    const taskId = generateId("task");

    setState((prev) => {
      if (!prev || !prev.projects[projectId]) return prev;

      // Push to undo stack before modifying
      pushToUndoStack(prev);

      const newTask: Task = {
        id: taskId,
        project_id: projectId,
        parent_task_id: null,
        title: title || "משימה חדשה",
        details: "",
        status: { type: "not_started", waiting_for: null },
        priority: 1,
        tags: [],
        color: "auto",
        schedule,
        people: [],
        notes: "",
        child_task_ids: [],
      };

      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskId]: newTask,
        },
        projects: {
          ...prev.projects,
          [projectId]: {
            ...prev.projects[projectId],
            milestone_ids: [...prev.projects[projectId].milestone_ids, taskId],
          },
        },
      };
    });

    return taskId;
  }, [pushToUndoStack]);

  const createSubtask = useCallback((parentTaskId: string, schedule: TaskSchedule, title?: string): string => {
    const taskId = generateId("task");

    setState((prev) => {
      if (!prev || !prev.tasks[parentTaskId]) return prev;

      // Push to undo stack before modifying
      pushToUndoStack(prev);

      const parentTask = prev.tasks[parentTaskId];

      const newTask: Task = {
        id: taskId,
        project_id: parentTask.project_id,
        parent_task_id: parentTaskId,
        title: title || "תת־משימה חדשה",
        details: "",
        status: { type: "not_started", waiting_for: null },
        priority: 1,
        tags: [],
        color: "auto",
        schedule,
        people: [],
        notes: "",
        child_task_ids: [],
      };

      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskId]: newTask,
          [parentTaskId]: {
            ...parentTask,
            child_task_ids: [...parentTask.child_task_ids, taskId],
          },
        },
      };
    });

    return taskId;
  }, [pushToUndoStack]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setState((prev) => {
      if (!prev || !prev.tasks[taskId]) return prev;

      // Push to undo stack before modifying
      pushToUndoStack(prev);

      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskId]: {
            ...prev.tasks[taskId],
            ...updates,
          },
        },
      };
    });
  }, [pushToUndoStack]);

  const deleteTask = useCallback((taskId: string) => {
    setState((prev) => {
      if (!prev || !prev.tasks[taskId]) return prev;

      // Push to undo stack before modifying
      pushToUndoStack(prev);

      const task = prev.tasks[taskId];
      const projectId = task.project_id;

      // Remove task from tasks
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [taskId]: _deleted, ...remainingTasks } = prev.tasks;

      // Also delete all child tasks recursively
      const tasksToDelete = new Set<string>([taskId]);
      const findChildTasks = (id: string) => {
        const t = prev.tasks[id];
        if (t) {
          for (const childId of t.child_task_ids) {
            tasksToDelete.add(childId);
            findChildTasks(childId);
          }
        }
      };
      findChildTasks(taskId);

      const finalTasks: typeof prev.tasks = {};
      for (const [id, t] of Object.entries(remainingTasks)) {
        if (!tasksToDelete.has(id)) {
          finalTasks[id] = t;
        }
      }

      // Update project's milestone_ids
      const updatedProjects = { ...prev.projects };
      if (updatedProjects[projectId]) {
        updatedProjects[projectId] = {
          ...updatedProjects[projectId],
          milestone_ids: updatedProjects[projectId].milestone_ids.filter(
            (id) => id !== taskId
          ),
        };
      }

      // Update parent task's child_task_ids if this was a sub-task
      if (task.parent_task_id && finalTasks[task.parent_task_id]) {
        finalTasks[task.parent_task_id] = {
          ...finalTasks[task.parent_task_id],
          child_task_ids: finalTasks[task.parent_task_id].child_task_ids.filter(
            (id) => id !== taskId
          ),
        };
      }

      return {
        ...prev,
        tasks: finalTasks,
        projects: updatedProjects,
      };
    });
  }, [pushToUndoStack]);

  const getProjectMilestones = useCallback((projectId: string): Task[] => {
    if (!state || !state.projects[projectId]) return [];

    const project = state.projects[projectId];
    const milestones: Task[] = [];

    for (const taskId of project.milestone_ids) {
      const task = state.tasks[taskId];
      if (task && task.parent_task_id === null) {
        milestones.push(task);
      }
    }

    return milestones;
  }, [state]);

  const getTaskSubtasks = useCallback((taskId: string): Task[] => {
    if (!state || !state.tasks[taskId]) return [];

    const task = state.tasks[taskId];
    const subtasks: Task[] = [];

    for (const childId of task.child_task_ids) {
      const childTask = state.tasks[childId];
      if (childTask) {
        subtasks.push(childTask);
      }
    }

    return subtasks;
  }, [state]);

  // Load data on mount
  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <AppContext.Provider
      value={{
        state,
        loadingState,
        error,
        backups,
        hasUnsavedChanges,
        canUndo,
        canRedo,
        undo,
        redo,
        reload,
        save,
        createProject,
        updateProject,
        deleteProject,
        reorderProjects,
        getOrderedProjects,
        restoreBackup,
        createMilestone,
        createSubtask,
        updateTask,
        deleteTask,
        getProjectMilestones,
        getTaskSubtasks,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
