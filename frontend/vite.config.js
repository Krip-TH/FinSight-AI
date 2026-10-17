import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {fileURLToPath} from 'node:url';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'FINSIGHT_');
  const backendPort = process.env.FINSIGHT_API_PORT || env.FINSIGHT_API_PORT || process.env.FINSIGHT_BACKEND_PORT || env.FINSIGHT_BACKEND_PORT || '8000';
  const marketPort = process.env.FINSIGHT_MARKET_PORT || env.FINSIGHT_MARKET_PORT || backendPort;
  return {
    plugins: [react(), tailwindcss()],
    server: {proxy: {
      '/api/market': `http://127.0.0.1:${marketPort}`,
      '/api': `http://127.0.0.1:${backendPort}`,
    }},
    build: {outDir: 'dist'},
  };
});
