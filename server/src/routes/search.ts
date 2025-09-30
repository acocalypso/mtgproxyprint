import { Router, type Request, type Response } from 'express';

interface SearchRequestBody {
  query: string;
  limit?: number;
}

interface SearchResult {
  id: string;
  name: string;
  set: string;
  collector_number: string;
  image: string;
  lang: string;
  fullCard?: any; // Complete card data for double-sided cards
  allPrintings?: any[]; // All available printings of this card
}

const router = Router();

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_PRINTINGS_PER_CARD = 60;
const SCRYFALL_TIMEOUT_MS = 12_000;
const SCRYFALL_HEADERS: HeadersInit = {
  'User-Agent': 'MTGProxyPrint/0.1 (+https://github.com/mtgproxyprint; contact: dev@mtgproxyprint.local)',
  Accept: 'application/json'
};

type CachedSearchEntry = {
  expiresAt: number;
  results: SearchResult[];
};

const searchCache = new Map<string, CachedSearchEntry>();
const inFlightSearches = new Map<string, Promise<SearchResult[]>>();

function buildCacheKey(query: string, limit: number): string {
  return `${query.trim().toLowerCase()}::${limit}`;
}

function trimExpired(cacheKey: string): void {
  const entry = searchCache.get(cacheKey);
  if (entry && entry.expiresAt <= Date.now()) {
    searchCache.delete(cacheKey);
  }
}

function simplifyCardPayload(card: any) {
  return {
    id: card.id,
    name: card.name,
    lang: card.lang,
    set: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    layout: card.layout,
    image_uris: card.image_uris ? {
      png: card.image_uris.png,
      normal: card.image_uris.normal
    } : undefined,
    card_faces: Array.isArray(card.card_faces)
      ? card.card_faces.map((face: any) => ({
          name: face.name,
          image_uris: face.image_uris ? {
            png: face.image_uris.png,
            normal: face.image_uris.normal
          } : undefined
        }))
      : undefined
  };
}

router.post('/search', async (req: Request, res: Response) => {
  const body = req.body as SearchRequestBody;
  
  if (!body?.query || typeof body.query !== 'string' || !body.query.trim()) {
    return res.status(400).json({ message: 'query is required' });
  }

  const query = body.query.trim();
  const limit = Math.min(body.limit || 10, 20); // Max 20 results

  try {
    const cacheKey = buildCacheKey(query, limit);
    trimExpired(cacheKey);

    const cached = searchCache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Proxy-Cache', 'hit');
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.json({ results: cached.results });
    }

    let inFlight = inFlightSearches.get(cacheKey);
    if (!inFlight) {
      inFlight = executeSearch(query, limit);
      inFlightSearches.set(cacheKey, inFlight);
    }

    let results: SearchResult[];
    try {
      results = await inFlight;
    } finally {
      inFlightSearches.delete(cacheKey);
    }

    searchCache.set(cacheKey, {
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
      results
    });
  res.setHeader('X-Proxy-Cache', 'miss');
  res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

export default router;

async function executeSearch(query: string, limit: number): Promise<SearchResult[]> {
  const searchStrategies = [
    `name:"${query}" game:paper`,        // Exact English name match first
    `"${query}" game:paper`,             // Quoted search in English
    `${query} lang:any`,                  // Search in all languages (for non-English names)
    `name:"${query}" lang:any`,          // Exact name in any language
    `${query} game:paper`                 // Fallback to general search
  ];

  let allResults: any[] = [];

  for (const searchQuery of searchStrategies) {
    const data = await fetchScryfallSearch(searchQuery);
    if (!data.length) {
      continue;
    }

    allResults = allResults.concat(data);

    if ((searchQuery.includes('name:"') || searchQuery.includes(`"${query}"`)) && data.length >= 5) {
      break;
    }
  }

  const uniqueCards = new Map<string, any>();
  const cardsByOracleId = new Map<string, any[]>();

  allResults.forEach(card => {
    if (!uniqueCards.has(card.id)) {
      uniqueCards.set(card.id, card);
    }

    const oracleId = card.oracle_id;
    if (!oracleId) {
      return;
    }

    if (!cardsByOracleId.has(oracleId)) {
      cardsByOracleId.set(oracleId, []);
    }
    const group = cardsByOracleId.get(oracleId)!;
    if (group.length < MAX_PRINTINGS_PER_CARD) {
      group.push(card);
    }
  });

  const limitedCards = Array.from(uniqueCards.values()).slice(0, limit);

  const results: SearchResult[] = limitedCards
    .map(card => {
      let displayName = card.name;

      if (card.printed_name && card.lang !== 'en') {
        const printedName = card.printed_name as string;
        if (printedName.toLowerCase().includes(query.toLowerCase())) {
          displayName = printedName;
        }
      }

      if (typeof displayName === 'string' && displayName.includes(' // ')) {
        const faces = displayName.split(' // ');
        displayName = faces[0];
      }

      const printingsSource = card.oracle_id ? cardsByOracleId.get(card.oracle_id) ?? [card] : [card];
      const seenPrintIds = new Set<string>();
      const trimmedPrintings: any[] = [];
      for (const printing of printingsSource) {
        if (!printing?.id || seenPrintIds.has(printing.id)) {
          continue;
        }
        seenPrintIds.add(printing.id);
        trimmedPrintings.push(simplifyCardPayload(printing));
        if (trimmedPrintings.length >= MAX_PRINTINGS_PER_CARD) {
          break;
        }
      }
      if (trimmedPrintings.length === 0) {
        trimmedPrintings.push(simplifyCardPayload(card));
      }

      return {
        id: card.id,
        name: displayName,
        set: card.set.toUpperCase(),
        collector_number: card.collector_number,
        image: card.image_uris?.png || card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.png || card.card_faces?.[0]?.image_uris?.normal || '',
        lang: card.lang,
        fullCard: simplifyCardPayload(card),
        allPrintings: trimmedPrintings
      };
    })
    .filter(result => result.image);

  return results;
}

async function fetchScryfallSearch(searchQuery: string): Promise<any[]> {
  const url = new URL('https://api.scryfall.com/cards/search');
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('unique', 'prints');
  url.searchParams.set('order', 'name');
  url.searchParams.set('page', '1');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRYFALL_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      headers: SCRYFALL_HEADERS,
      signal: controller.signal
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json() as { data?: any[] };
    return Array.isArray(payload.data) ? payload.data : [];
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn(`Scryfall search timeout for query: ${searchQuery}`);
    } else {
      console.warn(`Scryfall search failed for query: ${searchQuery}`, error);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}