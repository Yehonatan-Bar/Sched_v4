import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { ThemeProvider, AppProvider, useApp } from "./contexts";
import { AppLayout, ProjectList, FloatingActionButton, PlusIcon, LoaderIcon } from "./components";
import "./index.css";

// Lazy load the ProjectPage for code splitting
const ProjectPage = lazy(() =>
  import("./components/project/ProjectPage").then((module) => ({
    default: module.ProjectPage,
  }))
);

function DashboardContent() {
  const { createProject } = useApp();
  const navigate = useNavigate();

  function handleCreateProject() {
    createProject();
  }

  function handleNavigateToProject(projectId: string) {
    navigate(`/project/${projectId}`);
  }

  return (
    <>
      <ProjectList onNavigateToProject={handleNavigateToProject} />
      <FloatingActionButton
        onClick={handleCreateProject}
        ariaLabel="צור פרויקט חדש"
        title="צור פרויקט חדש"
      >
        <PlusIcon size={28} />
      </FloatingActionButton>
    </>
  );
}

function AppContent() {
  const { undo, redo, canUndo, canRedo } = useApp();

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl (or Cmd on Mac) is pressed
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === "z") {
        if (e.shiftKey) {
          // Ctrl+Shift+Z = Redo
          e.preventDefault();
          if (canRedo) {
            redo();
          }
        } else {
          // Ctrl+Z = Undo
          e.preventDefault();
          if (canUndo) {
            undo();
          }
        }
      } else if (isCtrl && e.key === "y") {
        // Ctrl+Y = Redo (alternative)
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return (
    <AppLayout>
      <Suspense
        fallback={
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
            <LoaderIcon size={32} />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<DashboardContent />} />
          <Route path="/project/:projectId" element={<ProjectPage />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
