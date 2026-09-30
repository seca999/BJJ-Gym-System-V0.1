import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { inspectLocalDatabase, buildOrRepairLocalDatabase, readLocalDatabase } from './src/server/localDbService';
import { deployUpdateOnServer } from './src/server/updateService';

const app = express();
const PORT = process.env.PORT || 5555;

// Dynamically and reliably resolve the production dist folder
function resolveDistDirectory(): string {
  const cwd = process.cwd();
  // 1. If running as bundled dist/server.cjs, __dirname is already the dist folder containing index.html
  if (typeof __dirname !== 'undefined' && fs.existsSync(path.join(__dirname, 'index.html'))) {
    return __dirname;
  }
  // 2. If running from repository root, check cwd/dist
  if (fs.existsSync(path.join(cwd, 'dist', 'index.html'))) {
    return path.join(cwd, 'dist');
  }
  // 3. Check __dirname/dist (if running server.ts directly with tsx in root)
  if (typeof __dirname !== 'undefined' && fs.existsSync(path.join(__dirname, 'dist', 'index.html'))) {
    return path.join(__dirname, 'dist');
  }
  return path.join(cwd, 'dist');
}

const distPath = resolveDistDirectory();

// Enable CORS for local desktop & web access
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

// 1. Database status endpoint
app.get('/api/database/status', async (req, res) => {
  try {
    const targetPath = (req.query.path as string) || undefined;
    const result = await inspectLocalDatabase(targetPath);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Build, save or fix database endpoint
app.post(['/api/database/build-fix', '/api/database/save'], async (req, res) => {
  try {
    const targetPath = req.body.path || undefined;
    const result = await buildOrRepairLocalDatabase(targetPath, req.body.data || {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Read database endpoint
app.all('/api/database/read', async (req, res) => {
  try {
    const targetPath = req.body?.path || (req.query?.path as string) || undefined;
    const result = await readLocalDatabase(targetPath);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. System Live GitHub Update & Hot Deployment Endpoint
app.post('/api/system/deploy-update', async (req, res) => {
  try {
    const result = await deployUpdateOnServer(req.body || {});
    res.status(result.success ? 200 : 500).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Static file serving in production (with cache busting for index.html to avoid white screen freeze)
app.use(express.static(distPath, {
  maxAge: '1h',
  etag: true,
  index: false,
}));

app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    // Crucial: index.html must never be cached across updates to prevent chunk mismatch and white screens
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ravens BJJ Academy</title>
          <meta http-equiv="refresh" content="2">
        </head>
        <body style="background:#0c0a09;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:20px;max-width:400px;">
            <h2 style="margin:0 0 10px 0;font-size:18px;color:#f59e0b;">Ravens BJJ Academy System</h2>
            <p style="margin:0;font-size:13px;color:#a8a29e;">Application is compiling updated code... Page will reload automatically.</p>
          </div>
        </body>
      </html>
    `);
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`BJJ Academy Server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving static files from: ${distPath}`);
});
