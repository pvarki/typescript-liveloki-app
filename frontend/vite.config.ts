import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./", // Use relative paths
  plugins: [react()],
  server: {
    proxy: {
      // TODO: would probably be a good idea to have all of the
      //       backend routes under a common prefix, like /api/
      "/events": "http://localhost:3000",
      "/keywords": "http://localhost:3000",
    },
  },
});
