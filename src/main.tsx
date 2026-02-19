import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/theme.css";

const EditorShell = lazy(() => import("./editor/EditorShell"));
const PresenterShell = lazy(() => import("./presenter/PresenterShell"));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/editor/*" element={<EditorShell />} />
          <Route path="/presenter" element={<PresenterShell />} />
          <Route path="*" element={<Navigate to="/editor" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  </React.StrictMode>,
);
