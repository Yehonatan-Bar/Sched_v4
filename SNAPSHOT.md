# Project Snapshot

## Architecture
- **Backend**: FastAPI (Python 3.12)
- **Frontend**: React 19 + TypeScript + Vite
- **Storage**: JSON file with automatic backup snapshots
- **Pattern**: Local-first (client holds state, explicit save to server)
- **Styling**: CSS Modules with CSS Variables for theming
- **RTL**: Full RTL support (Hebrew UI, right-to-left layout)
- **Drag & Drop**: @dnd-kit (accessible, RTL-friendly, keyboard + touch support)
- **Routing**: react-router-dom with lazy loading for code splitting

## Modules/Components

### Backend (`/backend`)
- `app/schemas.py` - Pydantic models (AppState, Project, Task, Backup)
- `app/state_manager.py` - JSON persistence + backup snapshots
- `app/main.py` - FastAPI endpoints

### Frontend (`/frontend`)

#### Contexts (`/src/contexts`)
- `ThemeContext.tsx` - Light/dark theme with system detection + manual toggle
- `AppContext.tsx` - Global state management with Undo/Redo support

#### Components (`/src/components`)
- **Layout**: `AppLayout`, `Header`, `ThemeToggle`
- **Project**: `ProjectCard` (memoized), `ProjectList`, `SortableProjectCard`, `ProjectPage`
- **Timeline**: `Timeline`, `MilestoneEditor`, `SubtaskTimeline`
- **Modals**: `Modal`, `ProjectDescriptionModal`, `NotebookModal`, `TaskDetailsModal`
- **Common**: `FloatingActionButton`
- **Icons**: SVG icon components

#### Styles (`/src/styles`)
- `variables.css` - CSS custom properties
- `base.css` - Reset, typography, RTL utilities, animations

## Data Flow
1. Frontend loads state on mount via `GET /api/state`
2. User edits are tracked in client-side undo stack
3. Undo/Redo via Ctrl+Z / Ctrl+Shift+Z or header buttons
4. User clicks "Save" -> `PUT /api/state` sends full state
5. Backend saves JSON + creates timestamped backup

## External Dependencies
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` - Drag and drop
- `react-router-dom` - Client-side routing

## Configuration
- `backend/requirements.txt` - Python dependencies
- `frontend/package.json` - Node dependencies
- `frontend/vite.config.ts` - Vite build config

## Entry Points
- Backend: `cd backend && python run.py` (port 8001)
- Frontend: `cd frontend && npm run dev` (port 3000)

## Routes
- `/` - Dashboard with project list
- `/project/:projectId` - Project page with flat task list

## Current Status

### What Works (Stage 1-6 Complete)
- Full API: health, state CRUD, backups, restore
- RTL Hebrew UI throughout
- Light/dark theme with system detection + manual toggle
- Project list with depth effect (scaling/opacity based on position)
- Drag-and-drop reordering with @dnd-kit
- Sticky focus (lock) with sessionStorage persistence
- Project card: drag handle, central circle, inline edit, action icons
- Floating "+" button to create new projects with defaults
- Header with save button, undo/redo buttons
- **Undo/Redo system** (Ctrl+Z / Ctrl+Shift+Z, max 50 states)
- **Timeline component**:
  - RTL axis (right=past, left=future)
  - Zoom levels: months -> weeks -> days -> hours -> minutes
  - Milestone bars (range) with drag and resize
  - Milestone points with drag
  - Overlap detection with row allocation
  - "Today" marker
  - MilestoneEditor opens automatically after task creation
  - Double-click to edit existing milestones
- **Subtask drill-down**:
  - Expand/collapse button on milestones with children
  - Subtask list with selection (highlight/dim)
  - Mini timeline for selected subtask
  - Esc/click outside to close
  - Create subtasks via + button
- **Modals**:
  - Project description modal
  - Notebook modal
  - Task details modal (full task editing)
- **Project Page** (`/project/:projectId`):
  - Flat list of all tasks/subtasks (no timeline)
  - Click to edit any task via TaskDetailsModal
  - Back button to return to dashboard
  - Staggered entry animations
- **UI Validations**:
  - Real-time date validation (end before start)
  - Visual feedback with red border on invalid dates
  - Error messages shown immediately on form
- **Mobile Improvements**:
  - Larger touch targets (44px minimum)
  - Touch feedback with active states
  - Better resize handles for timeline milestones
  - Coarse pointer optimizations
- **Performance**:
  - Lazy loading for ProjectPage (code splitting)
  - React.memo on ProjectCard
  - useMemo for validation and computed data
- **Visual Polish**:
  - Page fade-in animations
  - Staggered list item animations
  - Button hover/active states
  - Smooth transitions throughout

### In Progress
- Nothing

### Known Issues
- None
