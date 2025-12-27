import { useEffect, useState } from "react";
import { api } from "./api/client";
import type { AppState, BackupInfo } from "./types/schema";
import { createDefaultState } from "./types/schema";
import "./App.css";

function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [status, setStatus] = useState<string>("טוען...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const health = await api.health();
      setStatus(`שרת פעיל: ${health.message}`);

      const appState = await api.getState();
      setState(appState);

      const backupList = await api.getBackups();
      setBackups(backupList.backups);

      setError(null);
    } catch (e) {
      setError(`שגיאה בטעינה: ${e instanceof Error ? e.message : "Unknown error"}`);
      setStatus("לא מחובר לשרת");
    }
  }

  async function handleSave() {
    if (!state) return;
    try {
      const response = await api.saveState(state);
      setStatus(`נשמר בהצלחה: ${response.saved_at_iso}`);
      await loadData();
    } catch (e) {
      setError(`שגיאה בשמירה: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  async function handleCreateDefaultState() {
    const newState = createDefaultState();
    setState(newState);
    setStatus("נוצר state ברירת מחדל (לא נשמר)");
  }

  async function handleRestore(backupId: string) {
    try {
      const response = await api.restoreBackup(backupId);
      setStatus(`שוחזר בהצלחה: ${response.restored_at_iso}`);
      await loadData();
    } catch (e) {
      setError(`שגיאה בשחזור: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  return (
    <div dir="rtl" style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1>מערכת ניהול פרויקטים - שלב 1</h1>

      <div style={{ marginBottom: "20px", padding: "10px", background: "#f0f0f0", borderRadius: "8px" }}>
        <strong>סטטוס: </strong>{status}
        {error && <div style={{ color: "red", marginTop: "10px" }}>{error}</div>}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={loadData}>רענן נתונים</button>
        <button onClick={handleCreateDefaultState}>צור state חדש</button>
        <button onClick={handleSave} disabled={!state}>שמור</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <h2>State נוכחי</h2>
          <pre style={{
            background: "#1e1e1e",
            color: "#d4d4d4",
            padding: "15px",
            borderRadius: "8px",
            overflow: "auto",
            maxHeight: "400px",
            fontSize: "12px",
            direction: "ltr",
            textAlign: "left",
          }}>
            {state ? JSON.stringify(state, null, 2) : "אין נתונים"}
          </pre>
        </div>

        <div>
          <h2>גיבויים ({backups.length})</h2>
          {backups.length === 0 ? (
            <p>אין גיבויים</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {backups.map((backup) => (
                <li
                  key={backup.id}
                  style={{
                    padding: "10px",
                    marginBottom: "10px",
                    background: "#f5f5f5",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{backup.id}</strong>
                    <br />
                    <small>{backup.created_at_iso}</small>
                  </div>
                  <button onClick={() => handleRestore(backup.id)}>שחזר</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{ marginTop: "30px", padding: "20px", background: "#e8f5e9", borderRadius: "8px" }}>
        <h3>שלב 1 - בדיקות בסיס</h3>
        <ul>
          <li>✅ GET /api/health - בדיקת זמינות</li>
          <li>✅ GET /api/state - קבלת state מלא</li>
          <li>✅ PUT /api/state - שמירה + יצירת גיבוי</li>
          <li>✅ GET /api/state/backups - רשימת גיבויים</li>
          <li>✅ POST /api/state/backups/{"{id}"}/restore - שחזור מגיבוי</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
