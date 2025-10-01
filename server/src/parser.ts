const PRIMARY_PATTERN = /^(\d+)x?\s+(.+?)\s+\(([^)]+)\)\s+([^\s*]+)(?:\s+\*F\*)?$/i;
const FALLBACK_PATTERN = /^(\d+)x?\s+(.+)$/i;

export interface ParsedLine {
  original: string;
  qty: number;
  name: string;
  set?: string;
  collector?: string;
  foil?: boolean;
  parseError?: string;
}

export function parseDecklist(input: string): ParsedLine[] {
  if (typeof input !== 'string') {
    return [];
  }

  const lines = input.split(/\r?\n/);
  const parsed: ParsedLine[] = [];

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }

    const sanitized = sanitizeDecklistLine(trimmed);

    const primaryMatch = PRIMARY_PATTERN.exec(sanitized);
    if (primaryMatch) {
      const qty = Number(primaryMatch[1]);
      const name = primaryMatch[2].trim();
      const set = primaryMatch[3].trim();
      const collector = primaryMatch[4].trim();
      const foil = /\*F\*/i.test(trimmed);

      if (!Number.isNaN(qty) && qty > 0 && name) {
        parsed.push({
          original: raw,
          qty,
          name,
          set,
          collector,
          foil
        });
        continue;
      }
    }

    const fallbackMatch = FALLBACK_PATTERN.exec(sanitized);
    if (fallbackMatch) {
      const qty = Number(fallbackMatch[1]);
      const name = fallbackMatch[2].trim();

      if (!Number.isNaN(qty) && qty > 0 && name) {
        parsed.push({
          original: raw,
          qty,
          name
        });
        continue;
      }
    }

    parsed.push({
      original: raw,
      qty: 0,
      name: trimmed,
      parseError: 'Unable to parse decklist line. Expected format like "3 Lightning Bolt (2XM) 123".'
    });
  }

  return parsed;
}

function sanitizeDecklistLine(line: string): string {
  let working = line;

  // Remove Archidekt-style tags in square brackets (may include braces/commas inside)
  working = working.replace(/\s*\[[^\]]*\]/g, '');

  // Remove caret-delimited annotations such as ^Proxy MPC,#0d97fa^
  working = working.replace(/\s*\^[^^]*\^/g, '');

  // Collapse multiple spaces created by removals
  working = working.replace(/\s{2,}/g, ' ');

  return working.trim();
}
