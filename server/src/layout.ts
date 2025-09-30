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
const CUT_MARK_LENGTH_MM = 3;
const PAGE_MARGIN_MM = 10;


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
    .map((pageCards, pageIndex) => createPageMarkup(pageCards, pageIndex, options.cutMarks, paperConfig))
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
        ${sanitizedGap > 0 ? `gap: var(--gap);` : ''}
        justify-content: center;
        align-content: center;
      }

      .tile {
        position: relative;
        width: var(--card-width);
        height: var(--card-height);
        page-break-inside: avoid;
        overflow: visible;
      }

      .tile img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        border-radius: 1mm;
      }

      .cut-mark {
        position: absolute;
        background: #000;
      }

      /* Small tick marks extending just outside the card edges */
      .cut-mark.horizontal {
        width: 2mm;
        height: var(--cut-mark-thickness);
        left: 50%;
        transform: translateX(-50%);
      }

      .cut-mark.vertical {
        width: var(--cut-mark-thickness);
        height: 2mm;
        top: 50%;
        transform: translateY(-50%);
      }

      /* Top edge mark - small tick extending upward */
      .cut-mark.top {
        top: -2mm;
      }

      /* Bottom edge mark - small tick extending downward */
      .cut-mark.bottom {
        bottom: -2mm;
      }

      /* Left edge mark - small tick extending leftward */
      .cut-mark.left {
        left: -2mm;
      }

      /* Right edge mark - small tick extending rightward */
      .cut-mark.right {
        right: -2mm;
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

function createPageMarkup(pageCards: Array<{ image: string; label?: string }>, pageIndex: number, cutMarks: boolean, paperConfig: PaperConfig): string {
  const tilesMarkup = pageCards
    .map((tile, index) => createTileMarkup(tile, pageIndex * paperConfig.maxCardsPerPage + index, cutMarks))
    .join('\n');

  return `<div class="page">
    <div class="grid">
      ${tilesMarkup}
    </div>
  </div>`;
}

function createTileMarkup(tile: { image: string; label?: string }, index: number, cutMarks: boolean): string {
  const cutMarkup = cutMarks
    ? `<span class="cut-mark horizontal top"></span>
       <span class="cut-mark horizontal bottom"></span>
       <span class="cut-mark vertical left"></span>
       <span class="cut-mark vertical right"></span>`
    : '';

  return `<div class="tile" data-index="${index}">
    <img src="${escapeAttribute(tile.image)}" alt="Card image" />
    ${cutMarkup}
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
