import type { ReactNode, MouseEventHandler } from "react";
import styles from "./FloatingActionButton.module.css";

interface FloatingActionButtonProps {
  /** Icon or content to display inside the button */
  children: ReactNode;
  /** Click handler */
  onClick: MouseEventHandler<HTMLButtonElement>;
  /** Accessible label for screen readers */
  ariaLabel: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Optional tooltip text */
  title?: string;
}

export function FloatingActionButton({
  children,
  onClick,
  ariaLabel,
  disabled = false,
  title,
}: FloatingActionButtonProps) {
  return (
    <button
      className={styles.fab}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
