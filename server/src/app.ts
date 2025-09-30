import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import resolveRoute from './routes/resolve';
import pdfRoute from './routes/pdf';
import searchRoute from './routes/search';

export interface CreateServerOptions {
  enableStatic?: boolean;
}

export function createServer(options: CreateServerOptions = {}) {
  const enableStatic = options.enableStatic !== false;

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', resolveRoute);
  app.use('/api', pdfRoute);
  app.use('/api', searchRoute);

  let staticDir: string | null = null;
  if (enableStatic) {
    const candidate = path.resolve(__dirname, '../../frontend/dist');
    if (fs.existsSync(candidate)) {
      staticDir = candidate;
      app.use(express.static(staticDir));
    }
  }

  app.get('/healthz', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  if (staticDir) {
    // Catch-all route for SPA - must be last
    app.get(/.*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(staticDir!, 'index.html'));
    });
  }

  return app;
}
