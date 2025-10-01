<template>
  <div class="app">
    <!-- Hero Section -->
    <header class="clean-hero">
      <div class="hero-background">
        <img
          src="./logo/header.jpg"
          alt="MTG Proxy Print"
          class="hero-background-image"
        >
        <div class="hero-overlay" />
      </div>
      
      <div class="hero-content">
        <div class="hero-info-box">
          <h1 class="hero-title">
            MTG Proxy Print
          </h1>
          <p class="hero-description">
            Create high-quality proxy cards for playtesting and casual games.<br>
            Paste your decklist, preview card images, and export print-ready PDFs.
          </p>
          
          <div class="hero-features">
            <span class="feature">⚡ Instant Preview</span>
            <span class="feature">🌍 Multi-Language</span>
            <span class="feature">📄 Print Ready</span>
          </div>
          
          <div class="hero-badges">
            <div class="hero-pill">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
                <path
                  d="M12 22V12"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M2 7L12 12L22 7"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
              <span><strong>Deckbuilder Friendly:</strong> Supports <a
                href="https://moxfield.com"
                target="_blank"
                rel="noopener"
              >Moxfield.com</a> exports and <a
                href="https://archidekt.com"
                target="_blank"
                rel="noopener"
              >Archidekt</a> “Export Deck → Text” output.</span>
            </div>
            <div class="hero-pill">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3ZM10.5 16.5L6 12L7.41 10.59L10.5 13.67L16.59 7.59L18 9L10.5 16.5Z"
                  fill="currentColor"
                />
              </svg>
              <span><strong>Powered by Scryfall:</strong> Card data and imagery provided by the <a
                href="https://scryfall.com/docs/api"
                target="_blank"
                rel="noopener"
              >Scryfall API</a>.</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- Quick Add Section -->
        <div class="search-section">
          <h2>Quick Add Cards</h2>
          <p class="section-description">
            Search and add individual cards to your collection
          </p>
          
          <div class="search-card">
            <div class="search-input-wrapper">
              <div class="search-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="8"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path
                    d="M21 21L16.65 16.65"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <input
                v-model="search.query"
                type="text"
                placeholder="Search for cards by name..."
                class="search-input"
                autocomplete="off"
                @input="handleSearchInput"
                @keydown.escape="clearSearch"
              >
              <button
                v-if="search.query"
                class="search-clear"
                type="button"
                aria-label="Clear search"
                @click="clearSearch"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>
            
            <div
              v-if="search.results.length > 0"
              class="search-results"
            >
              <div
                v-for="result in search.results"
                :key="`${result.id}-${result.set}-${result.collector_number}`"
                class="search-result"
                @click="addCardFromSearch(result)"
              >
                <img
                  :src="result.image"
                  :alt="result.name"
                  class="search-result-image"
                >
                <div class="search-result-info">
                  <div class="search-result-name">
                    {{ result.name }}
                  </div>
                  <div class="search-result-set">
                    {{ result.set }} #{{ result.collector_number }}
                  </div>
                </div>
                <button
                  class="search-result-add"
                  aria-label="Add card"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12 5V19M5 12H19"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
            
            <div
              v-if="search.loading"
              class="search-loading"
            >
              <div class="loading-spinner" />
              <span>Searching...</span>
            </div>
            
            <div
              v-if="search.error"
              class="search-error"
            >
              <div class="error-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path
                    d="M15 9L9 15M9 9L15 15"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <span>{{ search.error }}</span>
            </div>
            
            <div
              v-if="search.query && !search.loading && search.results.length === 0 && !search.error"
              class="search-no-results"
            >
              <div class="no-results-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="8"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path
                    d="M21 21L16.65 16.65"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <span>No cards found for "{{ search.query }}"</span>
              <p class="no-results-hint">
                Try a different spelling or card name
              </p>
            </div>
          </div>
        </div>

        <h2>Import Decklist</h2>
        <p class="section-description">
          Paste your complete decklist for bulk processing
        </p>
        
        <div class="content-grid">
          <!-- Decklist Input -->
          <div class="input-section">
            <div class="section-header">
              <h3>Decklist Format</h3>
              <div class="format-tags">
                <span class="tag tag-primary">Moxfield</span>
                <span class="tag">Archidekt Export Deck → Text</span>
                <span class="tag">MTG Arena</span>
                <span class="tag">Standard</span>
              </div>
            </div>
            
            <div class="input-area">
              <label
                for="decklist"
                class="input-label"
              >
                One card per line. Example: <code>3 Lightning Bolt (2XM) 123</code>
                <span class="input-subtext">Also supports Archidekt “Export Deck → Text” decklists.</span>
              </label>
              <textarea
                id="decklist"
                v-model="form.decklist"
                rows="12"
                spellcheck="false"
                placeholder="3 Al Bhed Salvagers (FIN) 88&#10;1 Sephiroth, Planet's Heir (FIN) 553 *F*&#10;2 Llanowar Elves&#10;4 Lightning Bolt"
                class="decklist-input"
              />
            </div>

            <div class="decklist-actions">
              <button
                type="button"
                class="btn btn-secondary decklist-clear-btn"
                :disabled="status.loadingResolve || !canClearDecklist"
                @click="handleClearDecklist"
              >
                🧹 Clear Decklist
              </button>
              <button 
                type="button" 
                :disabled="status.loadingResolve" 
                class="btn btn-secondary decklist-preview-btn"
                @click="handlePreview"
              >
                <span v-if="status.loadingResolve">Processing...</span>
                <span v-else>👁️ Preview Cards</span>
              </button>
            </div>
          </div>
          
          <!-- Settings -->
          <div class="settings-section">
            <h3>Print Settings</h3>
            <p class="settings-description">
              Configure your PDF output
            </p>
            
            <div class="settings-form">
              <div class="form-group">
                <label class="form-label">Paper Size</label>
                <select
                  v-model="form.paper"
                  class="form-select"
                >
                  <option value="A4">
                    A4 (210 × 297 mm)
                  </option>
                  <option value="A3">
                    A3 (297 × 420 mm)
                  </option>
                  <option value="A5">
                    A5 (148 × 210 mm)
                  </option>
                  <option value="Letter">
                    Letter (8.5 × 11 in)
                  </option>
                  <option value="Legal">
                    Legal (8.5 × 14 in)
                  </option>
                  <option value="Tabloid">
                    Tabloid (11 × 17 in)
                  </option>
                  <option value="A4-4x2">
                    A4 Landscape 4×2 (8 cards)
                  </option>
                  <option value="Letter-4x2">
                    Letter Landscape 4×2 (8 cards)
                  </option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Card Gap</label>
                <div class="input-group">
                  <input 
                    v-model.number="form.gapMm" 
                    type="number" 
                    min="0" 
                    step="0.1" 
                    class="form-input"
                  >
                  <span class="input-suffix">mm</span>
                </div>
              </div>
              
              <div class="form-group">
                <label class="checkbox-container">
                  <input
                    v-model="form.cutMarks"
                    type="checkbox"
                    class="checkbox"
                  >
                  <span class="checkmark" />
                  <span class="checkbox-label">Include cut marks for precise cutting.</span>
                </label>
              </div>
            </div>
            
            <!-- Buttons -->
            <div class="button-group button-group--single">
              <button
                type="button"
                class="btn btn-primary"
                :disabled="!canGeneratePdf || status.loadingPdf"
                @click="handleGeneratePdf"
              >
                <span v-if="status.loadingPdf">Generating...</span>
                <span v-else>📄 Generate PDF</span>
              </button>
            </div>
            
            <!-- Status Messages -->
            <div
              v-if="status.resolveError"
              class="error-message"
            >
              ❌ {{ status.resolveError }}
            </div>
            
            <div
              v-if="status.pdfError"
              class="error-message"
            >
              ❌ {{ status.pdfError }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Preview Section -->
    <section
      v-if="hasResolvedItems"
      class="preview-section"
    >
      <div class="section-header">
        <div class="section-title">
          <h2>Card Preview</h2>
          <span class="section-subtitle">Drag cards to reorder • Select different sets using dropdowns</span>
        </div>
        
        <div class="section-controls">
          <div class="preview-stats">
            <div class="stat-pill">
              <span class="stat-number">{{ totalTiles }}</span>
              <span class="stat-label">card<span v-if="!isSingleTile">s</span></span>
            </div>
            
            <button
              v-if="hasErrors"
              type="button"
              class="stat-pill stat-pill--error stat-pill--interactive"
              @click="openIssuesModal"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M15 9L9 15M9 9L15 15"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
              <span>Issues found</span>
            </button>
            
            <button
              v-else-if="hasWarnings"
              type="button"
              class="stat-pill stat-pill--warning stat-pill--interactive"
              @click="openIssuesModal"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <line
                  x1="12"
                  y1="9"
                  x2="12"
                  y2="13"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <line
                  x1="12"
                  y1="17"
                  x2="12.01"
                  y2="17"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
              <span>Warnings</span>
            </button>
            
            <div
              v-else
              class="stat-pill stat-pill--success"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <polyline
                  points="22,4 12,14.01 9,11.01"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
              <span>Ready to print</span>
            </div>
          </div>

          <button
            type="button"
            class="btn btn-secondary preview-download-btn"
            :disabled="status.downloadingAll || !hasDownloadableTiles"
            @click="downloadAllTiles"
          >
            <span v-if="status.downloadingAll">Downloading...</span>
            <span v-else>⬇️ Download all cards</span>
          </button>
        </div>
      </div>

      <div
        v-if="status.downloadError"
        class="download-error"
      >
        ❌ {{ status.downloadError }}
      </div>

      <div class="preview-grid">
        <div
          v-for="(tile, index) in getPreviewTiles()"
          :key="tile.key"
          class="tile-container"
        >
          <div
            class="tile"
            :class="{
              'tile--dragging': dragState.draggedIndex === index,
              'tile--drag-over': dragState.dragOverIndex === index,
              'tile--excluded': tile.excluded
            }"
            draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragover="handleDragOver($event, index)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, index)"
            @dragend="handleDragEnd"
          >
            <img
              :src="tile.image"
              :alt="tile.label"
              loading="lazy"
            >
            <span
              v-if="tile.warning"
              class="tile-note"
            >{{ tile.warning }}</span>

            <button
              class="tile-download-btn"
              type="button"
              :disabled="isTileDownloading(tile.key)"
              title="Download image"
              @click.stop="downloadTileImage(tile, index)"
            >
              <span
                v-if="isTileDownloading(tile.key)"
                class="tile-download-spinner"
              />
              <svg
                v-else
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 3v12m0 0 5-5m-5 5-5-5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M5 19h14"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            
            <!-- Remove/Restore button -->
            <button 
              v-if="!tile.excluded"
              class="tile-remove-btn"
              title="Remove from PDF"
              type="button"
              @click="removeCard(tile.key)"
            >
              ✕
            </button>
            <button 
              v-else
              class="tile-restore-btn"
              title="Restore to PDF"
              type="button"
              @click="restoreCard(tile.key)"
            >
              ↶
            </button>
            
            <!-- Excluded overlay -->
            <div
              v-if="tile.excluded"
              class="tile-excluded-overlay"
            >
              <span class="excluded-text">Excluded</span>
            </div>
          </div>
          
          <!-- Set Selection Dropdown - positioned below the tile container -->
          <div 
            v-if="tile.item && tile.item.allPrintings && tile.item.allPrintings.length > 0" 
            class="tile-set-selector"
          >
            <select 
              :id="`printing-${tile.item.id}`"
              :value="tile.item.selectedPrinting?.id || ''"
              :disabled="!hasMultiplePrintings(tile.item)"
              class="tile-set-dropdown"
              :class="{ 'tile-set-dropdown--disabled': !hasMultiplePrintings(tile.item) }"
              @change="handlePrintingChange(tile.item.id, ($event.target as HTMLSelectElement).value)"
            >
              <option 
                v-for="printing in getAvailablePrintings(tile.item)" 
                :key="printing.id" 
                :value="printing.id"
              >
                {{ printing.set_name }} ({{ printing.set.toUpperCase() }}) #{{ printing.collector_number }}
                <template v-if="printing.lang !== 'en'">
                  · {{ printing.lang }}
                </template>
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Line summary section hidden since dropdowns are now below cards
      <div class="line-summary">
        <article v-for="item in resolvedItems" :key="item.id" class="line" :class="{ 'line--secondary-face': item.isSecondaryFace }">
          <header>
            <strong>{{ item.line.qty }}× {{ item.line.name }}</strong>
            <span v-if="item.faceName && item.faceName !== item.line.name" class="face-tag">
              {{ item.faceName }}
            </span>
            <span v-if="item.isSecondaryFace" class="face-indicator">Back Face</span>
            <span v-if="item.line.set" class="set-tag">
              ({{ item.line.set }}) {{ item.line.collector }}
            </span>
            <span v-if="item.line.foil" class="foil-tag">Foil</span>
          </header>
          
          <p v-if="item.error" class="error">{{ item.error }}</p>
          <p v-else-if="item.warning" class="warning">{{ item.warning }}</p>
        </article>
      </div>
      -->
    </section>

    <div
      v-if="issuesModal.open"
      class="issues-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="issues-modal-title"
      @click.self="closeIssuesModal"
      @keydown.esc.window="closeIssuesModal"
    >
      <div class="issues-modal">
        <header class="issues-modal__header">
          <div>
            <h3
              id="issues-modal-title"
              class="issues-modal__title"
            >
              Deck validation details
            </h3>
            <p class="issues-modal__subtitle">
              Review errors and warnings to fix problem cards before printing.
            </p>
          </div>
          <button
            type="button"
            class="issues-modal__close"
            aria-label="Close issue details"
            @click="closeIssuesModal"
          >
            ✕
          </button>
        </header>

        <div class="issues-modal__body">
          <div
            v-if="issueSummary.errors.length"
            class="issue-group"
          >
            <h4 class="issue-group__title issue-group__title--error">
              Errors
            </h4>
            <p class="issue-group__caption">
              These cards couldn't be processed and require fixes before they will print.
            </p>
            <ul class="issue-list">
              <li
                v-for="item in issueSummary.errors"
                :key="`error-${item.id}`"
                class="issue-entry issue-entry--error"
              >
                <div class="issue-entry__header">
                  <span class="issue-entry__name">{{ item.card?.name ?? item.line.name }}</span>
                  <span
                    v-if="item.line.set || item.line.collector"
                    class="issue-entry__meta"
                  >
                    <template v-if="item.line.set">{{ item.line.set }}</template>
                    <template v-if="item.line.set && item.line.collector"> · </template>
                    <template v-if="item.line.collector">#{{ item.line.collector }}</template>
                  </span>
                </div>
                <p class="issue-entry__message">{{ item.error }}</p>
              </li>
            </ul>
          </div>

          <div
            v-if="issueSummary.warnings.length"
            class="issue-group"
          >
            <h4 class="issue-group__title issue-group__title--warning">
              Warnings
            </h4>
            <p class="issue-group__caption">
              We resolved these cards, but something may not look right.
            </p>
            <ul class="issue-list">
              <li
                v-for="item in issueSummary.warnings"
                :key="`warning-${item.id}`"
                class="issue-entry issue-entry--warning"
              >
                <div class="issue-entry__header">
                  <span class="issue-entry__name">{{ item.card?.name ?? item.line.name }}</span>
                  <span
                    v-if="item.line.set || item.line.collector"
                    class="issue-entry__meta"
                  >
                    <template v-if="item.line.set">{{ item.line.set }}</template>
                    <template v-if="item.line.set && item.line.collector"> · </template>
                    <template v-if="item.line.collector">#{{ item.line.collector }}</template>
                  </span>
                </div>
                <p class="issue-entry__message">{{ item.warning }}</p>
              </li>
            </ul>
          </div>

          <div
            v-if="!issueSummary.errors.length && !issueSummary.warnings.length"
            class="issue-empty"
          >
            <p>No issues to show.</p>
          </div>
        </div>
      </div>
    </div>

    <section class="community-section">
      <div class="community-card">
        <div class="community-copy">
          <h2 class="community-title">
            Built with the community
          </h2>
          <p class="community-description">
            MTG Proxy Print is fully open source and growing fast. We're looking for contributors&mdash;if you care about better proxies, new print layouts, or other features, we would love your help shaping the next release.
          </p>
        </div>
        <div class="community-actions">
          <a
            class="community-link community-link--primary"
            href="https://github.com/acocalypso/mtgproxyprint"
            target="_blank"
            rel="noopener"
          >
            Visit the GitHub project
          </a>
          <a
            class="community-link community-link--secondary"
            href="https://github.com/acocalypso/mtgproxyprint/issues"
            target="_blank"
            rel="noopener"
          >
            Browse open issues
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue';
import JSZip from 'jszip';

interface ResolveLine {
  qty: number;
  name: string;
  set?: string;
  collector?: string;
  foil?: boolean;
}

interface ResolveCardSummary {
  id: string;
  name: string;
  lang: string;
  set: string;
  collector_number: string;
  layout?: string;
  faces?: Array<{ name: string; image?: string; highRes: boolean }>;
}

interface ResolveItem {
  id: number;
  line: ResolveLine;
  card?: ResolveCardSummary;
  image?: string;
  highRes?: boolean;
  error?: string;
  warning?: string;
  faceName?: string; // For double-sided cards, indicates which face this represents
  isSecondaryFace?: boolean; // Indicates this is the back face of a double-sided card
  allPrintings?: any[]; // All available printings for this card
  selectedPrinting?: any; // Currently selected printing
}

interface ResolveResponse {
  items: ResolveItem[];
}

interface SearchResult {
  id: string;
  name: string;
  set: string;
  collector_number: string;
  image: string;
  lang: string;
  fullCard?: any; // Complete card data from Scryfall for double-sided cards
  allPrintings?: any[]; // All available printings of this card
}

interface SearchResponse {
  results: SearchResult[];
}

type PaperSize = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Tabloid' | 'A4-4x2' | 'Letter-4x2';

const form = reactive({
  decklist: '',
  paper: 'A4' as PaperSize,
  gapMm: 2,
  cutMarks: false
});

const status = reactive({
  loadingResolve: false,
  loadingPdf: false,
  resolveError: null as string | null,
  pdfError: null as string | null,
  downloadingAll: false,
  downloadError: null as string | null
});

const search = reactive({
  query: '',
  results: [] as SearchResult[],
  loading: false,
  error: null as string | null
});

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

type ItemSource = 'decklist' | 'manual';

type ResolvedItemWithMeta = ResolveItem & { id: number; source?: ItemSource };

const resolvedItems = reactive<ResolvedItemWithMeta[]>([]);

// Track excluded/removed cards by their unique key
const excludedCards = reactive<Set<string>>(new Set());

interface PreviewTile {
  key: string;
  image: string;
  label: string;
  warning?: string;
  item?: ResolvedItemWithMeta; // Reference to the resolved item for dropdown access
  excluded?: boolean; // Whether this tile is excluded from PDF generation
}

const previewTiles = ref<PreviewTile[]>([]);
const dragState = reactive({
  draggedIndex: -1,
  dragOverIndex: -1
});

const downloadingTiles = reactive<Record<string, boolean>>({});

// Compute effective display data for each item (handling face flipping)
const displayItems = computed<ResolvedItemWithMeta[]>(() => {
  const result: ResolvedItemWithMeta[] = [];
  
  resolvedItems.forEach(item => {
    if (!item.card?.faces || item.card.faces.length <= 1) {
      // Single-faced card, add as-is
      result.push(item);
    } else {
      // Multi-faced card, create one item for each face
      item.card.faces.forEach((face, index) => {
        const faceItem: ResolvedItemWithMeta = {
          ...item,
          id: item.id * 1000 + index, // Unique ID for each face
          image: face.image || item.image,
          faceName: face.name,
          isSecondaryFace: index > 0,
          highRes: face.highRes
        };
        result.push(faceItem);
      });
    }
  });
  
  return result;
});

watchEffect(() => {
  const tiles: PreviewTile[] = [];
  
  // Use displayItems safely
  const items = displayItems.value || [];
  items.forEach((item, index) => {
    if (!item.image || !item.line || item.line.qty <= 0) {
      return;
    }
    
    const repeats = Math.max(1, Math.floor(item.line.qty));
    
    for (let i = 0; i < repeats; i += 1) {
      const tileKey = `${index}-${i}`;
      tiles.push({
        key: tileKey,
        image: item.image,
        label: item.card?.name ?? item.line.name,
        warning: item.warning,
        item: i === 0 ? item : undefined, // Only add item reference to first tile to avoid duplicate dropdowns
        excluded: excludedCards.has(tileKey)
      });
    }
  });
  
  previewTiles.value = tiles;
});

function getPreviewTiles(): PreviewTile[] {
  return previewTiles.value;
}

// Function to remove/exclude a card from PDF generation
function removeCard(tileKey: string) {
  excludedCards.add(tileKey);
}

// Function to restore a removed card
function restoreCard(tileKey: string) {
  excludedCards.delete(tileKey);
}



// Drag and drop handlers
function handleDragStart(event: DragEvent, index: number) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  }
  dragState.draggedIndex = index;
}

function handleDragOver(event: DragEvent, index: number) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragState.dragOverIndex = index;
}

function handleDragLeave() {
  dragState.dragOverIndex = -1;
}

function handleDrop(event: DragEvent, dropIndex: number) {
  event.preventDefault();
  const dragIndex = dragState.draggedIndex;
  
  if (dragIndex !== -1 && dragIndex !== dropIndex) {
    // Reorder the tiles
    const tiles = [...previewTiles.value];
    const draggedTile = tiles.splice(dragIndex, 1)[0];
    tiles.splice(dropIndex, 0, draggedTile);
    previewTiles.value = tiles;
  }
  
  // Reset drag state
  dragState.draggedIndex = -1;
  dragState.dragOverIndex = -1;
}

function handleDragEnd() {
  dragState.draggedIndex = -1;
  dragState.dragOverIndex = -1;
}

const totalTiles = computed<number>(() => previewTiles.value.length);
const isSingleTile = computed(() => totalTiles.value === 1);
const hasResolvedItems = computed(() => resolvedItems.length > 0);
const hasErrors = computed(() => resolvedItems.some((item) => Boolean(item.error)));
const hasWarnings = computed(() => resolvedItems.some((item) => !item.error && item.warning));
const canGeneratePdf = computed(() => (displayItems.value || []).some(item => item.image && item.line.qty > 0 && !item.error) && !status.loadingResolve);
const hasDownloadableTiles = computed(() => previewTiles.value.some(tile => !tile.excluded));
const canClearDecklist = computed(() => form.decklist.trim().length > 0 || resolvedItems.length > 0 || previewTiles.value.length > 0);

const issuesModal = reactive({ open: false });

const issueSummary = computed(() => {
  const errors: ResolvedItemWithMeta[] = [];
  const warnings: ResolvedItemWithMeta[] = [];

  resolvedItems.forEach(item => {
    if (item.error) {
      errors.push(item);
    } else if (!item.error && item.warning) {
      warnings.push(item);
    }
  });

  return { errors, warnings };
});

function openIssuesModal() {
  if (!hasErrors.value && !hasWarnings.value) {
    return;
  }
  issuesModal.open = true;
}

function closeIssuesModal() {
  issuesModal.open = false;
}

function handleClearDecklist() {
  form.decklist = '';
  status.resolveError = null;
  status.pdfError = null;
  status.downloadError = null;
  status.downloadingAll = false;

  resolvedItems.splice(0, resolvedItems.length);
  previewTiles.value = [];
  excludedCards.clear();

  Object.keys(downloadingTiles).forEach((key) => {
    delete downloadingTiles[key];
  });

  closeIssuesModal();
}

async function handlePreview() {
  status.resolveError = null;
  status.pdfError = null;
  status.loadingResolve = true;

  try {
    const response = await fetch('/api/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decklist: form.decklist })
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      status.resolveError = message;
      resetResolvedItems([]);
      return;
    }

    const payload = (await response.json()) as ResolveResponse;
    console.log('API Response received:', payload);
    const next = (payload.items ?? []).map((item, index) => ({
      ...item,
      id: index,
      source: 'decklist' as const
    }));
    console.log('Processed items with IDs:', next);
    resetResolvedItems(next);
  } catch (error) {
    status.resolveError = error instanceof Error ? error.message : 'Failed to contact the server.';
    resetResolvedItems([]);
  } finally {
    status.loadingResolve = false;
  }
}

async function handleGeneratePdf() {
  if (!canGeneratePdf.value) {
    return;
  }

  status.pdfError = null;
  status.loadingPdf = true;

  // Create tiles excluding removed cards
  const tiles: Array<{ image: string; qty: number; label: string; }> = [];
  const items = displayItems.value || [];
  
  items.forEach((item, index) => {
    if (!item.image || item.line.qty <= 0 || item.error) {
      return;
    }
    
    const repeats = Math.max(1, Math.floor(item.line.qty));
    let includedCount = 0;
    
    // Count how many copies of this card are not excluded
    for (let i = 0; i < repeats; i += 1) {
      const tileKey = `${index}-${i}`;
      if (!excludedCards.has(tileKey)) {
        includedCount++;
      }
    }
    
    // Only add to PDF if there are included copies
    if (includedCount > 0) {
      tiles.push({
        image: item.image as string,
        qty: includedCount,
        label: item.card?.name ?? item.line.name
      });
    }
  });

  try {
    const response = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tiles,
        paper: form.paper,
        gapMm: form.gapMm,
        cutMarks: form.cutMarks
      })
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      status.pdfError = message;
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mtg-proxy-${form.paper.toLowerCase()}-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    status.pdfError = error instanceof Error ? error.message : 'Failed to generate PDF.';
  } finally {
    status.loadingPdf = false;
  }
}

function sanitizeBaseName(label: string): string {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'card';
}

function extensionFromMime(mime: string | undefined, fallbackUrl: string): string {
  if (mime) {
    if (mime.startsWith('image/')) {
      const value = mime.split('/')[1] || '';
      if (value.toLowerCase() === 'jpeg') {
        return 'jpg';
      }
      if (value) {
        return value.toLowerCase();
      }
    }
  }
  const parsed = fallbackUrl.split('?')[0].split('#')[0];
  const lastSegment = parsed.substring(parsed.lastIndexOf('/') + 1);
  const match = lastSegment.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : 'png';
}

async function fetchImageBlob(imageUrl: string): Promise<{ blob: Blob; extension: string }> {
  const response = await fetch(imageUrl, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status})`);
  }
  const blob = await response.blob();
  const extension = extensionFromMime(blob.type, imageUrl);
  return { blob, extension };
}

function buildTileFilename(label: string, identifier: string | number | null, extension: string): string {
  const base = sanitizeBaseName(label);
  const suffix = identifier !== null && identifier !== undefined && `${identifier}` !== ''
    ? `-${`${identifier}`.replace(/[^a-z0-9]+/g, '-')}`
    : '';
  return `${base}${suffix}.${extension}`;
}

function buildSequentialFilename(
  label: string,
  counts: Map<string, number>,
  extension: string
): string {
  const base = sanitizeBaseName(label);
  const current = (counts.get(base) ?? 0) + 1;
  counts.set(base, current);
  const suffix = current > 1 ? `-${current}` : '';
  return `${base}${suffix}.${extension}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function isTileDownloading(tileKey: string): boolean {
  return Boolean(downloadingTiles[tileKey]);
}

async function downloadTileImage(tile: PreviewTile, index: number) {
  const tileKey = tile.key || `tile-${index}`;
  if (downloadingTiles[tileKey]) {
    return;
  }
  try {
    downloadingTiles[tileKey] = true;
    status.downloadError = null;
    const { blob, extension } = await fetchImageBlob(tile.image);
    const filename = buildTileFilename(tile.label, tileKey.replace(/[^a-z0-9]+/g, '-'), extension);
    triggerBlobDownload(blob, filename);
  } catch (error) {
    status.downloadError = error instanceof Error ? error.message : 'Failed to download image.';
  } finally {
    delete downloadingTiles[tileKey];
  }
}

async function downloadAllTiles() {
  if (status.downloadingAll) {
    return;
  }

  const tilesToDownload = previewTiles.value.filter(tile => !tile.excluded);
  if (tilesToDownload.length === 0) {
    status.downloadError = 'No cards available to download.';
    return;
  }

  status.downloadError = null;
  status.downloadingAll = true;

  try {
    const zip = new JSZip();
    const counts = new Map<string, number>();

    for (const tile of tilesToDownload) {
      const { blob, extension } = await fetchImageBlob(tile.image);
      const filename = buildSequentialFilename(tile.label, counts, extension);
      zip.file(filename, blob);
    }

    const bundled = await zip.generateAsync({ type: 'blob' });
    triggerBlobDownload(bundled, 'mtg-proxy-cards.zip');
  } catch (error) {
    status.downloadError = error instanceof Error ? error.message : 'Failed to download images.';
  } finally {
    status.downloadingAll = false;
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data === 'object' && 'message' in data) {
      return String(data.message);
    }
  } catch {
    // ignore JSON parsing failures
  }
  return `Request failed (${response.status})`;
}

function handleSearchInput() {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  search.error = null;
  
  if (!search.query.trim()) {
    search.results = [];
    return;
  }
  
  searchTimeout = setTimeout(performSearch, 300);
}

async function performSearch() {
  if (!search.query.trim()) {
    return;
  }
  
  search.loading = true;
  search.error = null;
  
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: search.query, limit: 10 })
    });
    
    if (!response.ok) {
      const message = await extractErrorMessage(response);
      search.error = message;
      search.results = [];
      return;
    }
    
    const data = (await response.json()) as SearchResponse;
    search.results = data.results;
  } catch (error) {
    search.error = error instanceof Error ? error.message : 'Search failed';
    search.results = [];
  } finally {
    search.loading = false;
  }
}

function clearSearch() {
  search.query = '';
  search.results = [];
  search.error = null;
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
}

function addCardFromSearch(result: SearchResult) {
  const newId = Date.now(); // Simple ID generation
  
  // Find the printing that matches the search result, or use the first printing as fallback
  let defaultPrinting;
  if (result.allPrintings && result.allPrintings.length > 0) {
    // Try to find the exact printing that was searched for
    defaultPrinting = result.allPrintings.find(p => 
      p.id === result.id || 
      (p.set.toLowerCase() === result.set.toLowerCase() && 
       p.collector_number === result.collector_number &&
       p.lang === result.lang)
    ) || result.allPrintings[0];
  } else {
    // Fallback to constructing from search result
    defaultPrinting = result.fullCard || {
      id: result.id,
      name: result.name,
      set: result.set.toLowerCase(),
      collector_number: result.collector_number,
      image_uris: { png: result.image },
      lang: result.lang
    };
  }
  
  // Check if this is a double-sided card
  const isDoubleSided = defaultPrinting?.card_faces && defaultPrinting.card_faces.length > 1;
  
  if (isDoubleSided) {
    // Create a resolved item with both faces
  const faces = defaultPrinting.card_faces.map((face: any) => ({
      name: face.name,
      image: face.image_uris?.png || face.image_uris?.normal,
      highRes: true
    }));
    
    const newItem: ResolvedItemWithMeta = {
      id: newId,
      line: {
        qty: 1,
        name: result.name,
        set: defaultPrinting.set.toUpperCase(),
        collector: defaultPrinting.collector_number
      },
      card: {
        id: defaultPrinting.id,
        name: result.name,
        lang: defaultPrinting.lang,
        set: defaultPrinting.set.toLowerCase(),
        collector_number: defaultPrinting.collector_number,
        layout: defaultPrinting.layout || 'normal',
        faces: faces
      },
      image: faces[0]?.image || defaultPrinting.image_uris?.png || defaultPrinting.image_uris?.normal,
      highRes: true,
      allPrintings: result.allPrintings || [defaultPrinting],
      selectedPrinting: defaultPrinting,
      source: 'manual'
    };
    
    resolvedItems.push(newItem);
  } else {
    // Single-faced card
    const newItem: ResolvedItemWithMeta = {
      id: newId,
      line: {
        qty: 1,
        name: result.name,
        set: defaultPrinting.set.toUpperCase(),
        collector: defaultPrinting.collector_number
      },
      card: {
        id: defaultPrinting.id,
        name: result.name,
        lang: defaultPrinting.lang,
        set: defaultPrinting.set.toLowerCase(),
        collector_number: defaultPrinting.collector_number,
        layout: 'normal'
      },
      image: defaultPrinting.image_uris?.png || defaultPrinting.image_uris?.normal || result.image,
      highRes: true,
      allPrintings: result.allPrintings || [defaultPrinting],
      selectedPrinting: defaultPrinting,
      source: 'manual'
    };
    
    resolvedItems.push(newItem);
  }
  
  // Clear search
  clearSearch();
}

function resetResolvedItems(items: ResolvedItemWithMeta[]): void {
  const manualItems = resolvedItems.filter(item => item.source === 'manual');
  const dedupedManualIds = new Set<number>();
  const preservedManualItems = manualItems.filter(item => {
    if (dedupedManualIds.has(item.id)) {
      return false;
    }
    dedupedManualIds.add(item.id);
    return true;
  });

  const nextItems = [...preservedManualItems, ...items];
  resolvedItems.splice(0, resolvedItems.length, ...nextItems);
}

function handlePrintingChange(itemId: number, printingId: string) {
  const item = resolvedItems.find(item => item.id === itemId);
  if (!item || !item.allPrintings) return;
  
  const newPrinting = item.allPrintings.find(p => p.id === printingId);
  if (!newPrinting) return;
  
  // Update the selected printing
  item.selectedPrinting = newPrinting;
  
  // Update the card data and image
  const isDoubleSided = newPrinting.card_faces && newPrinting.card_faces.length > 1;
  
  if (isDoubleSided) {
    const faces = newPrinting.card_faces.map((face: any) => ({
      name: face.name,
      image: face.image_uris?.png || face.image_uris?.normal,
      highRes: true
    }));
    
    item.card = {
      ...item.card!,
      id: newPrinting.id,
      lang: newPrinting.lang,
      set: newPrinting.set.toLowerCase(),
      collector_number: newPrinting.collector_number,
      layout: newPrinting.layout || 'normal',
      faces: faces
    };
    item.image = faces[0]?.image;
  } else {
    item.card = {
      ...item.card!,
      id: newPrinting.id,
      lang: newPrinting.lang,
      set: newPrinting.set.toLowerCase(),
      collector_number: newPrinting.collector_number,
      layout: newPrinting.layout || 'normal'
    };
    item.image = newPrinting.image_uris?.png || newPrinting.image_uris?.normal;
  }
  
  // Update line data
  item.line.set = newPrinting.set.toUpperCase();
  item.line.collector = newPrinting.collector_number;
}


function hasMultiplePrintings(item: ResolvedItemWithMeta): boolean {
  return Boolean(item.allPrintings && item.allPrintings.length > 1);
}

function getAvailablePrintings(item: ResolvedItemWithMeta): any[] {
  if (!item.allPrintings) return [];

  const selectedId = item.selectedPrinting?.id;
  const preferredLang = item.selectedPrinting?.lang || item.card?.lang || 'en';

  const printings = [...item.allPrintings];

  printings.sort((a, b) => {
    if (a.id === selectedId) return -1;
    if (b.id === selectedId) return 1;

    if (a.lang === preferredLang && b.lang !== preferredLang) return -1;
    if (b.lang === preferredLang && a.lang !== preferredLang) return 1;

    if (a.released_at && b.released_at) {
      return new Date(b.released_at).getTime() - new Date(a.released_at).getTime();
    }

    return 0;
  });

  return printings;
}


</script>

<style scoped>
/* Clean, minimal design */
* {
  box-sizing: border-box;
}

.app {
  min-height: 100vh;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  color: #333;
  line-height: 1.6;
}

/* Hero Section */
.clean-hero {
  position: relative;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.hero-background-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2;
}

.hero-content {
  position: relative;
  z-index: 3;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.hero-info-box {
  background: transparent;
  backdrop-filter: blur(8px);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}

.hero-description {
  font-size: 1.125rem;
  color: #ffffff;
  margin: 0 0 1.5rem 0;
  line-height: 1.6;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}

.hero-features {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.feature {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-weight: 500;
  backdrop-filter: blur(5px);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.hero-badges {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(5px);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.hero-pill a {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.hero-pill a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .clean-hero {
    min-height: 300px;
    padding: 2rem 1rem;
  }
  
  .hero-info-box {
    padding: 2rem;
    margin: 0 0.5rem;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-features {
    flex-direction: column;
    align-items: center;
  }

  .hero-badges {
    width: 100%;
  }

  .hero-pill {
    width: 100%;
    justify-content: center;
  }
}

/* Main Content */
.main-content {
  padding: 2rem 1rem;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

/* Search Section */
.search-section {
  margin-bottom: 3rem;
}

.search-section > h2 {
  font-size: 1.875rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: #111827;
  text-align: center;
}

.search-card {
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  position: relative;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  color: #6b7280;
  pointer-events: none;
  z-index: 2;
}

.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  background: #ffffff;
  color: #111827;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-clear {
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.2s;
}

.search-clear:hover {
  color: #374151;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.search-result {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f3f4f6;
}

.search-result:hover {
  background: #f9fafb;
}

.search-result:last-child {
  border-bottom: none;
}

.search-result-image {
  width: 40px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.search-result-info {
  flex: 1;
  min-width: 0;
}

.search-result-name {
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-result-set {
  color: #6b7280;
  font-size: 0.875rem;
}

.search-result-add {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.search-result-add:hover {
  background: #2563eb;
}

.search-loading,
.search-error,
.search-no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  color: #6b7280;
  text-align: center;
}

.search-error {
  color: #dc2626;
}

.search-no-results {
  flex-direction: column;
  gap: 0.5rem;
}

.no-results-hint {
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.content-wrapper > h2 {
  font-size: 1.875rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: #111827;
  text-align: center;
}

.section-description {
  text-align: center;
  color: #6b7280;
  margin: 0 0 2rem 0;
  font-size: 1rem;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  align-items: start;
}

/* Community Section */
.community-section {
  background: #f9fafb;
  padding: 3rem 1rem;
  border-top: 1px solid #e5e7eb;
}

.community-card {
  max-width: 1000px;
  margin: 0 auto;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(129, 140, 248, 0.1));
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 16px;
  padding: 2.5rem 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);
}

.community-copy {
  flex: 1;
}

.community-title {
  font-size: 2rem;
  margin: 0 0 0.75rem 0;
  color: #111827;
}

.community-description {
  margin: 0;
  font-size: 1rem;
  color: #374151;
  max-width: 520px;
}

.community-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 240px;
}

.community-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.5rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
  border: 1px solid transparent;
}

.community-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(59, 130, 246, 0.15);
}

.community-link--primary {
  background: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
}

.community-link--primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.community-link--secondary {
  background: rgba(255, 255, 255, 0.8);
  color: #1f2937;
  border-color: rgba(59, 130, 246, 0.2);
}

.community-link--secondary:hover {
  background: #ffffff;
  border-color: rgba(37, 99, 235, 0.4);
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

/* Input Section */
.input-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

.section-header {
  margin-bottom: 1rem;
}

.section-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #111827;
}

.format-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  background: #f3f4f6;
  color: #6b7280;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid #e5e7eb;
}

.tag-primary {
  background: #eff6ff;
  color: #3b82f6;
  border-color: #dbeafe;
}

.input-label {
  display: block;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.input-label code {
  background: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-family: 'SF Mono', monospace;
  font-size: 0.8em;
  color: #374151;
}

.input-label .input-subtext {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

.decklist-input {
  width: 100%;
  min-height: 300px;
  padding: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: 'SF Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: vertical;
  background: #ffffff;
  color: #111827;
}

.decklist-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.decklist-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.decklist-preview-btn {
  flex: 0 0 auto;
  min-width: 200px;
}

.decklist-clear-btn {
  flex: 0 0 auto;
  min-width: 200px;
}

/* Settings Section */
.settings-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

.settings-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: #111827;
}

.settings-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0 0 1.5rem 0;
}

.settings-form {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
}

.form-select,
.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: #ffffff;
  color: #111827;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.input-group {
  display: flex;
  position: relative;
}

.input-group .form-input {
  padding-right: 3.25rem;
}

.input-suffix {
  position: absolute;
  right: 2.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 0.875rem;
  pointer-events: none;
}

.input-group input[type="number"]::-webkit-inner-spin-button,
.input-group input[type="number"]::-webkit-outer-spin-button {
  margin-left: 0.5rem;
}

.input-group input[type="number"] {
  appearance: textfield;
  -moz-appearance: textfield;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  position: relative;
}

.checkbox {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  width: 1rem;
  height: 1rem;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  position: relative;
  flex-shrink: 0;
}

.checkbox:checked + .checkmark {
  background: #3b82f6;
  border-color: #3b82f6;
}

.checkbox:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 1px;
  width: 4px;
  height: 7px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

/* Buttons */
.button-group {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.button-group--single {
  justify-content: flex-end;
}

.button-group--single .btn {
  flex: 0 0 auto;
  min-width: 200px;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  flex: 1;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-secondary {
  background: #ffffff;
  color: #374151;
  border-color: #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

/* Error Messages */
.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  border: 1px solid #fecaca;
}

/* Preview Section */
.preview-section {
  max-width: 1200px;
  margin: 2rem auto 0;
  padding: 0 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.section-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.preview-download-btn {
  min-width: 190px;
  white-space: nowrap;
}

.download-error {
  margin: 0 0 1rem 0;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.section-title h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

.section-subtitle {
  color: #6b7280;
  font-size: 0.875rem;
}

.preview-stats {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f3f4f6;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #e5e7eb;
}

.stat-pill--interactive {
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.stat-pill--interactive:hover {
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
  transform: translateY(-1px);
}

.stat-pill--interactive:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.stat-pill--success {
  background: #f0fdf4;
  color: #166534;
  border-color: #bbf7d0;
}

.stat-pill--warning {
  background: #fffbeb;
  color: #d97706;
  border-color: #fed7aa;
}

.stat-pill--error {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.stat-number {
  font-weight: 700;
}

.issues-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
  z-index: 2000;
}

.issues-modal {
  background: #ffffff;
  width: min(640px, 100%);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.45);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.issues-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.issues-modal__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.issues-modal__subtitle {
  margin: 0.35rem 0 0 0;
  font-size: 0.9rem;
  color: #6b7280;
}

.issues-modal__close {
  background: transparent;
  border: none;
  color: #6b7280;
  font-size: 1.25rem;
  cursor: pointer;
  line-height: 1;
  border-radius: 999px;
  transition: color 0.2s ease, background 0.2s ease;
}

.issues-modal__close:hover {
  color: #111827;
  background: rgba(17, 24, 39, 0.08);
}

.issues-modal__close:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.issues-modal__body {
  padding: 1.5rem;
  overflow-y: auto;
}

.issue-group {
  margin-bottom: 1.75rem;
}

.issue-group:last-child {
  margin-bottom: 0;
}

.issue-group__title {
  margin: 0 0 0.35rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.issue-group__title--error {
  color: #b91c1c;
}

.issue-group__title--warning {
  color: #b45309;
}

.issue-group__caption {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  color: #6b7280;
}

.issue-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.issue-entry {
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 1rem;
}

.issue-entry--error {
  border-left: 4px solid #ef4444;
}

.issue-entry--warning {
  border-left: 4px solid #f59e0b;
}

.issue-entry__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: baseline;
}

.issue-entry__name {
  font-weight: 600;
  color: #111827;
}

.issue-entry__meta {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.issue-entry__message {
  margin: 0.5rem 0 0 0;
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.45;
}

.issue-empty {
  text-align: center;
  color: #6b7280;
  font-size: 0.9rem;
}

/* Preview Grid */
.preview-grid {
  --card-width: 63mm;
  --card-height: 88mm;
  --gap: var(--gap-mm, 2mm);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--card-width), 1fr));
  gap: calc(var(--gap) + 1rem);
  justify-content: center;
  align-items: start;
  padding: 1rem 0;
}

.tile-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: var(--card-width);
}

.tile {
  position: relative;
  width: var(--card-width);
  height: var(--card-height);
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
  cursor: grab;
  transition: box-shadow 0.2s;
}

.tile:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tile--excluded {
  opacity: 0.6;
}

.tile--excluded:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tile-remove-btn,
.tile-restore-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  color: white;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.tile-download-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  color: #111827;
  background-color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
}

.tile-download-btn:hover:not(:disabled) {
  background-color: #ffffff;
  transform: translateY(-1px);
}

.tile-download-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.tile-download-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(59, 130, 246, 0.2);
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.tile-remove-btn {
  background-color: rgba(220, 53, 69, 0.8);
}

.tile-remove-btn:hover {
  background-color: rgba(220, 53, 69, 1);
  transform: scale(1.1);
}

.tile-restore-btn {
  background-color: rgba(40, 167, 69, 0.8);
}

.tile-restore-btn:hover {
  background-color: rgba(40, 167, 69, 1);
  transform: scale(1.1);
}

.tile-excluded-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.excluded-text {
  color: white;
  font-weight: bold;
  font-size: 16px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
}

.tile-note {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(217, 119, 6, 0.9);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-features {
    flex-direction: column;
    align-items: center;
  }
  
  .button-group {
    flex-direction: column;
  }

  .button-group--single {
    align-items: stretch;
  }

  .button-group--single .btn {
    width: 100%;
  }

  .decklist-actions {
    justify-content: stretch;
  }

  .decklist-preview-btn {
    width: 100%;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .section-controls {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .preview-download-btn {
    width: 100%;
  }

  .preview-stats {
    flex-wrap: wrap;
  }

  .community-card {
    flex-direction: column;
    text-align: center;
    padding: 2rem;
  }

  .community-actions {
    width: 100%;
  }

  .community-link {
    width: 100%;
  }
}
</style>

<!-- Global styles for body and dropdowns -->
<style>
body {
  margin: 0;
  padding: 0;
  background: #ffffff !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif !important;
}

/* Tile Set Selector - Clean modern styling */
.tile-set-selector {
  width: 100% !important;
  max-width: var(--card-width) !important;
  margin-top: 0.5rem !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  display: block !important;
  position: relative !important;
}

.tile-set-dropdown {
  width: 100% !important;
  background: #ffffff !important;
  border: 1px solid #d1d5db !important;
  border-radius: 6px !important;
  padding: 0.5rem 0.75rem !important;
  font-size: 0.875rem !important;
  font-weight: 500 !important;
  color: #374151 !important;
  cursor: pointer !important;
  transition: all 0.15s ease-in-out !important;
  height: auto !important;
  min-height: 38px !important;
  display: block !important;
  box-sizing: border-box !important;
  line-height: 1.4 !important;
  appearance: none !important;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e") !important;
  background-position: right 0.5rem center !important;
  background-repeat: no-repeat !important;
  background-size: 1.5em 1.5em !important;
  padding-right: 2.5rem !important;
}

.tile-set-dropdown:hover {
  background: #f9fafb !important;
  border-color: #9ca3af !important;
}

.tile-set-dropdown:focus {
  outline: none !important;
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
  background: #ffffff !important;
}

.tile-set-dropdown--disabled {
  opacity: 0.65 !important;
  cursor: not-allowed !important;
  background: #f9fafb !important;
  color: #6b7280 !important;
}

.tile-set-dropdown--disabled:hover {
  background: #f9fafb !important;
  border-color: #d1d5db !important;
}

.tile-set-dropdown option {
  background: #ffffff !important;
  color: #111827 !important;
  padding: 0.5rem !important;
  font-weight: 400 !important;
}
</style>
