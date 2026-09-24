import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';

const currentDir = typeof import.meta.dirname !== 'undefined' 
  ? import.meta.dirname 
  : path.dirname(fileURLToPath(import.meta.url));

/**
 * Local Windows Database Bridge Plugin
 * Provides /api/database/* endpoints to inspect, build, repair, and sync
 * the local SQLite database at C:\BJJ Academy\Database\bjj_master.db
 */
function localDatabaseBridgePlugin(): Plugin {
  const middlewareHandler = (req: any, res: any, next: any) => {
    if (!req.url?.startsWith('/api/database/')) {
      return next();
    }

    // Always set CORS headers for local database bridge endpoints
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = new URL(req.url, 'http://localhost');

    const readJsonBody = (request: any): Promise<any> => {
      return new Promise((resolve) => {
        if (request.body && typeof request.body === 'object') {
          return resolve(request.body);
        }
        let bodyStr = '';
        request.on('data', (chunk: any) => {
          bodyStr += chunk;
        });
        request.on('end', () => {
          try {
            resolve(JSON.parse(bodyStr || '{}'));
          } catch {
            resolve({});
          }
        });
        request.on('error', () => resolve({}));
      });
    };

    // 1. Health check & status of local file on disk
    if (url.pathname === '/api/database/status') {
      (async () => {
        try {
          const targetPath = url.searchParams.get('path') || undefined;
          const { inspectLocalDatabase } = await import('./src/server/localDbService.ts');
          const result = await inspectLocalDatabase(targetPath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message }));
        }
      })();
      return;
    }

    // 2. Build / Save / Synchronize database to code files
    if ((url.pathname === '/api/database/build-fix' || url.pathname === '/api/database/save') && (req.method === 'POST' || req.method === 'PUT')) {
      (async () => {
        try {
          const body = await readJsonBody(req);
          const targetPath = body.path || undefined;
          const { buildOrRepairLocalDatabase } = await import('./src/server/localDbService.ts');
          const result = await buildOrRepairLocalDatabase(targetPath, body.data || {});
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      })();
      return;
    }

    // 3. Read data from disk database back into web application
    if (url.pathname === '/api/database/read' && (req.method === 'POST' || req.method === 'GET')) {
      (async () => {
        try {
          const body = req.method === 'POST' ? await readJsonBody(req) : {};
          const targetPath = body.path || url.searchParams.get('path') || undefined;
          const { readLocalDatabase } = await import('./src/server/localDbService.ts');
          const result = await readLocalDatabase(targetPath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      })();
      return;
    }

    next();
  };

  return {
    name: 'local-database-bridge-plugin',
    configureServer(server) {
      server.middlewares.use(middlewareHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middlewareHandler);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), localDatabaseBridgePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(currentDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
