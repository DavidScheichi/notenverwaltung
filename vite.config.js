/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    // vite.config.js und vite.config.d.ts werden von `tsc -b` aus dieser Datei
    // generiert und mit committet (wie bei tailwind.config.ts) — nach jeder
    // Änderung hier `npm run build` laufen lassen, sonst laden Vite/Vitest die
    // veraltete .js-Datei statt dieser Quelle.
    test: {
        environment: "node",
    },
});
