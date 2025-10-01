# MTG Proxy Print

A modern, professional web application for generating high-quality print-ready PDF sheets of Magic: The Gathering proxy cards. Features a clean, minimalist design with glassmorphism effects and comprehensive paper size support for optimal printing results.

## ✨ Features

### 🎨 Modern UI/UX
- **Glassmorphism Design**: Clean, modern interface with transparent overlays and backdrop blur effects
- **Header Image Integration**: Full-width header background with transparent overlay
- **Responsive Layout**: Mobile-friendly design that works across all devices
- **Real-time Search**: Instant card search functionality with autocomplete
- **Visual Feedback**: Clear error highlighting and status indicators

### 🃏 Card Resolution & Processing
- **Flexible Input**: Paste MTG decklists using set/collector numbers or name-only entries
- **Smart Resolution**: Batch resolve via Scryfall API with intelligent fallback systems
- **All-Language Cache**: Preloads Scryfall's all-cards bulk dataset so every printing is available without first-request latency
- **Multi-language Support**: Language-aware card resolution with automatic detection
- **Double-faced Cards**: Automatic detection and proper handling of transform cards
- **High-quality Images**: Prefer PNG artwork when available for crisp printing

### 🖨️ Professional Printing
- **Multiple Paper Sizes**: Support for A4, A3, A5, Letter, Legal, and Tabloid formats
- **Precise Dimensions**: Accurate 63×88 mm card tiles matching official MTG card size
- **Professional Cut Marks**: Small tick marks positioned at card edges for precise cutting
- **Configurable Gaps**: Adjustable spacing between cards (0mm to 10mm) with true 0mm support
- **Print Optimization**: CSS mm units ensure accurate physical dimensions

### ⚡ Technical Excellence
- **Vue 3 + TypeScript**: Modern frontend with full type safety
- **Express Backend**: Robust Node.js server with comprehensive API
- **Puppeteer PDF Generation**: High-quality server-side PDF rendering
- **Smart Caching**: In-memory caching prevents duplicate API calls
- **Comprehensive Testing**: Full test suite with Vitest

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** (fetch API required)
- **npm 9+** (included with Node.js 18)
- **Docker** (optional, for containerized deployment)

### Quick Start

#### Option 1: Local Development

1. **Install dependencies:**
   ```powershell
   npm install
   ```

2. **Start development server:**
   ```powershell
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3000`

3. **Build for production:**
   ```powershell
   npm run build
   npm run start
   ```

#### Option 2: Docker (Recommended for Production)

1. **Production deployment:**
   ```powershell
   npm run docker:up
   ```
   - Application: `http://localhost`
   - API: `http://localhost/api` (backend not directly exposed)

2. **Development with Docker:**
   ```powershell
   npm run docker:dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3000` (for debugging only)

📖 **For complete Docker documentation, see [DOCKER.md](DOCKER.md)**

### 🧪 Testing

Run comprehensive test suite:
```powershell
npm run test
```

**Test Coverage:**
- Decklist parsing and validation
- Scryfall API integration and caching
- PDF generation with multiple paper sizes
- Cut mark positioning and spacing
- Error handling and edge cases

## 📋 API Reference

### Card Resolution: `POST /api/resolve`

**Input:**
```json
{
  "decklist": "3 Lightning Bolt (LEA) 150\n2 Brainstorm\n1 Jace, the Mind Sculptor *F*",
  "lang": "en"
}
```

**Output:**
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
        "id": "abc123",
        "name": "Lightning Bolt",
        "lang": "en",
        "set": "lea",
        "collector_number": "150",
        "layout": "normal"
      },
      "image": "https://cards.scryfall.io/png/front/...",
      "highRes": true
    }
  ]
}
```

**Features:**
- Batch processing for optimal performance
- Smart fallback from collection to named endpoints
- Language matching and warnings
- Foil marker detection (`*F*`)
- Error highlighting for unresolved cards

### PDF Generation: `POST /api/pdf`

**Input:**
```json
{
  "tiles": [
    { "image": "https://...", "qty": 3, "label": "Lightning Bolt" }
  ],
  "paper": "A4",
  "gapMm": 0,
  "cutMarks": true
}
```

**Paper Sizes Supported:**
- **A4**: 3×3 grid (9 cards per page)
- **A3**: 4×6 grid (24 cards per page)
- **A5**: 2×2 grid (4 cards per page)
- **Letter**: 3×3 grid (9 cards per page)
- **Legal**: 3×4 grid (12 cards per page)
- **Tabloid**: 4×5 grid (20 cards per page)

**Cut Mark Options:**
- Professional corner tick marks
- 2mm length, 0.2mm thickness
- Positioned at edge centers for precise cutting

## 🛠️ Development Notes

### Architecture
- **Frontend**: Vue 3 with Composition API and TypeScript
- **Backend**: Express.js server with TypeScript
- **PDF Engine**: Puppeteer for high-quality rendering
- **Styling**: CSS custom properties with glassmorphism effects
- **Testing**: Vitest with comprehensive coverage

### Performance Optimizations
- **Smart Caching**: In-memory card data caching per request
- **Batch Processing**: Scryfall API batch endpoints for efficiency
- **Single Browser Instance**: Puppeteer reuses browser for PDF generation
- **Throttling**: Respectful API rate limiting with backoff

### Print Quality Features
- **CSS mm Units**: Precise physical measurements
- **Professional Cut Marks**: Industry-standard positioning
- **Multiple Paper Formats**: Optimized layouts for each size
- **True Zero Gap**: Proper handling of 0mm spacing

## 🎯 Usage Examples

### Basic Decklist
```
4 Lightning Bolt
3 Counterspell
2 Jace, the Mind Sculptor
1 Black Lotus
```

### Advanced with Set Codes
```
4 Lightning Bolt (LEA) 150
3 Counterspell (ICE) 64
2 Jace, the Mind Sculptor (WWK) 31
1 Black Lotus (LEA) 232 *F*
```

### Mixed Format
```
3 Al Bhed Salvagers (FIN) 88
1 Sephiroth, Planet's Heir (FIN) 553 *F*
2 Brainstorm
4 Force of Will (ALL) 54a
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode
- `CACHE_TTL`: Card cache duration

### Print Settings
- **Gap Spacing**: 0-10mm between cards
- **Cut Marks**: Toggle professional cutting guides
- **Paper Size**: Choose from 6 standard sizes
- **Language**: Multi-language card support

## 📸 Screenshots

The application features:
- Clean, modern glassmorphism design
- Full-width header with Magic: The Gathering imagery
- Intuitive card search and selection
- Real-time decklist validation
- Professional PDF output with cut marks

## 🤝 Contributing

We build this project in the open at [github.com/acocalypso/mtgproxyprint](https://github.com/acocalypso/mtgproxyprint). It's fully open source, and we're actively looking for contributors who want to help improve card rendering, add new print workflows, or tackle outstanding issues. Check out the issue tracker or open a discussion to get started—we'd love to collaborate with you.

## 🙏 Acknowledgements

- **[Scryfall](https://scryfall.com/)**: Comprehensive MTG card database and high-quality imagery
- **Magic: The Gathering**: © Wizards of the Coast LLC
- **Vue.js**: Progressive JavaScript framework
- **Puppeteer**: Headless Chrome for PDF generation

## 📄 License

This project is open source. Magic: The Gathering and all related properties are trademarks of Wizards of the Coast LLC.

---

**Built with ❤️ for the Magic: The Gathering community**
