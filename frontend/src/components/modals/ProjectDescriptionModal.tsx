import { useState, useEffect } from "react";
import type { Project } from "../../types/schema";
import { useApp } from "../../contexts";
import { Modal } from "../common";
import styles from "../common/Modal.module.css";

interface ProjectDescriptionModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectDescriptionModal({
  project,
  isOpen,
  onClose,
}: ProjectDescriptionModalProps) {
  const { updateProject } = useApp();
  const [description, setDescription] = useState(project.detailed_description);

  // Sync with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setDescription(project.detailed_description);
    }
  }, [isOpen, project.detailed_description]);

  const handleSave = () => {
    updateProject(project.id, { detailed_description: description });
    onClose();
  };

  const hasChanges = description !== project.detailed_description;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`תיאור מפורט - ${project.title}`}
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
        <label className={styles.label}>תיאור מפורט של הפרויקט</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="כתוב כאן את התיאור המפורט של הפרויקט..."
          style={{ minHeight: "300px" }}
        />
      </div>
    </Modal>
  );
}
