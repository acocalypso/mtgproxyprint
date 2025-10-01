import fs from 'node:fs/promises';
import path from 'node:path';

export interface UsageStats {
  pdfGenerated: number;
  visits: number;
}

const DEFAULT_STATS: UsageStats = {
  pdfGenerated: 0,
  visits: 0
};

const DEFAULT_FILENAME = 'stats.json';

function resolveStatsPath(): string {
  const configured = process.env.STATS_DATA_PATH;
  if (configured && configured.trim()) {
    const absolute = path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
    return absolute;
  }

  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.cwd(), process.env.DATA_DIR)
    : path.resolve(process.cwd(), 'data');

  return path.join(dataDir, DEFAULT_FILENAME);
}

async function ensureDirectory(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

class StatsService {
  private readonly filePath: string;
  private data: UsageStats;
  private writePromise: Promise<void> | null = null;

  private constructor(filePath: string, data: UsageStats) {
    this.filePath = filePath;
    this.data = data;
  }

  static async create(): Promise<StatsService> {
    const filePath = resolveStatsPath();
    await ensureDirectory(filePath);

    let parsed: UsageStats | null = null;
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      parsed = JSON.parse(raw) as UsageStats;
    } catch (error: unknown) {
      // File missing or invalid JSON - fall back to defaults
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        console.warn('[stats] failed to read stats file, resetting to defaults', error);
      }
    }

    const data: UsageStats = {
      pdfGenerated: parsed?.pdfGenerated ?? DEFAULT_STATS.pdfGenerated,
      visits: parsed?.visits ?? DEFAULT_STATS.visits
    };

    const service = new StatsService(filePath, data);
    await service.persist();
    return service;
  }

  getStats(): UsageStats {
    return { ...this.data };
  }

  async recordVisit(): Promise<UsageStats> {
    this.data.visits += 1;
    await this.persist();
    return this.getStats();
  }

  async recordPdfGenerated(): Promise<UsageStats> {
    this.data.pdfGenerated += 1;
    await this.persist();
    return this.getStats();
  }

  private async persist(): Promise<void> {
    const serialized = JSON.stringify(this.data, null, 2);
    this.writePromise = (this.writePromise ?? Promise.resolve()).then(async () => {
      await fs.writeFile(this.filePath, serialized, 'utf8');
    });
    await this.writePromise;
  }
}

let servicePromise: Promise<StatsService> | null = null;

export function getStatsService(): Promise<StatsService> {
  if (!servicePromise) {
    servicePromise = StatsService.create();
  }
  return servicePromise;
}

export async function recordVisit(): Promise<UsageStats> {
  const service = await getStatsService();
  return service.recordVisit();
}

export async function recordPdfGenerated(): Promise<UsageStats> {
  const service = await getStatsService();
  return service.recordPdfGenerated();
}

export async function fetchStats(): Promise<UsageStats> {
  const service = await getStatsService();
  return service.getStats();
}

// Test utility to reset singleton state between test runs
export function __resetStatsServiceForTests(): void {
  servicePromise = null;
}
