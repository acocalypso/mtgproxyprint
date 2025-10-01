import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { PassThrough, Readable, Transform, type TransformCallback } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import readline from 'node:readline';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import type { ScryfallCard, ScryfallCardFace, ScryfallImageUris } from './scryfall';

const BULK_ENDPOINT = 'https://api.scryfall.com/bulk-data/all-cards';
const SCHEMA_VERSION = 2;

interface BulkMetadata {
  id: string;
  updated_at: string;
  download_uri: string;
}

interface LocalMetadata {
  updatedAt: string;
  downloadedAt: string;
  schemaVersion: number;
}

export interface ScryfallDataStoreOptions {
  dataDir?: string;
}

interface StoredCard extends ScryfallCard {
  nameNormalized: string;
  printedNameNormalized?: string;
}

type LanguageMap = Map<string, StoredCard>;

type NameIndexEntry = {
  lang: string;
  card: StoredCard;
};

export class ScryfallDataStore {
  private readonly dataDir: string;
  private readonly indexFile: string;
  private readonly metaFile: string;

  private bySetCollector = new Map<string, LanguageMap>();
  private byOracleId = new Map<string, StoredCard[]>();
  private byName = new Map<string, NameIndexEntry[]>();
  private allCards: StoredCard[] = [];
  private refreshPromise: Promise<boolean> | null = null;

  private constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.indexFile = path.join(this.dataDir, 'cards.ndjson');
    this.metaFile = path.join(this.dataDir, 'metadata.json');
  }

  static async create(options: ScryfallDataStoreOptions = {}): Promise<ScryfallDataStore> {
    const configuredDir = options.dataDir ?? process.env.SCRYFALL_DATA_DIR;
    const dataDir = resolveDataDir(configuredDir);
    const store = new ScryfallDataStore(dataDir);
    await store.initialize();
    return store;
  }

  findBySetAndCollector(setCode: string, collectorNumber: string, lang?: string): ScryfallCard | undefined {
    const key = this.buildSetCollectorKey(setCode, collectorNumber);
    const langMap = this.bySetCollector.get(key);
    if (!langMap) {
      return undefined;
    }

    if (lang) {
      const match = langMap.get(lang.toLowerCase());
      if (match) {
        return cloneCard(match);
      }
    }

    const english = langMap.get('en');
    if (english) {
      return cloneCard(english);
    }

    const first = langMap.values().next();
    if (!first.done) {
      return cloneCard(first.value);
    }
    return undefined;
  }

  findByName(name: string, options: { lang?: string; set?: string } = {}): ScryfallCard | undefined {
    const normalizedName = normalizeName(name);
    const entries = this.byName.get(normalizedName);
    if (!entries?.length) {
      return undefined;
    }

    const preferredLang = options.lang ? options.lang.toLowerCase() : undefined;
    const preferredSet = options.set ? options.set.toLowerCase() : undefined;

    let best: StoredCard | undefined;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const entry of entries) {
      const card = entry.card;
      if (preferredSet && card.set.toLowerCase() !== preferredSet) {
        continue;
      }

      const score = computeNameScore(entry.lang, preferredLang, card.released_at);
      if (score < bestScore) {
        bestScore = score;
        best = card;
      }
    }

    if (!best) {
      // Fallback without set filtering if set prevented matches
      if (preferredSet) {
        return this.findByName(name, { lang: options.lang });
      }
      return undefined;
    }

    return cloneCard(best);
  }

  searchByName(query: string, limit: number, lang?: string): ScryfallCard[] {
    const normalizedQuery = normalizeName(query);
    const preferredLang = lang ? lang.toLowerCase() : undefined;
    const seen = new Set<string>();

    const scored = this.allCards
      .map((card) => {
        const score = computeSearchScore(card, normalizedQuery, preferredLang);
        return score === null ? null : { score, card };
      })
      .filter((entry): entry is { score: number; card: StoredCard } => Boolean(entry))
      .sort((a, b) => {
        if (a.score !== b.score) {
          return a.score - b.score;
        }
        const releaseA = a.card.released_at ? Date.parse(a.card.released_at) : 0;
        const releaseB = b.card.released_at ? Date.parse(b.card.released_at) : 0;
        return releaseB - releaseA;
      });

    const results: ScryfallCard[] = [];
    for (const entry of scored) {
      if (seen.has(entry.card.id)) {
        continue;
      }
      seen.add(entry.card.id);
      results.push(cloneCard(entry.card));
      if (results.length >= limit) {
        break;
      }
    }

    return results;
  }

  getPrintingsForOracleId(oracleId?: string): ScryfallCard[] {
    if (!oracleId) {
      return [];
    }
    const cards = this.byOracleId.get(oracleId.toLowerCase());
    if (!cards?.length) {
      return [];
    }
    return cards.map(cloneCard);
  }

  indexRemoteCard(card: ScryfallCard): void {
    const trimmed = trimCard(card);
    if (!trimmed) {
      return;
    }
    this.insertCard(trimmed);
  }

  private async initialize(): Promise<void> {
    await this.ensureFreshIndex();
  }

  async refreshIfStale(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          return await this.ensureFreshIndex();
        } finally {
          this.refreshPromise = null;
        }
      })();
    }

    return this.refreshPromise;
  }

  private async ensureFreshIndex(): Promise<boolean> {
    await fsp.mkdir(this.dataDir, { recursive: true });

    const remoteMeta = await fetchBulkMetadata();
    const localMeta = await this.readLocalMetadata();
    const indexExists = await fileExists(this.indexFile);

    const needsRefresh =
      !indexExists ||
      !localMeta ||
      localMeta.schemaVersion !== SCHEMA_VERSION ||
      localMeta.updatedAt !== remoteMeta.updated_at;

    if (needsRefresh) {
      await this.rebuildIndex(remoteMeta);
      const meta: LocalMetadata = {
        updatedAt: remoteMeta.updated_at,
        downloadedAt: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION
      };
      await fsp.writeFile(this.metaFile, JSON.stringify(meta, null, 2), 'utf8');
    }

    if (needsRefresh || !this.allCards.length) {
      await this.loadIndexFromDisk();
    }

    return needsRefresh;
  }

  private async rebuildIndex(metadata: BulkMetadata): Promise<void> {
    const response = await fetch(metadata.download_uri);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download Scryfall bulk data (${response.status})`);
    }

    const tempFile = path.join(this.dataDir, `cards-${Date.now()}.tmp`);
    const writer = fs.createWriteStream(tempFile, { encoding: 'utf8' });

    const transform = new Transform({
      objectMode: true,
      transform: (chunk: any, _encoding: BufferEncoding, callback: TransformCallback) => {
        const value = chunk?.value;
        const trimmed = trimCard(value);
        if (!trimmed) {
          callback();
          return;
        }
        const normalized = normalizeCard(trimmed);
        const payload = JSON.stringify(normalized) + '\n';
        if (!writer.write(payload)) {
          writer.once('drain', callback);
        } else {
          callback();
        }
      },
      final: (callback: TransformCallback) => {
        writer.end();
        writer.once('finish', () => callback());
        writer.once('error', (error) => callback(error as Error));
      }
    });

    const readable = Readable.fromWeb(response.body as any);
    const encoding = response.headers.get('content-encoding');
    const needsGunzip = (encoding && /gzip/i.test(encoding)) || metadata.download_uri.toLowerCase().endsWith('.gz');
    const decompressor = needsGunzip ? createGunzip() : new PassThrough();

    try {
      await pipeline(
        readable,
        decompressor,
        parser(),
        streamArray(),
        transform
      );
      await fsp.rename(tempFile, this.indexFile);
    } catch (error) {
      writer.destroy();
      await fsp.rm(tempFile, { force: true }).catch(() => {});
      throw error;
    }
  }

  private async loadIndexFromDisk(): Promise<void> {
    this.bySetCollector = new Map();
    this.byOracleId = new Map();
    this.byName = new Map();
    this.allCards = [];

    if (!(await fileExists(this.indexFile))) {
      return;
    }

    const stream = fs.createReadStream(this.indexFile, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      const parsed: StoredCard = JSON.parse(trimmed);
      this.insertCard(parsed);
    }

    // Ensure printings arrays are sorted newest-first once after load
    for (const [, cards] of this.byOracleId.entries()) {
      cards.sort((a, b) => {
        const releaseA = a.released_at ? Date.parse(a.released_at) : 0;
        const releaseB = b.released_at ? Date.parse(b.released_at) : 0;
        return releaseB - releaseA;
      });
    }
  }

  private insertCard(card: StoredCard): void {
    const setCollectorKey = this.buildSetCollectorKey(card.set, card.collector_number);
    const langMap = this.bySetCollector.get(setCollectorKey) ?? new Map();
    langMap.set(card.lang.toLowerCase(), card);
    this.bySetCollector.set(setCollectorKey, langMap);

    if (card.oracle_id) {
      const oracleKey = card.oracle_id.toLowerCase();
      const list = this.byOracleId.get(oracleKey) ?? [];
      list.push(card);
      this.byOracleId.set(oracleKey, list);
    }

    const nameEntries = this.byName.get(card.nameNormalized) ?? [];
    nameEntries.push({ lang: card.lang.toLowerCase(), card });
    this.byName.set(card.nameNormalized, nameEntries);

    this.allCards.push(card);
  }

  private async readLocalMetadata(): Promise<LocalMetadata | null> {
    if (!(await fileExists(this.metaFile))) {
      return null;
    }
    try {
      const data = await fsp.readFile(this.metaFile, 'utf8');
      return JSON.parse(data) as LocalMetadata;
    } catch {
      return null;
    }
  }

  private buildSetCollectorKey(setCode: string, collectorNumber: string): string {
    return `${setCode.toLowerCase()}::${collectorNumber.toLowerCase()}`;
  }
}

function resolveDataDir(preferred?: string): string {
  if (preferred && path.isAbsolute(preferred)) {
    return preferred;
  }

  if (preferred && preferred.trim()) {
    return path.resolve(process.cwd(), preferred);
  }

  return path.resolve(process.cwd(), 'data/scryfall');
}

function normalizeCard(card: StoredCard): StoredCard {
  return {
    ...card,
    nameNormalized: normalizeName(card.name),
    printedNameNormalized: card.printed_name ? normalizeName(card.printed_name) : undefined
  };
}

function trimCard(card: any): StoredCard | null {
  if (!card || typeof card !== 'object') {
    return null;
  }

  if (Array.isArray(card.games) && !card.games.includes('paper')) {
    return null; // Ignore non-paper printings
  }

  if (typeof card.layout === 'string') {
    const layout = card.layout.toLowerCase();
    if (layout.includes('token') || layout === 'emblem' || layout === 'planar' || layout === 'scheme') {
      return null;
    }
  }

  if (!card.id || !card.name || !card.set || !card.collector_number) {
    return null;
  }

  const image_uris = trimImageUris(card.image_uris);
  const faces = Array.isArray(card.card_faces)
    ? card.card_faces.map((face: ScryfallCardFace) => ({
        name: face?.name,
        image_uris: trimImageUris(face?.image_uris)
      }))
    : undefined;

  const stored: StoredCard = {
    id: String(card.id),
    oracle_id: card.oracle_id ? String(card.oracle_id) : undefined,
    name: String(card.name),
    printed_name: card.printed_name ? String(card.printed_name) : undefined,
    lang: card.lang ? String(card.lang) : 'en',
    set: String(card.set),
    collector_number: String(card.collector_number),
    layout: card.layout ? String(card.layout) : undefined,
    released_at: card.released_at ? String(card.released_at) : undefined,
    image_status: card.image_status ? String(card.image_status) : undefined,
    highres_image: Boolean(card.highres_image),
    games: Array.isArray(card.games) ? card.games.map((game: string) => String(game)) : undefined,
    image_uris,
    card_faces: faces,
    nameNormalized: normalizeName(String(card.name)),
    printedNameNormalized: card.printed_name ? normalizeName(String(card.printed_name)) : undefined
  };

  return stored;
}

function trimImageUris(uris?: ScryfallImageUris | null): ScryfallImageUris | undefined {
  if (!uris) {
    return undefined;
  }
  const trimmed: ScryfallImageUris = {};
  if (uris.png) trimmed.png = uris.png;
  if (uris.large) trimmed.large = uris.large;
  if (uris.normal) trimmed.normal = uris.normal;
  if (uris.art_crop) trimmed.art_crop = uris.art_crop;
  if (uris.border_crop) trimmed.border_crop = uris.border_crop;
  return Object.keys(trimmed).length ? trimmed : undefined;
}

function normalizeName(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function computeNameScore(entryLang: string, preferredLang?: string, releasedAt?: string): number {
  let score = 0;
  if (preferredLang) {
    score += entryLang === preferredLang ? 0 : 5;
  }
  if (releasedAt) {
    const releasedTime = Date.parse(releasedAt);
    score += Number.isFinite(releasedTime) ? -releasedTime / 1_000_000_000 : 0;
  }
  return score;
}

function computeSearchScore(card: StoredCard, query: string, preferredLang?: string): number | null {
  const normalized = card.nameNormalized;
  const printed = card.printedNameNormalized;

  if (!normalized.includes(query) && !(printed && printed.includes(query))) {
    return null;
  }

  let score = 0;
  if (normalized.startsWith(query)) {
    score += 0;
  } else if (printed && printed.startsWith(query)) {
    score += 0.5;
  } else {
    score += 1;
  }

  if (preferredLang) {
    score += card.lang.toLowerCase() === preferredLang ? 0 : 2;
  }

  return score;
}

function cloneCard(card: StoredCard): ScryfallCard {
  return {
    id: card.id,
    oracle_id: card.oracle_id,
    name: card.name,
    printed_name: card.printed_name,
    lang: card.lang,
    set: card.set,
    collector_number: card.collector_number,
    layout: card.layout,
    released_at: card.released_at,
    image_status: card.image_status,
    highres_image: card.highres_image,
    games: card.games ? [...card.games] : undefined,
    image_uris: card.image_uris ? { ...card.image_uris } : undefined,
    card_faces: card.card_faces
      ? card.card_faces.map((face) => ({
          name: face.name,
          image_uris: face.image_uris ? { ...face.image_uris } : undefined
        }))
      : undefined
  };
}

async function fetchBulkMetadata(): Promise<BulkMetadata> {
  const response = await fetch(BULK_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Failed to fetch Scryfall bulk metadata (${response.status})`);
  }
  const payload = (await response.json()) as BulkMetadata;
  if (!payload?.download_uri) {
    throw new Error('Scryfall bulk metadata response missing download URI.');
  }
  return payload;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
