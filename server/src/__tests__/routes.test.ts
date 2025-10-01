import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockService = {
  findByCollector: vi.fn(),
  findByName: vi.fn(),
  getPrintings: vi.fn(),
  toResolvedCard: vi.fn()
};

const getScryfallServiceMock = vi.fn(async () => mockService);

vi.mock('../services/scryfallService', () => ({
  getScryfallService: getScryfallServiceMock,
  ScryfallService: class {}
}));

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

beforeEach(() => {
  getScryfallServiceMock.mockClear();
  mockService.findByCollector.mockReset();
  mockService.findByName.mockReset();
  mockService.getPrintings.mockReset();
  mockService.toResolvedCard.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/resolve', () => {
  it('resolves cards using batch collection endpoint with fallback', async () => {
    const lightning = {
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

    const brainstorm = {
      id: 'card-2',
      name: 'Brainstorm',
      lang: 'en',
      set: 'ice',
      collector_number: '123',
      layout: 'normal',
      image_status: 'highres_scan',
      highres_image: false,
      image_uris: {
        png: 'https://img.scryfall.io/brainstorm.png'
      }
    };

    mockService.findByCollector.mockResolvedValueOnce(lightning);
    mockService.findByName.mockImplementation(async (name: string) => {
      if (name === 'Brainstorm') {
        return brainstorm as any;
      }
      return null;
    });
    mockService.getPrintings.mockImplementation((card: any) => [card]);
    mockService.toResolvedCard.mockImplementation((card: any) => ({
      card: {
        id: card.id,
        name: card.name,
        lang: card.lang,
        set: card.set,
        collector_number: card.collector_number,
        layout: card.layout
      },
      image: card.image_uris?.png,
      highRes: Boolean(card.highres_image || card.image_status === 'highres_scan')
    }));

    const { createServer } = await import('../app');
    const app = createServer({ enableStatic: false });
    const response = await request(app)
      .post('/api/resolve')
      .send({ decklist: '1 Lightning Bolt (LEA) 150\n2 Brainstorm', lang: 'en' })
      .expect(200);

    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0].card.name).toBe('Lightning Bolt');
    expect(response.body.items[0].image).toBe('https://img.scryfall.io/card.png');
    expect(response.body.items[1].card.name).toBe('Brainstorm');
    expect(mockService.findByCollector).toHaveBeenCalled();
    expect(mockService.findByName).toHaveBeenCalled();
  });

  it('resolves cards by set when collector number omitted', async () => {
    const anthroplasm = {
      id: 'card-anthro',
      name: 'Anthroplasm',
      lang: 'en',
      set: 'ulg',
      collector_number: '61',
      layout: 'normal',
      image_status: 'highres_scan',
      highres_image: true,
      image_uris: {
        png: 'https://img.scryfall.io/anthroplasm.png'
      }
    };

    mockService.findByName.mockImplementation(async (name: string, options?: any) => {
      if (name === 'Anthroplasm' && options?.set === 'ulg') {
        return anthroplasm as any;
      }
      return null;
    });
    mockService.getPrintings.mockReturnValue([anthroplasm]);
    mockService.toResolvedCard.mockReturnValue({
      card: {
        id: anthroplasm.id,
        name: anthroplasm.name,
        lang: anthroplasm.lang,
        set: anthroplasm.set,
        collector_number: anthroplasm.collector_number,
        layout: anthroplasm.layout
      },
      image: anthroplasm.image_uris.png,
      highRes: true
    });

    const { createServer } = await import('../app');
    const app = createServer({ enableStatic: false });
    const response = await request(app)
      .post('/api/resolve')
      .send({ decklist: '1 Anthroplasm (ulg)' })
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].card.name).toBe('Anthroplasm');
    expect(mockService.findByCollector).not.toHaveBeenCalled();
    expect(mockService.findByName).toHaveBeenCalledWith('Anthroplasm', expect.objectContaining({ set: 'ulg' }));
  });

  it('returns 400 when decklist missing', async () => {
    const { createServer } = await import('../app');
    const app = createServer({ enableStatic: false });
    await request(app).post('/api/resolve').send({ decklist: ' ' }).expect(400);
  });
});

describe('POST /api/pdf', () => {
  it('returns a PDF buffer when tiles are provided', async () => {
    const { createServer } = await import('../app');
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
    const { createServer } = await import('../app');
    const app = createServer({ enableStatic: false });
    await request(app)
      .post('/api/pdf')
      .send({ tiles: [] })
      .expect(400);
  });
});
