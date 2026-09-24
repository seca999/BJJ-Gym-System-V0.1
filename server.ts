import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { inspectLocalDatabase, buildOrRepairLocalDatabase, readLocalDatabase } from './src/server/localDbService';

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : typeof process !== 'undefined' && process.cwd
    ? process.cwd()
    : '.';

const app = express();
const PORT = process.env.PORT || 5555;

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

// Static file serving in production
const distPath = path.join(currentDir, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`BJJ Academy Local Server running on http://localhost:${PORT}`);
});
