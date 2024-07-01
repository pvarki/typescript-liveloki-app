import "./style.css";
import "material-design-lite/dist/material.indigo-pink.min.css";
import "material-design-lite/material";
import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
