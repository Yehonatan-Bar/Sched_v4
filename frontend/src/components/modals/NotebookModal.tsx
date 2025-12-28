import { useState, useEffect } from "react";
import type { Project } from "../../types/schema";
import { useApp } from "../../contexts";
import { Modal } from "../common";
import styles from "../common/Modal.module.css";

interface NotebookModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function NotebookModal({
  project,
  isOpen,
  onClose,
}: NotebookModalProps) {
  const { updateProject } = useApp();
  const [notebook, setNotebook] = useState(project.notebook);

  // Sync with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setNotebook(project.notebook);
    }
  }, [isOpen, project.notebook]);

  const handleSave = () => {
    updateProject(project.id, { notebook });
    onClose();
  };

  const hasChanges = notebook !== project.notebook;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`מחברת טיוטה - ${project.title}`}
      size="large"
      footer={
        <>
          <button className={styles.cancelButton} onClick={onClose}>
            ביטול
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            שמור
          </button>
        </>
      }
    >
      <div className={styles.field}>
        <label className={styles.label}>הערות, רעיונות וטיוטות</label>
        <textarea
          className={styles.textarea}
          value={notebook}
          onChange={(e) => setNotebook(e.target.value)}
          placeholder="רשום כאן הערות, רעיונות, וטיוטות לפרויקט..."
          style={{ minHeight: "350px" }}
        />
      </div>
    </Modal>
  );
}
