import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { router } from "./router.tsx";
import { RouterProvider } from "react-router-dom";

const toastOptions = {
  style: {
    borderRadius: "10px",
    background: "#333",
    color: "#fff",
  },
} as const;

createRoot(document.querySelector("#root")!).render(
  <React.StrictMode>
    <Toaster toastOptions={toastOptions} />
    <RouterProvider router={router} />
  </React.StrictMode>,
);
