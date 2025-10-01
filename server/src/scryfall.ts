const SCRYFALL_API_BASE = 'https://api.scryfall.com';
const COLLECTION_ENDPOINT = `${SCRYFALL_API_BASE}/cards/collection`;
const NAMED_ENDPOINT = `${SCRYFALL_API_BASE}/cards/named`;
const SEARCH_ENDPOINT = `${SCRYFALL_API_BASE}/cards/search`;
const COLLECTOR_ENDPOINT = `${SCRYFALL_API_BASE}/cards`;
const MAX_COLLECTION_BATCH = 75;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const DEFAULT_USER_AGENT = 'MTGProxyPrint/0.1 (+https://github.com/mtgproxyprint; contact: dev@mtgproxyprint.local)';
const DEFAULT_MIN_DELAY_MS = 80;

export interface ScryfallImageUris {
  png?: string;
  large?: string;
  normal?: string;
  art_crop?: string;
  border_crop?: string;
}

export interface ScryfallCardFace {
  name?: string;
  image_uris?: ScryfallImageUris;
}

export interface ScryfallCard {
  id: string;
  name: string;
  printed_name?: string;
  lang: string;
  set: string;
  collector_number: string;
  layout?: string;
  oracle_id?: string;
  released_at?: string;
  games?: string[];
  image_status?: string;
  highres_image?: boolean;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
}

export interface ResolvedCardSummary {
  card: {
    id: string;
    name: string;
    lang: string;
    set: string;
    collector_number: string;
    layout?: string;
  };
  image?: string;
  highRes: boolean;
  faces?: Array<{
    name: string;
    image?: string;
    highRes: boolean;
  }>;
}

export interface CollectionLookup {
  index: number;
  identifier: {
    set: string;
    collector_number: string;
    lang?: string;
  };
}

export interface CollectionResult {
  found: Map<number, ScryfallCard>;
  notFound: number[];
}

export interface NamedLookup {
  name: string;
  set?: string;
  lang?: string;
}

export interface ScryfallClientOptions {
  userAgent?: string;
  minDelayMs?: number;
  fetchImpl?: typeof globalThis.fetch;
}

type CacheStore = Map<string, ScryfallCard>;

export class ScryfallClient {
  private readonly userAgent: string;
  private readonly minDelayMs: number;
  private readonly fetchImpl: typeof globalThis.fetch;
  private lastRequestAt = 0;

  constructor(options: ScryfallClientOptions = {}) {
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.minDelayMs = options.minDelayMs ?? DEFAULT_MIN_DELAY_MS;
    const impl = options.fetchImpl ?? globalThis.fetch;
    if (!impl) {
      throw new Error('Global fetch implementation is not available. Provide fetchImpl to ScryfallClient.');
    }
    this.fetchImpl = ((input, init) => impl(input, init)) as typeof globalThis.fetch;
  }

  async fetchCollection(lookups: CollectionLookup[], cache?: CacheStore): Promise<CollectionResult> {
    const found = new Map<number, ScryfallCard>();
    const notFound: number[] = [];

    if (!lookups.length) {
      return { found, notFound };
    }

    const pending = lookups.filter(({ identifier, index }) => {
      const key = this.collectionCacheKey(identifier);
      const cached = cache?.get(key);
      if (cached) {
        found.set(index, cached);
        return false;
      }
      return true;
    });

    for (let offset = 0; offset < pending.length; offset += MAX_COLLECTION_BATCH) {
      const chunk = pending.slice(offset, offset + MAX_COLLECTION_BATCH);
      if (!chunk.length) {
        continue;
      }

      const requestBody = {
        identifiers: chunk.map(({ identifier }) => ({
          set: identifier.set.toLowerCase(),
          collector_number: identifier.collector_number,
          lang: identifier.lang ? identifier.lang.toLowerCase() : undefined,
          code: identifier.set.toLowerCase()
        }))
      };
      
      const response = await this.request(COLLECTION_ENDPOINT, {
        method: 'POST',
        headers: this.buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const details = await this.extractErrorMessage(response);
        throw new Error(`Scryfall collection request failed (${response.status}): ${details}`);
      }

      const payload = (await response.json()) as {
        data: ScryfallCard[];
        not_found?: Array<{ set?: string; code?: string; collector_number?: string; lang?: string; name?: string }>;
      };

      const notFoundSet = new Set<string>();
      if (payload.not_found) {
        for (const entry of payload.not_found) {
          const set = (entry.set ?? entry.code ?? '').toLowerCase();
          const collector = entry.collector_number ?? '';
          const lang = entry.lang ? entry.lang.toLowerCase() : undefined;
          notFoundSet.add(this.collectionCacheKey({ set, collector_number: collector, lang }));
        }
      }

      let dataIndex = 0;
      for (const target of chunk) {
        const identifierKey = this.collectionCacheKey(target.identifier);
        if (notFoundSet.has(identifierKey)) {
          notFound.push(target.index);
          continue;
        }

        const card = payload.data[dataIndex++];
        if (card) {
          found.set(target.index, card);
          cache?.set(identifierKey, card);
        } else {
          notFound.push(target.index);
        }
      }
    }

    return { found, notFound };
  }

  async fetchNamed(params: NamedLookup, cache?: CacheStore): Promise<ScryfallCard | null> {
    const normalized: NamedLookup = {
      name: params.name.trim(),
      set: params.set?.toLowerCase(),
      lang: params.lang?.toLowerCase()
    };

    const cacheKey = this.namedCacheKey(normalized);
    const cached = cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    const url = new URL(NAMED_ENDPOINT);
    url.searchParams.set('exact', normalized.name);
    url.searchParams.set('pretty', 'false');
    if (normalized.set) {
      url.searchParams.set('set', normalized.set);
    }
    if (normalized.lang) {
      url.searchParams.set('lang', normalized.lang);
    }
    
    const response = await this.request(url.toString(), {
      method: 'GET',
      headers: this.buildHeaders()
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const details = await this.extractErrorMessage(response);
      throw new Error(`Scryfall named lookup failed (${response.status}): ${details}`);
    }

    const card = (await response.json()) as ScryfallCard;
    cache?.set(cacheKey, card);
    return card;
  }

  async fetchBySearch(query: string, lang?: string, cache?: CacheStore): Promise<ScryfallCard | null> {
    const cacheKey = `search:${query}:${lang || 'en'}`;
    const cached = cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set('q', query);
    url.searchParams.set('unique', 'prints');
    if (lang) {
      url.searchParams.set('order', 'lang');
    }
    
    const response = await this.request(url.toString(), {
      method: 'GET',
      headers: this.buildHeaders()
    });

    if (response.status === 404 || !response.ok) {
      return null;
    }

    const result = await response.json() as { data: ScryfallCard[] };
    
    // Look for the card in the requested language first
    if (lang && result.data.length > 0) {
      const langCard = result.data.find(card => card.lang === lang.toLowerCase());
      if (langCard) {
        cache?.set(cacheKey, langCard);
        return langCard;
      }
    }
    
    // Fall back to first result if no language match
    const card = result.data[0] || null;
    if (card) {
      cache?.set(cacheKey, card);
    }
    return card;
  }

  async fetchByCollector(set: string, collectorNumber: string, lang?: string, cache?: CacheStore): Promise<ScryfallCard | null> {
    const cacheKey = `collector:${set}:${collectorNumber}:${lang || 'en'}`;
    const cached = cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    const url = lang ? 
      `${COLLECTOR_ENDPOINT}/${set.toLowerCase()}/${collectorNumber}/${lang.toLowerCase()}` :
      `${COLLECTOR_ENDPOINT}/${set.toLowerCase()}/${collectorNumber}`;
    
    const response = await this.request(url, {
      method: 'GET',
      headers: this.buildHeaders()
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const details = await this.extractErrorMessage(response);
      throw new Error(`Scryfall collector lookup failed (${response.status}): ${details}`);
    }

    const card = (await response.json()) as ScryfallCard;
    cache?.set(cacheKey, card);
    return card;
  }

  toResolvedCard(card: ScryfallCard): ResolvedCardSummary {
    const { image, highRes } = selectBestImage(card);
    
    // Check if this is a double-sided card - be more permissive with layout detection
    const isDoubleSided = card.card_faces && card.card_faces.length >= 2 && 
      (card.layout === 'transform' || 
       card.layout === 'modal_dfc' || 
       card.layout === 'double_faced_token' ||
       card.layout === 'reversible_card' ||
       // Some cards might not have the expected layout but still have faces
       card.card_faces.every(face => face.image_uris));
    
    let faces: Array<{ name: string; image?: string; highRes: boolean }> | undefined;
    
    if (isDoubleSided && card.card_faces) {
      faces = card.card_faces.map((face, index) => {
        const faceImage = selectBestImageFromUris(face.image_uris);
        const faceHighRes = Boolean(face.image_uris?.png || card.highres_image || card.image_status === 'highres_scan');
        
        return {
          name: face.name || `${card.name} (Face ${index + 1})`,
          image: faceImage,
          highRes: faceHighRes
        };
      });
      
      // Log for debugging
      console.log(`Double-sided card detected: ${card.name}, Layout: ${card.layout}, Faces: ${faces.length}`);
      faces.forEach((face, i) => {
        console.log(`  Face ${i + 1}: ${face.name}, has image: ${!!face.image}`);
      });
    }

    return {
      card: {
        id: card.id,
        name: card.name,
        lang: card.lang,
        set: card.set,
        collector_number: card.collector_number,
        layout: card.layout
      },
      image,
      highRes,
      faces
    };
  }

  private buildHeaders(extra?: Record<string, string>): HeadersInit {
    return {
      'User-Agent': this.userAgent,
      Accept: 'application/json',
      ...(extra ?? {})
    };
  }

  private async request(url: string, init: RequestInit, attempt = 0): Promise<Response> {
    await this.throttle();
    const response = await this.fetchImpl(url, init);

    if (RETRYABLE_STATUS.has(response.status) && attempt < 2) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : this.backoffDelay(attempt);
      await delay(delayMs);
      return this.request(url, init, attempt + 1);
    }

    return response;
  }

  private async throttle(): Promise<void> {
    if (!this.minDelayMs) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.minDelayMs) {
      await delay(this.minDelayMs - elapsed);
    }
    this.lastRequestAt = Date.now();
  }

  private backoffDelay(attempt: number): number {
    return Math.min(1000, 200 * 2 ** attempt);
  }

  private collectionCacheKey(identifier: { set: string; collector_number: string; lang?: string }): string {
    const set = identifier.set.toLowerCase();
    const collector = identifier.collector_number.toLowerCase();
    const lang = identifier.lang ? identifier.lang.toLowerCase() : 'en';
    return `collection:${set}:${collector}:${lang}`;
  }

  private namedCacheKey(params: NamedLookup): string {
    const setPart = params.set ? params.set.toLowerCase() : '';
    const langPart = params.lang ? params.lang.toLowerCase() : 'en';
    return `named:${params.name.toLowerCase()}|${setPart}|${langPart}`;
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    try {
      const json = await response.json();
      if (json && typeof json === 'object' && 'details' in json) {
        return String(json.details);
      }
    } catch {
      // ignore json parse errors
    }
    return response.statusText || 'Unknown error';
  }
}

export function selectBestImage(card: ScryfallCard): { image?: string; highRes: boolean } {
  const image = selectBestImageFromUris(card.image_uris);
  let highRes = Boolean(card.highres_image || card.image_status === 'highres_scan');

  if (!image && card.card_faces?.length) {
    const frontFace = card.card_faces[0];
    const frontImage = selectBestImageFromUris(frontFace.image_uris);
    highRes = highRes || Boolean(frontFace.image_uris?.png);
    return { image: frontImage, highRes };
  }

  return { image, highRes };
}

export function selectBestImageFromUris(uris?: ScryfallImageUris): string | undefined {
  if (!uris) return undefined;
  return uris.png ?? uris.large ?? uris.normal ?? uris.border_crop ?? uris.art_crop;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
