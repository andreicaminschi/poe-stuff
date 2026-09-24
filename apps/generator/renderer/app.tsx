import { useEffect } from "react";
import { BootScreen } from "./panels/boot-screen.tsx";
import { FloorEditor } from "./panels/floor-editor.tsx";
import { Ladder } from "./panels/ladder.tsx";
import { PaletteEditor } from "./panels/palette-editor.tsx";
import { Preview } from "./panels/preview.tsx";
import { SearchResults } from "./panels/search-results.tsx";
import { SimulateScreen } from "./panels/simulate-screen.tsx";
import { TopBar } from "./panels/top-bar.tsx";
import { WantedEditor } from "./panels/wanted-editor.tsx";
import { useSession } from "./session-store.ts";
import "./app.css";

export function App() {
  const boot = useSession((state) => state.boot);
  const booting = useSession((state) => state.booting);
  const screen = useSession((state) => state.screen);
  const error = useSession((state) => state.error);
  const status = useSession((state) => state.status);
  const query = useSession((state) => state.query);
  const dismissError = useSession((state) => state.dismissError);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (booting) return <BootScreen />;
  if (screen === "simulate") return <SimulateScreen />;

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
          <WantedEditor />
          <FloorEditor />
          <PaletteEditor />
        </div>
        {query.trim() === "" ? <Preview /> : <SearchResults />}
      </div>
    </div>
  );
}
