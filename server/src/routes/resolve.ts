import { Router, type Request, type Response } from 'express';
import { parseDecklist, type ParsedLine } from '../parser';
import {
  ScryfallClient,
  type ScryfallCard,
  type CollectionLookup,
  type ResolvedCardSummary
} from '../scryfall';

function normalizeLang(lang?: string): string {
  if (!lang || typeof lang !== 'string') {
    return 'en';
  }
  return lang.trim().toLowerCase();
}

// Simple language detection based on card names
function detectLanguageFromNames(names: string[]): string {
  // German detection - look for common German card name patterns
  const germanPatterns = [
    /kolonie/i, // Rattenkolonie
    /blitz/i, // Blitzschlag
    /stein/i, // Stein patterns
    /wald/i, // Forest
    /berg/i, // Mountain
    /insel/i, // Island
    /ebene/i, // Plains
    /sumpf/i, // Swamp
    /drache/i, // Dragon
    /geist/i, // Spirit
    /zauber/i, // Spell
    /krieg/i, // War
    /ritter/i, // Knight
  ];
  
  const germanMatches = names.filter(name => 
    germanPatterns.some(pattern => pattern.test(name))
  );
  
  // If more than 30% of names match German patterns, assume German
  if (germanMatches.length > 0 && germanMatches.length / names.length > 0.3) {
    return 'de';
  }
  
  // Default to English
  return 'en';
}

interface ResolveRequestBody {
  decklist: string;
  lang?: string; // Make optional since we'll auto-detect
}

interface ResolveItem {
  line: {
    qty: number;
    name: string;
    set?: string;
    collector?: string;
    foil?: boolean;
  };
  card?: {
    id: string;
    name: string;
    lang: string;
    set: string;
    collector_number: string;
    layout?: string;
    faces?: Array<{ name: string; image?: string; highRes: boolean }>;
  };
  image?: string;
  highRes?: boolean;
  error?: string;
  warning?: string;
  faceName?: string; // For double-sided cards, indicates which face this represents
  isSecondaryFace?: boolean; // Indicates this is the back face of a double-sided card
  allPrintings?: any[]; // All available printings for dropdown functionality
  selectedPrinting?: any; // Currently selected printing
}

const router = Router();

router.post('/resolve', async (req: Request, res: Response) => {
  const body = req.body as ResolveRequestBody;
  if (!body?.decklist || typeof body.decklist !== 'string' || !body.decklist.trim()) {
    return res.status(400).json({ message: 'decklist is required' });
  }

  const parsedLines = parseDecklist(body.decklist);
  
  // Auto-detect language from card names if not provided
  const cardNames = parsedLines
    .filter(line => !line.parseError && line.name)
    .map(line => line.name);
    
  const requestedLang = body.lang ? 
    normalizeLang(body.lang) : 
    detectLanguageFromNames(cardNames);

  const client = new ScryfallClient();
  const cache = new Map<string, ScryfallCard>();

  const items: ResolveItem[] = parsedLines.map((line) => ({
    line: buildLinePayload(line),
    ...(line.parseError ? { error: line.parseError } : {})
  }));

  const candidates = parsedLines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => !line.parseError && line.qty > 0);

  const unresolved = new Set<number>(candidates.map(({ index }) => index));
  const expandedItems: ResolveItem[] = [];

  // For non-English languages, try collector number lookup first if we have set/collector
  if (requestedLang !== 'en') {
    for (const { line, index } of candidates) {
      if (!unresolved.has(index)) {
        continue;
      }

      const item = items[index];
      if (!item) continue;

      // If we have set and collector, try the collector endpoint with language
      if (line.set && line.collector) {
        try {
          const card = await client.fetchByCollector(line.set, line.collector, requestedLang, cache);

          if (card) {
            const resolvedItems = await applyCard(item, client.toResolvedCard(card), card);
            
            resolvedItems.forEach((resolvedItem: ResolveItem) => {
              expandedItems.push(resolvedItem);
              surfaceLangMismatch(resolvedItem, requestedLang);
            });
            
            unresolved.delete(index);
            continue;
          }
  } catch {
          // Continue to named lookup
        }
      }

      // Fallback to named lookup for cards without set/collector
      try {
        let card = await client.fetchNamed({
          name: line.name,
          // Don't specify set for localized names as it might interfere
          lang: requestedLang
        }, cache);

        // If named lookup fails, try search API for localized cards
        if (!card) {
          const searchQuery = `"${line.name}"`;
          card = await client.fetchBySearch(searchQuery, requestedLang, cache);
        }

        if (card) {
          const resolvedItems = await applyCard(item, client.toResolvedCard(card), card);
          
          resolvedItems.forEach((resolvedItem: ResolveItem) => {
            expandedItems.push(resolvedItem);
            surfaceLangMismatch(resolvedItem, requestedLang);
          });
          
          unresolved.delete(index);
        }
  } catch {
        // Continue to collection lookup
      }
    }
  }

  // Collection lookup for remaining unresolved items
  const withIdentifiers = candidates.filter(({ line, index }) => 
    Boolean(line.set && line.collector) && unresolved.has(index));

  if (withIdentifiers.length) {
    const lookups: CollectionLookup[] = withIdentifiers.map(({ line, index }) => ({
      index,
      identifier: {
        set: line.set!.toLowerCase(),
        collector_number: line.collector!,
        lang: requestedLang
      }
    }));

    try {
      const { found } = await client.fetchCollection(lookups, cache);
      for (const [index, card] of found.entries()) {
        const item = items[index];
        if (!item) {
          continue;
        }
        const resolvedItems = await applyCard(item, client.toResolvedCard(card), card);
        
        // Add all resolved items (single or multiple faces) to expanded list
        resolvedItems.forEach((resolvedItem: ResolveItem) => {
          surfaceLangMismatch(resolvedItem, requestedLang);
          expandedItems.push(resolvedItem);
        });
        
        unresolved.delete(index);
      }
    } catch (error) {
      console.error('Scryfall collection lookup failed', error);
      // fall back to per-card lookups below
    }
  }

  for (const { line, index } of candidates) {
    if (!unresolved.has(index)) {
      continue;
    }

    // We need to find the actual current index since items array may have been modified
    let currentIndex = -1;
    for (let i = 0; i < items.length; i++) {
      if (items[i].line.name === line.name && 
          items[i].line.set === line.set && 
          items[i].line.collector === line.collector &&
          !items[i].card) {
        currentIndex = i;
        break;
      }
    }
    
    if (currentIndex === -1) continue;
    
    const item = items[currentIndex];

    try {
      const card = await client.fetchNamed({
        name: line.name,
        set: line.set,
        lang: requestedLang
      }, cache);

      if (card && item) {
        const resolvedItems = await applyCard(item, client.toResolvedCard(card), card);
        
        // Add resolved items to expandedItems array
        resolvedItems.forEach((resolvedItem: ResolveItem) => {
          expandedItems.push(resolvedItem);
          surfaceLangMismatch(resolvedItem, requestedLang);
        });
        
        unresolved.delete(index);
      } else if (item && !item.error) {
        item.error = buildUnresolvedMessage(line);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error resolving card.';
      if (item) {
        item.error = message;
      }
    }
  }

  // Add any remaining unresolved items to the final response
  for (const index of unresolved) {
    const item = items[index];
    if (item) {
      if (!item.error) {
        item.error = buildUnresolvedMessage(parsedLines[index]);
      }
      expandedItems.push(item);
    }
  }

  res.json({ items: expandedItems });
});

function buildLinePayload(line: ParsedLine) {
  const qty = Number.isFinite(line.qty) ? line.qty : 0;
  const payload: ResolveItem['line'] = {
    qty,
    name: line.name
  };
  if (line.set) {
    payload.set = line.set;
  }
  if (line.collector) {
    payload.collector = line.collector;
  }
  if (line.foil) {
    payload.foil = true;
  }
  return payload;
}

// Fetch all printings of a card using its oracle_id
async function fetchAllPrintings(card: ScryfallCard): Promise<any[]> {
  const cardWithOracleId = card as any; // Type assertion for oracle_id access
  if (!cardWithOracleId.oracle_id) {
    return [card]; // No oracle_id, just use this card
  }

  try {
    // Fetch all printings of this card including all languages
    const printingsUrl = new URL('https://api.scryfall.com/cards/search');
    printingsUrl.searchParams.set('q', `oracleid:${cardWithOracleId.oracle_id} game:paper lang:any`);
    printingsUrl.searchParams.set('unique', 'prints');
    printingsUrl.searchParams.set('order', 'released');
    
    const printingsResponse = await fetch(printingsUrl.toString(), {
      headers: {
        'User-Agent': 'MTGProxyPrint/0.1 (+https://github.com/mtgproxyprint; contact: dev@mtgproxyprint.local)',
        'Accept': 'application/json'
      }
    });
    
    if (printingsResponse.ok) {
      const printingsData = await printingsResponse.json();
      const fetchedPrintings = printingsData.data || [];
      
      // Make sure the original found card is included in the printings
      const originalCardExists = fetchedPrintings.some((p: any) => p.id === cardWithOracleId.id);
      
      if (!originalCardExists) {
        // Add the original card to the beginning of the list
        return [card, ...fetchedPrintings];
      } else {
        return fetchedPrintings;
      }
    } else {
      return [card]; // Fallback to just this card
    }
  } catch (error) {
    console.error('Failed to fetch printings for card:', cardWithOracleId.name, error);
    return [card]; // Fallback to just this card
  }
}

async function applyCard(target: ResolveItem, summary: ResolvedCardSummary, originalCard: ScryfallCard): Promise<ResolveItem[]> {
  // Fetch all printings for dropdown functionality
  const allPrintings = await fetchAllPrintings(originalCard);
  
  // For double-sided cards, create one item that can be flipped between faces
  if (summary.faces && summary.faces.length >= 2) {
    const firstFace = summary.faces[0];
    console.log('Creating double-sided card item with flip capability');
    const faceItem: ResolveItem = {
      line: { ...target.line },
      card: {
        ...summary.card,
        faces: summary.faces  // Include all faces data for flip functionality
      },
      image: firstFace.image,
      highRes: firstFace.highRes,
      faceName: firstFace.name,
      isSecondaryFace: false,
      allPrintings: allPrintings,
      selectedPrinting: originalCard
    };
    
    if (!firstFace.image && !faceItem.error) {
      faceItem.error = `No printable image was available for ${firstFace.name}.`;
    }
    
    console.log('Double-sided card item created with faces:', summary.faces.length);
    return [faceItem];
  }
  
  // Single-faced card (original behavior)
  target.card = summary.card;
  target.image = summary.image;
  target.highRes = summary.highRes;
  target.allPrintings = allPrintings;
  target.selectedPrinting = originalCard;
  
  if (!summary.image && !target.error) {
    target.error = 'No printable image was available for this card.';
  }
  
  return [target];
}

function surfaceLangMismatch(target: ResolveItem, requestedLang: string): void {
  if (!target.card || !requestedLang) {
    return;
  }
  if (target.card.lang.toLowerCase() !== requestedLang.toLowerCase()) {
    const note = `Localized printing not available in ${requestedLang}; using ${target.card.lang}.`;
    target.warning = target.warning ? `${target.warning} ${note}` : note;
  }
}

function buildUnresolvedMessage(line: Pick<ParsedLine, 'set' | 'collector'>): string {
  if (line.set && line.collector) {
    return 'Unable to resolve this entry. Verify the set code and collector number or drop them to search by name only.';
  }
  return 'Unable to resolve this entry. Verify the card name spelling.';
}

export default router;
