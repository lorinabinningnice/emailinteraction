import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@nicecxone/lyra-ui/styles": path.resolve(__dirname, "../lyra-ui/src/styles/lyra-tokens.css"),
      "@nicecxone/lyra-ui/agents-data": path.resolve(__dirname, "../lyra-ui/src/components/__stories__/create-new-agents-data.ts"),
      "@nicecxone/lyra-ui/customers-data": path.resolve(__dirname, "../lyra-ui/src/components/__stories__/create-new-customers-data.ts"),
      "@nicecxone/lyra-ui": path.resolve(__dirname, "../lyra-ui/src/index.ts"),
    },
  },
});
