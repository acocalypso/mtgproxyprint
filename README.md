# MTG Proxy Print

Generate print-ready PDF sheets of Magic: The Gathering cards from a pasted decklist. The app resolves cards through Scryfall, renders accurate 63×88 mm tiles with configurable gaps and cut marks, and produces a Chromium-backed PDF suitable for proxy printing.

## Features

- Paste MTG decklists using set/collector numbers or name-only entries.
- Batch resolve via Scryfall `cards/collection`, falling back to `cards/named` with language awareness.
- Detect double-faced layouts and prefer PNG artwork when available.
- Render precise 63 mm × 88 mm tiles in CSS mm units with optional 0.2 mm cut marks.
- Choose paper size (A4 or Letter), gap spacing, language code, and foil annotations.
- Server-side PDF generation through Puppeteer with attribution footer.
- Vue 3 preview grid mirroring the print layout, highlighting per-line errors or warnings.

## Prerequisites

- Node.js 18 or newer (fetch API required by the backend).
- npm 9+ (ships with Node.js 18).

For Windows users, the provided npm scripts are compatible with PowerShell via `cross-env`.

## Getting Started

Install workspace dependencies (frontend and server):

```powershell
npm install
```

Start the development environment (Express API + Vite dev server):

```powershell
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API requests to `http://localhost:3000`.

### Building for Production

```powershell
npm run build
npm run start
```

- `npm run build` compiles the Express server and bundles the Vue app into `frontend/dist`.
- `npm run start` launches the compiled server (port 3000) and serves the built frontend assets when present.

### Testing

Run the backend unit, integration, and PDF smoke tests:

```powershell
npm run test
```

The Vitest suite covers:

- Decklist parsing edge cases (set/collector, foil markers, invalid lines).
- Scryfall client batching, caching, and image selection logic (with mocked fetch).
- Express API routes (`/api/resolve`, `/api/pdf`) using mocked Scryfall responses and Puppeteer.

## API Overview

### `POST /api/resolve`

Input:

```json
{
  "decklist": "3 Lightning Bolt (LEA) 150\n2 Brainstorm",
  "lang": "en"
}
```

Output:

```json
{
  "items": [
    {
      "line": {
        "qty": 3,
        "name": "Lightning Bolt",
        "set": "LEA",
        "collector": "150"
      },
      "card": {
        "id": "...",
        "name": "Lightning Bolt",
        "lang": "en",
        "set": "lea",
        "collector_number": "150",
        "layout": "normal"
      },
      "image": "https://.../png",
      "highRes": true
    }
  ]
}
```

- Batch requests are attempted first for lines with set + collector numbers.
- Remaining lines fall back to the named endpoint.
- `error` highlights unresolved lines; `warning` indicates language mismatches.

### `POST /api/pdf`

Input:

```json
{
  "tiles": [
    { "image": "https://...", "qty": 3, "label": "Lightning Bolt" }
  ],
  "paper": "A4",
  "gapMm": 2,
  "cutMarks": true
}
```

The response is a binary PDF (`Content-Type: application/pdf`). Tiles are repeated according to `qty`, laid out with mm-based CSS grid sizing, and include optional cut marks and footer attribution.

## Development Notes

- All external HTTP calls set a descriptive User-Agent per Scryfall API guidelines and include lightweight throttling/backoff.
- In-memory caching per request avoids duplicate Scryfall lookups during resolve operations.
- The PDF route reuses a single Puppeteer browser instance and mocks are provided in tests to keep the suite lightweight.
- Styling uses CSS variables (mm units) without external frameworks to ensure print precision.

## Sample Decklist

Paste the example below into the app to see mixed resolution paths, double-faced handling, and foil annotations:

```
3 Al Bhed Salvagers (FIN) 88
1 Sephiroth, Planet's Heir (FIN) 553 *F*
2 Brainstorm
```

## Acknowledgements

Card data and imagery are provided by [Scryfall](https://scryfall.com/). Magic: The Gathering is © Wizards of the Coast.
