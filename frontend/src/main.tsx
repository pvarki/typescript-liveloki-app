import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
import "./style.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
