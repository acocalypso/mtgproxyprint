import { Router, type Request, type Response } from 'express';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { buildHtml, type Tile, type LayoutOptions } from '../layout';

interface PdfRequestBody {
  tiles?: Array<{ image?: string; qty?: number; label?: string }>;
  paper?: string;
  gapMm?: number;
  cutMarks?: boolean;
}

const router = Router();

let browserPromise: Promise<Browser> | null = null;

router.post('/pdf', async (req: Request, res: Response) => {
  const body = req.body as PdfRequestBody | undefined;
  if (!body || !Array.isArray(body.tiles) || !body.tiles.length) {
    return res.status(400).json({ message: 'tiles array is required' });
  }

  const paperResolution = resolvePaper(body.paper);
  if (!paperResolution.valid) {
    return res.status(400).json({ message: 'paper must be one of: A4, A3, A5, Letter, Legal, Tabloid, A4-4x2, Letter-4x2' });
  }

  const tiles = normalizeTiles(body.tiles);
  if (!tiles.length) {
    return res.status(400).json({ message: 'tiles must contain at least one valid image entry' });
  }

  const options: LayoutOptions = {
    paper: paperResolution.paper,
    gapMm: typeof body.gapMm === 'number' ? body.gapMm : 0,
    cutMarks: Boolean(body.cutMarks)
  };

  const html = buildHtml(tiles, options);

  let page: Page | null = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: ['load', 'networkidle0'] });
    
    // Handle landscape paper formats
    const pdfOptions: any = {
      printBackground: true,
      preferCSSPageSize: true
    };
    
    if (options.paper === 'A4-4x2') {
      pdfOptions.format = 'A4';
      pdfOptions.landscape = true;
    } else if (options.paper === 'Letter-4x2') {
      pdfOptions.format = 'Letter';
      pdfOptions.landscape = true;
    } else {
      pdfOptions.format = options.paper;
    }
    
    const buffer = await page.pdf(pdfOptions);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length.toString());
    return res.send(buffer);
  } catch (error) {
    console.error('PDF generation failed', error);
    return res.status(500).json({ message: 'Failed to generate PDF' });
  } finally {
    if (page) {
      await page.close().catch(() => {
        // ignore closing errors
      });
    }
  }
});

function resolvePaper(paper?: string): { paper: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Tabloid' | 'A4-4x2' | 'Letter-4x2'; valid: boolean } {
  if (!paper || typeof paper !== 'string' || !paper.trim()) {
    return { paper: 'A4', valid: true };
  }
  const normalized = paper.trim().toLowerCase();
  switch (normalized) {
    case 'a4':
      return { paper: 'A4', valid: true };
    case 'a3':
      return { paper: 'A3', valid: true };
    case 'a5':
      return { paper: 'A5', valid: true };
    case 'letter':
      return { paper: 'Letter', valid: true };
    case 'legal':
      return { paper: 'Legal', valid: true };
    case 'tabloid':
      return { paper: 'Tabloid', valid: true };
    case 'a4-4x2':
      return { paper: 'A4-4x2', valid: true };
    case 'letter-4x2':
      return { paper: 'Letter-4x2', valid: true };
    default:
      return { paper: 'A4', valid: false };
  }
}

function normalizeTiles(rawTiles: PdfRequestBody['tiles']): Tile[] {
  if (!rawTiles) {
    return [];
  }

  const sanitized: Tile[] = [];
  for (const tile of rawTiles) {
    const image = typeof tile.image === 'string' ? tile.image.trim() : '';
    if (!image) {
      continue;
    }
    const qty = typeof tile.qty === 'number' && Number.isFinite(tile.qty) ? Math.max(1, Math.floor(tile.qty)) : 1;
    const label = typeof tile.label === 'string' ? tile.label : undefined;
    sanitized.push({ image, qty, label });
  }
  return sanitized;
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--font-render-hinting=none',
        '--no-default-browser-check',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--memory-pressure-off',
        '--max_old_space_size=4096'
      ],
      headless: true,
      timeout: 60000,
      protocolTimeout: 60000
    });
  }
  return browserPromise;
}

export default router;
