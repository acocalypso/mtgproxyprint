import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from '../app';

const originalFetch = globalThis.fetch;

const collectionCard = {
  id: 'card-1',
  name: 'Lightning Bolt',
  lang: 'en',
  set: 'lea',
  collector_number: '150',
  layout: 'normal',
  image_status: 'highres_scan',
  highres_image: true,
  image_uris: {
    png: 'https://img.scryfall.io/card.png'
  }
};

vi.mock('puppeteer', () => {
  const buffer = Buffer.from('%PDF-1.4');
  const pdf = vi.fn(async () => buffer);
  const setContent = vi.fn(async () => undefined);
  const close = vi.fn(async () => undefined);
  const newPage = vi.fn(async () => ({ setContent, pdf, close }));
  const launch = vi.fn(async () => ({ newPage }));

  return {
    default: {
      launch
    }
  };
});

afterEach(() => {
  vi.clearAllMocks();
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});

describe('POST /api/resolve', () => {
  it('resolves cards using batch collection endpoint with fallback', async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/cards/collection')) {
        return new Response(JSON.stringify({ data: [collectionCard] }), { status: 200 });
      }
      if (url.includes('/cards/named')) {
        const namedCard = { ...collectionCard, id: 'card-named', name: 'Brainstorm', collector_number: '123', image_uris: { large: 'https://img.named' } };
        return new Response(JSON.stringify(namedCard), { status: 200 });
      }
      throw new Error(`Unexpected fetch call to ${url}`);
    });

    globalThis.fetch = fetchMock as typeof fetch;

    const app = createServer({ enableStatic: false });
    const response = await request(app)
      .post('/api/resolve')
      .send({ decklist: '1 Lightning Bolt (LEA) 150\n2 Brainstorm', lang: 'en' })
      .expect(200);

    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0].card.name).toBe('Lightning Bolt');
    expect(response.body.items[0].image).toBe('https://img.scryfall.io/card.png');
    expect(response.body.items[1].card.name).toBe('Brainstorm');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/cards/collection'), expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/cards/named'), expect.objectContaining({ method: 'GET' }));
  });

  it('returns 400 when decklist missing', async () => {
    const app = createServer({ enableStatic: false });
    await request(app).post('/api/resolve').send({ decklist: ' ' }).expect(400);
  });
});

describe('POST /api/pdf', () => {
  it('returns a PDF buffer when tiles are provided', async () => {
    const app = createServer({ enableStatic: false });
    const response = await request(app)
      .post('/api/pdf')
      .send({
        tiles: [
          { image: 'https://img.scryfall.io/card.png', qty: 1, label: 'Lightning Bolt' }
        ],
        paper: 'A4',
        gapMm: 2,
        cutMarks: true
      })
      .expect(200);

    expect(response.header['content-type']).toBe('application/pdf');
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('validates request payload', async () => {
    const app = createServer({ enableStatic: false });
    await request(app)
      .post('/api/pdf')
      .send({ tiles: [] })
      .expect(400);
  });
});
