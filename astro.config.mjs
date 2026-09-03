import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.ragcooking.info',
  integrations: [react(), mdx()],
  devToolbar: { enabled: false },
  // proxy del cocinador IA en dev: /api/cook → worker de Cloudflare
  vite: {
    server: {
      proxy: {
        '/api/cook': {
          target: 'https://ragcooking-proxy.tu-subdominio.workers.dev',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/cook/, '/v1/chat/completions'),
        },
      },
    },
  },
});
