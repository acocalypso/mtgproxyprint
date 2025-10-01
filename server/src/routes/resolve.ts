import { Router, type Request, type Response } from 'express';
import pLimit from 'p-limit';
import { parseDecklist, type ParsedLine } from '../parser';
import { type ScryfallCard, type ResolvedCardSummary } from '../scryfall';
import { getScryfallService, ScryfallService } from '../services/scryfallService';

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
const RESOLVE_CONCURRENCY = 12;

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
    
  const requestedLang = body.lang ? normalizeLang(body.lang) : detectLanguageFromNames(cardNames);

  try {
    const service = await getScryfallService();
    const limiter = pLimit(RESOLVE_CONCURRENCY);

    const resolved = await Promise.all(
      parsedLines.map((line) =>
        limiter(() => resolveLine(line, requestedLang, service))
      )
    );

    const items = resolved.flat();
    res.json({ items });
  } catch (error) {
    console.error('Resolve failed', error);
    res.status(500).json({ message: 'Deck resolution failed.' });
  }
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

async function resolveLine(line: ParsedLine, requestedLang: string, service: ScryfallService): Promise<ResolveItem[]> {
  const baseItem: ResolveItem = {
    line: buildLinePayload(line),
    ...(line.parseError ? { error: line.parseError } : {})
  };

  if (line.parseError || !line.name || line.qty <= 0) {
    return [baseItem];
  }

  const lang = requestedLang || 'en';
  let card: ScryfallCard | null = null;

  if (line.set && line.collector) {
    card = await service.findByCollector(line.set, line.collector, lang);
  }

  if (!card) {
    card = await service.findByName(line.name, { set: line.set, lang });
  }

  if (!card && lang !== 'en') {
    card = await service.findByName(line.name, { set: line.set, lang: 'en' });
  }

  if (!card) {
    const unresolved = { ...baseItem };
    if (!unresolved.error) {
      unresolved.error = buildUnresolvedMessage(line);
    }
    return [unresolved];
  }

  const summary = service.toResolvedCard(card);
  const printings = service.getPrintings(card);
  const resolvedItems = applyCard(baseItem, summary, card, printings);
  resolvedItems.forEach((item) => surfaceLangMismatch(item, lang));
  return resolvedItems;
}

function applyCard(
  target: ResolveItem,
  summary: ResolvedCardSummary,
  originalCard: ScryfallCard,
  allPrintings: ScryfallCard[]
): ResolveItem[] {
  const printingsForResponse = allPrintings.map(cloneCardForResponse);
  const selectedPrinting = printingsForResponse.find((card) => card.id === originalCard.id) ?? cloneCardForResponse(originalCard);

  if (summary.faces && summary.faces.length >= 2) {
    const firstFace = summary.faces[0];
    console.log('Creating double-sided card item with flip capability');
    const faceItem: ResolveItem = {
      line: { ...target.line },
      card: {
        ...summary.card,
        faces: summary.faces
      },
      image: firstFace.image,
      highRes: firstFace.highRes,
      faceName: firstFace.name,
      isSecondaryFace: false,
      allPrintings: printingsForResponse,
      selectedPrinting
    };

    if (!firstFace.image && !faceItem.error) {
      faceItem.error = `No printable image was available for ${firstFace.name}.`;
    }

    console.log('Double-sided card item created with faces:', summary.faces.length);
    return [faceItem];
  }

  target.card = summary.card;
  target.image = summary.image;
  target.highRes = summary.highRes;
  target.allPrintings = printingsForResponse;
  target.selectedPrinting = selectedPrinting;

  if (!summary.image && !target.error) {
    target.error = 'No printable image was available for this card.';
  }

  return [target];
}

function cloneCardForResponse(card: ScryfallCard): ScryfallCard {
  return {
    ...card,
    printed_name: card.printed_name,
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
