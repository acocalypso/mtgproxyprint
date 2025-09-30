// Paper size configurations
interface PaperConfig {
  cardsPerRow: number;
  cardsPerColumn: number;
  maxCardsPerPage: number;
}

const PAPER_CONFIGS: Record<string, PaperConfig> = {
  'A4': { cardsPerRow: 3, cardsPerColumn: 3, maxCardsPerPage: 9 },
  'A3': { cardsPerRow: 4, cardsPerColumn: 6, maxCardsPerPage: 24 },
  'A5': { cardsPerRow: 2, cardsPerColumn: 2, maxCardsPerPage: 4 },
  'Letter': { cardsPerRow: 3, cardsPerColumn: 3, maxCardsPerPage: 9 },
  'Legal': { cardsPerRow: 3, cardsPerColumn: 4, maxCardsPerPage: 12 },
  'Tabloid': { cardsPerRow: 4, cardsPerColumn: 5, maxCardsPerPage: 20 }
};

const CARD_WIDTH_MM = 63;
const CARD_HEIGHT_MM = 88;
const CUT_MARK_THICKNESS_MM = 0.2;
const CUT_MARK_LENGTH_MM = 4;
const PAGE_MARGIN_MM = 10;
const BLEED_MM = 3;


export interface Tile {
  image: string;
  qty: number;
  label?: string;
}

export interface LayoutOptions {
  paper: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Tabloid';
  gapMm: number;
  cutMarks: boolean;
}

export function buildHtml(tiles: Tile[], options: LayoutOptions): string {
  const sanitizedGap = Number.isFinite(options.gapMm) ? Math.max(0, options.gapMm) : 0;
  const paper = options.paper;
  const paperConfig = PAPER_CONFIGS[paper] || PAPER_CONFIGS['A4'];
  const copies = expandTiles(tiles);

  // Group cards into pages based on paper size capacity
  const pages: Array<Array<{ image: string; label?: string }>> = [];
  for (let i = 0; i < copies.length; i += paperConfig.maxCardsPerPage) {
    pages.push(copies.slice(i, i + paperConfig.maxCardsPerPage));
  }

  const pagesMarkup = pages
    .map((pageCards, pageIndex) => createPageMarkup(pageCards, pageIndex, options.cutMarks, paperConfig, sanitizedGap))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>MTG Proxy Print</title>
    <style>
      :root {
        --card-width: ${CARD_WIDTH_MM}mm;
        --card-height: ${CARD_HEIGHT_MM}mm;
        --gap: ${sanitizedGap}mm;
        --cut-mark-thickness: ${CUT_MARK_THICKNESS_MM}mm;
        --cut-mark-length: ${CUT_MARK_LENGTH_MM}mm;
      }

      @page {
        size: ${paper};
        margin: ${PAGE_MARGIN_MM}mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #ffffff;
      }

      .page {
        width: 100%;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        page-break-after: always;
      }

      .page:last-child {
        page-break-after: avoid;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(${paperConfig.cardsPerRow}, var(--card-width));
        grid-template-rows: repeat(${paperConfig.cardsPerColumn}, var(--card-height));
        ${sanitizedGap > 0 ? `gap: var(--gap);` : `gap: 0; margin: 0; padding: 0;`}
        justify-content: center;
        align-content: center;
      }

      .tile {
        position: relative;
        width: var(--card-width);
        height: var(--card-height);
        page-break-inside: avoid;
        overflow: visible;
        margin: 0;
        padding: 0;
        border: none;
      }

      .tile img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        border-radius: 0;
        margin: 0;
        padding: 0;
      }

      .cut-marks-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .cut-marks-svg {
        position: relative;
      }

      .cut-mark-tick {
        stroke: #000;
        stroke-width: 0.75px;
        stroke-linecap: butt;
      }
    </style>
  </head>
  <body>
    ${pagesMarkup}
  </body>
</html>`;
}

function expandTiles(tiles: Tile[]): Array<{ image: string; label?: string }> {
  const expanded: Array<{ image: string; label?: string }> = [];
  for (const tile of tiles) {
    if (!tile?.image || typeof tile.image !== 'string') {
      continue;
    }
    const qty = Math.max(1, Math.floor(tile.qty ?? 1));
    for (let i = 0; i < qty; i += 1) {
      expanded.push({ image: tile.image, label: tile.label });
    }
  }
  return expanded;
}

function createPageMarkup(pageCards: Array<{ image: string; label?: string }>, pageIndex: number, cutMarks: boolean, paperConfig: PaperConfig, gapMm: number): string {
  const tilesMarkup = pageCards
    .map((tile, index) => createTileMarkup(tile, pageIndex * paperConfig.maxCardsPerPage + index, false))
    .join('\n');

  const cutMarksMarkup = cutMarks ? createCutMarksOverlay(paperConfig, gapMm) : '';

  return `<div class="page">
    <div class="grid">
      ${tilesMarkup}
    </div>
    ${cutMarksMarkup}
  </div>`;
}

function createCutMarksOverlay(paperConfig: PaperConfig, gapMm: number): string {
  const rows = paperConfig.cardsPerColumn;
  const cols = paperConfig.cardsPerRow;
  const trimW = CARD_WIDTH_MM;
  const trimH = CARD_HEIGHT_MM;
  const gap = Math.max(0, gapMm);
  const markLen = CUT_MARK_LENGTH_MM;
  
  // Calculate grid dimensions with actual gap
  const gridW = cols * trimW + (cols - 1) * gap;
  const gridH = rows * trimH + (rows - 1) * gap;
  
  let ticksMarkup = '';
  
  // Generate cut marks for each card - positioned exactly at card boundaries
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cardX = col * (trimW + gap);
      const cardY = row * (trimH + gap);
      
      // Card boundaries
      const left = cardX;
      const right = cardX + trimW;
      const top = cardY;
      const bottom = cardY + trimH;
      
      const centerX = cardX + trimW / 2;
      const centerY = cardY + trimH / 2;
      
      // Top edge mark - vertical line extending above the card
      ticksMarkup += `<line class="cut-mark-tick" x1="${centerX}" y1="${top - markLen}" x2="${centerX}" y2="${top}" />\n`;
      
      // Bottom edge mark - vertical line extending below the card
      ticksMarkup += `<line class="cut-mark-tick" x1="${centerX}" y1="${bottom}" x2="${centerX}" y2="${bottom + markLen}" />\n`;
      
      // Left edge mark - horizontal line extending left of the card
      ticksMarkup += `<line class="cut-mark-tick" x1="${left - markLen}" y1="${centerY}" x2="${left}" y2="${centerY}" />\n`;
      
      // Right edge mark - horizontal line extending right of the card
      ticksMarkup += `<line class="cut-mark-tick" x1="${right}" y1="${centerY}" x2="${right + markLen}" y2="${centerY}" />\n`;
    }
  }
  
  return `<div class="cut-marks-container">
    <svg class="cut-marks-svg" width="${gridW + markLen * 2}mm" height="${gridH + markLen * 2}mm" viewBox="${-markLen} ${-markLen} ${gridW + markLen * 2} ${gridH + markLen * 2}" xmlns="http://www.w3.org/2000/svg">
      ${ticksMarkup}
    </svg>
  </div>`;
}

function createTileMarkup(tile: { image: string; label?: string }, index: number, cutMarks: boolean): string {
  return `<div class="tile" data-index="${index}">
    <img src="${escapeAttribute(tile.image)}" alt="Card image" />
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
