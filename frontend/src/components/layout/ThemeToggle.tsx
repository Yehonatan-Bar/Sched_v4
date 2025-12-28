import { useTheme } from "../../contexts";
import { SunIcon, MoonIcon, MonitorIcon } from "../icons";
import type { ThemeMode } from "../../types/schema";
import styles from "./ThemeToggle.module.css";

const themeOptions: { mode: ThemeMode; label: string }[] = [
  { mode: "system", label: "מערכת" },
  { mode: "light", label: "בהיר" },
  { mode: "dark", label: "כהה" },
];

export function ThemeToggle() {
  const { themeMode, setThemeMode } = useTheme();

  function handleModeChange(mode: ThemeMode) {
    setThemeMode(mode);
  }

  return (
    <div className={styles.container}>
      <div className={styles.toggleGroup}>
        {themeOptions.map((option) => (
          <button
            key={option.mode}
            className={`${styles.option} ${themeMode === option.mode ? styles.active : ""}`}
            onClick={() => handleModeChange(option.mode)}
            title={option.label}
            aria-pressed={themeMode === option.mode}
          >
            {option.mode === "system" && <MonitorIcon size={16} />}
            {option.mode === "light" && <SunIcon size={16} />}
            {option.mode === "dark" && <MoonIcon size={16} />}
          </button>
        ))}
      </div>
    </div>
  );
}
