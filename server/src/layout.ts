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
  'Tabloid': { cardsPerRow: 4, cardsPerColumn: 5, maxCardsPerPage: 20 },
  'A4-4x2': { cardsPerRow: 4, cardsPerColumn: 2, maxCardsPerPage: 8 },
  'Letter-4x2': { cardsPerRow: 4, cardsPerColumn: 2, maxCardsPerPage: 8 }
};

const CARD_WIDTH_MM = 63;
const CARD_HEIGHT_MM = 88;
const CUT_MARK_THICKNESS_MM = 0.2;
const CUT_MARK_LENGTH_MM = 4;
const PAGE_MARGIN_MM = 10;


export interface Tile {
  image: string;
  qty: number;
  label?: string;
}

export interface LayoutOptions {
  paper: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Tabloid' | 'A4-4x2' | 'Letter-4x2';
  gapMm: number;
  cutMarks: boolean;
}

export function buildHtml(tiles: Tile[], options: LayoutOptions): string {
  const sanitizedGap = Number.isFinite(options.gapMm) ? Math.max(0, options.gapMm) : 0;
  const paper = options.paper;
  const paperConfig = PAPER_CONFIGS[paper] || PAPER_CONFIGS['A4'];
  const copies = expandTiles(tiles);

  // Calculate page size for custom formats
  let pageSizeCSS = `size: ${paper};`;
  if (paper === 'A4-4x2' || paper === 'Letter-4x2') {
    if (paper === 'A4-4x2') {
      // A4 landscape: 297mm x 210mm (landscape orientation)
      pageSizeCSS = `size: A4 landscape;`;
    } else if (paper === 'Letter-4x2') {
      // Letter landscape: 11in x 8.5in = 279.4mm x 215.9mm (landscape orientation)
      pageSizeCSS = `size: Letter landscape;`;
    }
  }

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
        ${pageSizeCSS}
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
        position: relative;
        page-break-after: always;
      }

      .page:last-child {
        page-break-after: avoid;
      }

      .layout-wrapper {
        position: relative;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;
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
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 100;
        overflow: visible;
      }

      .cut-marks-svg {
        position: relative;
        width: 100%;
        height: 100%;
        display: block;
      }

      .cut-line {
        stroke: rgba(0, 0, 0, 0.7);
        stroke-width: var(--cut-mark-thickness);
        stroke-linecap: square;
        vector-effect: non-scaling-stroke;
        shape-rendering: crispEdges;
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

interface GridDimensions {
  width: number;
  height: number;
}

function getGridDimensions(paperConfig: PaperConfig, gapMm: number): GridDimensions {
  const cols = paperConfig.cardsPerRow;
  const rows = paperConfig.cardsPerColumn;
  const width = cols * CARD_WIDTH_MM + (cols - 1) * gapMm;
  const height = rows * CARD_HEIGHT_MM + (rows - 1) * gapMm;
  return { width, height };
}

function createPageMarkup(pageCards: Array<{ image: string; label?: string }>, pageIndex: number, cutMarks: boolean, paperConfig: PaperConfig, gapMm: number): string {
  const tilesMarkup = pageCards
    .map((tile, index) => createTileMarkup(tile, pageIndex * paperConfig.maxCardsPerPage + index))
    .join('\n');

  const gridDimensions = getGridDimensions(paperConfig, gapMm);
  const wrapperWidth = gridDimensions.width + CUT_MARK_LENGTH_MM * 2;
  const wrapperHeight = gridDimensions.height + CUT_MARK_LENGTH_MM * 2;
  const wrapperStyle = `width: ${wrapperWidth}mm; height: ${wrapperHeight}mm; padding: ${CUT_MARK_LENGTH_MM}mm;`;

  const cutMarksMarkup = cutMarks ? createCutMarksOverlay(paperConfig, gapMm, gridDimensions) : '';

  return `<div class="page">
    <div class="layout-wrapper" style="${wrapperStyle}">
      <div class="grid">
        ${tilesMarkup}
      </div>
      ${cutMarksMarkup}
    </div>
  </div>`;
}

function createCutMarksOverlay(paperConfig: PaperConfig, gapMm: number, dimensions: GridDimensions): string {
  const rows = paperConfig.cardsPerColumn;
  const cols = paperConfig.cardsPerRow;
  const trimW = CARD_WIDTH_MM;
  const trimH = CARD_HEIGHT_MM;
  const gap = Math.max(0, gapMm);
  const extension = CUT_MARK_LENGTH_MM;

  const columnEdges = new Set<number>();
  const rowEdges = new Set<number>();

  for (let col = 0; col < cols; col++) {
    const baseX = col * (trimW + gap);
    columnEdges.add(baseX);
    columnEdges.add(baseX + trimW);
  }

  for (let row = 0; row < rows; row++) {
    const baseY = row * (trimH + gap);
    rowEdges.add(baseY);
    rowEdges.add(baseY + trimH);
  }

  const sortedColumnEdges = Array.from(columnEdges).sort((a, b) => a - b);
  const sortedRowEdges = Array.from(rowEdges).sort((a, b) => a - b);

  const gridW = dimensions.width;
  const gridH = dimensions.height;
  const overlayWidth = gridW + extension * 2;
  const overlayHeight = gridH + extension * 2;
  const offsetX = extension;
  const offsetY = extension;

  const lines: string[] = [];

  for (const x of sortedColumnEdges) {
    const positionX = offsetX + x;
    lines.push(`<line class="cut-line" x1="${positionX}" y1="0" x2="${positionX}" y2="${overlayHeight}" />`);
  }

  for (const y of sortedRowEdges) {
    const positionY = offsetY + y;
    lines.push(`<line class="cut-line" x1="0" y1="${positionY}" x2="${overlayWidth}" y2="${positionY}" />`);
  }

  return `<div class="cut-marks-container">
    <svg class="cut-marks-svg" width="100%" height="100%" viewBox="0 0 ${overlayWidth} ${overlayHeight}" xmlns="http://www.w3.org/2000/svg">
      ${lines.join('\n      ')}
    </svg>
  </div>`;
}

function createTileMarkup(tile: { image: string; label?: string }, index: number): string {
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
