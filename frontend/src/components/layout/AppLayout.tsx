import type { ReactNode } from "react";
import { Header } from "./Header";
import { useApp } from "../../contexts";
import { LoaderIcon, AlertCircleIcon } from "../icons";
import styles from "./AppLayout.module.css";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { loadingState, error } = useApp();

  return (
    <div className={styles.layout}>
      <Header />

      <main className={styles.main}>
        {loadingState === "loading" && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingContent}>
              <LoaderIcon size={32} />
              <span>טוען...</span>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorBanner}>
            <AlertCircleIcon size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
