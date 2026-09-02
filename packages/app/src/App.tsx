import { CanvasPane } from "./components/CanvasPane.js";
import { DslEditor } from "./components/DslEditor.js";
import { StepTimeline } from "./components/StepTimeline.js";
import { Toolbar } from "./components/Toolbar.js";

export function App() {
  return (
    <div className="app-shell">
      <Toolbar />
      <div className="main-panels">
        <div className="panel-left">
          <DslEditor />
        </div>
        <div className="panel-divider" />
        <div className="panel-right">
          <CanvasPane />
        </div>
      </div>
      <StepTimeline />
    </div>
  );
}
