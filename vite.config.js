import { defineConfig, loadEnv } from 'vite';

// In development, serve /api/* with the same handlers Vercel deploys, so `npm run dev` works
// without the Vercel CLI. In production Vercel runs api/*.js as serverless functions.
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\/+|\/+$/g, '');
        if (!/^[a-z-]+$/.test(name)) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`);
          await mod.default(req, res);
        } catch (e) {
          if (e.code === 'ERR_LOAD_URL' || /Failed to load/.test(e.message)) return next();
          next(e);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expose server-side secrets from .env.local to the dev API handlers only (never to client code).
  const env = loadEnv(mode, process.cwd(), '');
  for (const k of ['GROQ_API_KEY', 'GROQ_MODEL', 'GROQ_FALLBACK_MODEL', 'GROQ_SPEECH_MODEL', 'ALLOWED_ORIGINS']) {
    if (env[k] && !process.env[k]) process.env[k] = env[k];
  }
  return {
    plugins: [devApi()],
    build: { target: 'es2020' },
    test: { environment: 'node' },
  };
});
