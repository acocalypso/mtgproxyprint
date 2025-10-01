import pLimit from 'p-limit';
import { ScryfallClient, type ScryfallCard } from '../scryfall';
import { ScryfallDataStore } from '../scryfall-data';

const DEFAULT_REMOTE_CONCURRENCY = 4;

interface FindByNameOptions {
  lang?: string;
  set?: string;
}

export class ScryfallService {
  private readonly store: ScryfallDataStore;
  private readonly client: ScryfallClient;
  private readonly collectionCache = new Map<string, ScryfallCard>();
  private readonly namedCache = new Map<string, ScryfallCard>();
  private readonly searchCache = new Map<string, ScryfallCard | null>();
  private readonly remoteLimit = pLimit(DEFAULT_REMOTE_CONCURRENCY);
  private refreshTimer: NodeJS.Timeout | null = null;

  private constructor(store: ScryfallDataStore, client: ScryfallClient) {
    this.store = store;
    this.client = client;
    this.scheduleAutoRefresh();
  }

  static async create(): Promise<ScryfallService> {
    const store = await ScryfallDataStore.create({
      dataDir: process.env.SCRYFALL_DATA_DIR
    });
    const client = new ScryfallClient();
    return new ScryfallService(store, client);
  }

  async findByCollector(setCode: string, collectorNumber: string, lang?: string): Promise<ScryfallCard | null> {
    const local = this.store.findBySetAndCollector(setCode, collectorNumber, lang);
    if (local) {
      return local;
    }

    return this.remoteLimit(async () => {
      const card = await this.client.fetchByCollector(setCode, collectorNumber, lang, this.collectionCache);
      if (card) {
        this.store.indexRemoteCard(card);
      }
      return card;
    });
  }

  async findByName(name: string, options: FindByNameOptions = {}): Promise<ScryfallCard | null> {
    const normalizedLang = options.lang ? options.lang.toLowerCase() : undefined;
    const local = this.store.findByName(name, { lang: normalizedLang, set: options.set });
    if (local) {
      return local;
    }

    return this.remoteLimit(async () => {
      const cacheKey = `${name.toLowerCase()}::${normalizedLang ?? 'en'}::${options.set?.toLowerCase() ?? ''}`;
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey) ?? null;
      }

      let card = await this.client.fetchNamed({
        name,
        set: options.set,
        lang: normalizedLang
      }, this.namedCache);

      if (!card && normalizedLang) {
        const searchQuery = `"${name}"`;
        card = await this.client.fetchBySearch(searchQuery, normalizedLang, this.namedCache);
      }

      if (!card) {
        // Final fallback without language restriction
        card = await this.client.fetchNamed({ name, set: options.set }, this.namedCache);
      }

      if (card) {
        this.store.indexRemoteCard(card);
        this.searchCache.set(cacheKey, card);
      } else {
        this.searchCache.set(cacheKey, null);
      }

      return card ?? null;
    });
  }

  getPrintings(card: ScryfallCard): ScryfallCard[] {
    const printings = this.store.getPrintingsForOracleId(card.oracle_id);
    if (printings.length) {
      return printings;
    }
    return [card];
  }

  searchByName(query: string, limit: number, lang?: string): ScryfallCard[] {
    return this.store.searchByName(query, limit, lang);
  }

  toResolvedCard(card: ScryfallCard) {
    return this.client.toResolvedCard(card);
  }

  refreshIfStale(): Promise<boolean> {
    return this.store.refreshIfStale();
  }

  private scheduleAutoRefresh(): void {
    const intervalEnv = process.env.SCRYFALL_REFRESH_INTERVAL_MS;
    const parsedInterval = intervalEnv ? Number(intervalEnv) : Number.NaN;
    const intervalMs = Number.isFinite(parsedInterval) && parsedInterval > 0
      ? parsedInterval
      : 24 * 60 * 60 * 1000;

    this.refreshTimer = setInterval(() => {
      this.store
        .refreshIfStale()
        .then((refreshed) => {
          if (refreshed) {
            console.log('[scryfall] bulk data refreshed');
          }
        })
        .catch((error) => {
          console.error('[scryfall] bulk data refresh failed', error);
        });
    }, intervalMs);

    if (typeof this.refreshTimer.unref === 'function') {
      this.refreshTimer.unref();
    }
  }
}

let servicePromise: Promise<ScryfallService> | null = null;

export function getScryfallService(): Promise<ScryfallService> {
  if (!servicePromise) {
    servicePromise = ScryfallService.create();
  }
  return servicePromise;
}
