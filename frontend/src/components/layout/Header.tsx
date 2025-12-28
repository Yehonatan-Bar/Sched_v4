import { ThemeToggle } from "./ThemeToggle";
import { SaveIcon, RefreshIcon, UndoIcon, RedoIcon } from "../icons";
import { useApp } from "../../contexts";
import styles from "./Header.module.css";

export function Header() {
  const { hasUnsavedChanges, save, reload, loadingState, canUndo, canRedo, undo, redo } = useApp();

  async function handleSave() {
    try {
      await save();
    } catch {
      // Error is handled in context
    }
  }

  async function handleRefresh() {
    await reload();
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logoSection}>
          <h1 className={styles.title}>ניהול פרויקטים_v4</h1>
        </div>

        <div className={styles.actions}>
          {/* Undo/Redo buttons */}
          <button
            className={styles.actionButton}
            onClick={undo}
            disabled={!canUndo}
            title="בטל (Ctrl+Z)"
          >
            <UndoIcon size={18} />
          </button>

          <button
            className={styles.actionButton}
            onClick={redo}
            disabled={!canRedo}
            title="בצע שוב (Ctrl+Shift+Z)"
          >
            <RedoIcon size={18} />
          </button>

          <div className={styles.divider} />

          <button
            className={`${styles.actionButton} ${hasUnsavedChanges ? styles.hasChanges : ""}`}
            onClick={handleSave}
            disabled={!hasUnsavedChanges || loadingState === "loading"}
            title={hasUnsavedChanges ? "שמור שינויים" : "אין שינויים לשמירה"}
          >
            <SaveIcon size={18} />
            <span className={styles.buttonLabel}>שמור</span>
            {hasUnsavedChanges && <span className={styles.badge} />}
          </button>

          <button
            className={styles.actionButton}
            onClick={handleRefresh}
            disabled={loadingState === "loading"}
            title="רענן נתונים"
          >
            <RefreshIcon size={18} />
          </button>

          <div className={styles.divider} />

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
