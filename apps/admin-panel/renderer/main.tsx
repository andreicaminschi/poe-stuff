import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import "./tokens.css";

const root = document.getElementById("root");

if (root === null) throw new Error("No #root in index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
