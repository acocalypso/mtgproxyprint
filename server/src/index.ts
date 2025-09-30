import { createServer } from './app';

const app = createServer();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
