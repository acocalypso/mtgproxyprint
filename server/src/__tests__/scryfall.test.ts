import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ScryfallClient,
  selectBestImage,
  type ScryfallCard,
  type CollectionLookup
} from '../scryfall';

const sampleCard: ScryfallCard = {
  id: '123',
  name: 'Sample Card',
  lang: 'en',
  set: 'abc',
  collector_number: '42',
  layout: 'normal',
  highres_image: true,
  image_status: 'highres_scan',
  image_uris: {
    png: 'https://img.png',
    large: 'https://img.large'
  }
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ScryfallClient.fetchCollection', () => {
  it('returns found cards and populates cache', async () => {
    const payload = JSON.stringify({ data: [sampleCard] });
    const fetchMock = vi.fn(async () => new Response(payload, { status: 200 }));
    const cache = new Map<string, ScryfallCard>();

    const client = new ScryfallClient({ fetchImpl: fetchMock });

    const lookups: CollectionLookup[] = [
      {
        index: 0,
        identifier: {
          set: 'ABC',
          collector_number: '42',
          lang: 'en'
        }
      }
    ];

    const result = await client.fetchCollection(lookups, cache);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.found.get(0)).toMatchObject({ id: '123' });
    expect(cache.size).toBe(1);
  });

  it('tracks not found identifiers', async () => {
    const payload = JSON.stringify({ data: [], not_found: [{ set: 'abc', collector_number: '999' }] });
    const fetchMock = vi.fn(async () => new Response(payload, { status: 200 }));
    const client = new ScryfallClient({ fetchImpl: fetchMock });

    const { notFound } = await client.fetchCollection([
      {
        index: 5,
        identifier: { set: 'abc', collector_number: '999' }
      }
    ]);

    expect(notFound).toEqual([5]);
  });

  it('skips network requests when cache already populated', async () => {
    const card = { ...sampleCard, collector_number: '007' };
    const cache = new Map<string, ScryfallCard>();
    const client = new ScryfallClient({ fetchImpl: vi.fn() });

    const lookups: CollectionLookup[] = [
      {
        index: 1,
        identifier: { set: 'abc', collector_number: '007', lang: 'en' }
      }
    ];

    cache.set('collection:abc:007:en', card);

    const result = await client.fetchCollection(lookups, cache);
    expect(result.found.get(1)).toEqual(card);
  });
});

describe('ScryfallClient.fetchNamed', () => {
  it('returns null on 404', async () => {
    const fetchMock = vi.fn(async () => new Response('Not found', { status: 404 }));
    const client = new ScryfallClient({ fetchImpl: fetchMock });

    const card = await client.fetchNamed({ name: 'Missing Card' });
    expect(card).toBeNull();
  });

  it('caches successful lookups', async () => {
    const payload = JSON.stringify(sampleCard);
    const fetchMock = vi.fn(async () => new Response(payload, { status: 200 }));
    const cache = new Map<string, ScryfallCard>();
    const client = new ScryfallClient({ fetchImpl: fetchMock });

    const card = await client.fetchNamed({ name: 'Sample Card' }, cache);
    expect(card).not.toBeNull();
    expect(cache.size).toBe(1);

    // second lookup should use cache, so fetch not called again
    await client.fetchNamed({ name: 'Sample Card' }, cache);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe('selectBestImage', () => {
  it('prefers PNG image', () => {
    const { image, highRes } = selectBestImage(sampleCard);
    expect(image).toBe(sampleCard.image_uris?.png);
    expect(highRes).toBe(true);
  });

  it('falls back to first card face', () => {
    const card: ScryfallCard = {
      id: 'dfc',
      name: 'Double Card',
      lang: 'en',
      set: 'set',
      collector_number: '1',
      card_faces: [
        {
          name: 'Front',
          image_uris: { large: 'https://front.large' }
        }
      ]
    };

    const { image } = selectBestImage(card);
    expect(image).toBe('https://front.large');
  });
});
