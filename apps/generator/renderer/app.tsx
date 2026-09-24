import { useEffect } from "react";
import { BootScreen } from "./panels/boot-screen.tsx";
import { Ladder } from "./panels/ladder.tsx";
import { PaletteEditor } from "./panels/palette-editor.tsx";
import { Preview } from "./panels/preview.tsx";
import { TopBar } from "./panels/top-bar.tsx";
import { useSession } from "./session-store.ts";
import "./app.css";

export function App() {
  const boot = useSession((state) => state.boot);
  const booting = useSession((state) => state.booting);
  const error = useSession((state) => state.error);
  const status = useSession((state) => state.status);
  const dismissError = useSession((state) => state.dismissError);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (booting) return <BootScreen />;

  return (
    <div className="app">
      <TopBar />
      {error === undefined ? null : (
        <div className="banner">
          <pre>{error}</pre>
          <button type="button" className="btn" onClick={dismissError} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {status === undefined ? null : <div className="banner quiet">{status}</div>}
      <div className="cols">
        <div className="side">
          <Ladder />
          <PaletteEditor />
        </div>
        <Preview />
      </div>
    </div>
  );
}
