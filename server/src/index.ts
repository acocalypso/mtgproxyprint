import { createServer } from './app';
import { getScryfallService } from './services/scryfallService';

async function start() {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  try {
    await getScryfallService();
    console.log('[server] Scryfall cache ready');
  } catch (error) {
    console.error('[server] Failed to initialize Scryfall cache', error);
    process.exit(1);
  }

  const app = createServer();

  app.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`);
  });
}

void start();
