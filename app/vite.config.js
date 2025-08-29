var _a;
/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: (_a = process.env.VITE_BASE) !== null && _a !== void 0 ? _a : '/',
});
