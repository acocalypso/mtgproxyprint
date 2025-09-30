import { Router, type Request, type Response } from 'express';
import { ScryfallClient } from '../scryfall';

interface SearchRequestBody {
  query: string;
  limit?: number;
}

interface SearchResult {
  id: string;
  name: string;
  set: string;
  collector_number: string;
  image: string;
  lang: string;
  fullCard?: any; // Complete card data for double-sided cards
  allPrintings?: any[]; // All available printings of this card
}

const router = Router();

router.post('/search', async (req: Request, res: Response) => {
  const body = req.body as SearchRequestBody;
  
  if (!body?.query || typeof body.query !== 'string' || !body.query.trim()) {
    return res.status(400).json({ message: 'query is required' });
  }

  const query = body.query.trim();
  const limit = Math.min(body.limit || 10, 20); // Max 20 results

  try {
    const client = new ScryfallClient();
    
    // Use multiple search strategies for better results
    const searchStrategies = [
      `name:"${query}" game:paper`,        // Exact English name match first
      `"${query}" game:paper`,             // Quoted search in English
      `${query} lang:any`,                 // Search in all languages (for non-English names)
      `name:"${query}" lang:any`,          // Exact name in any language
      `${query} game:paper`                // Fallback to general search
    ];
    
    let allResults: any[] = [];
    
    for (const searchQuery of searchStrategies) {
      const url = new URL('https://api.scryfall.com/cards/search');
      url.searchParams.set('q', searchQuery);
      url.searchParams.set('unique', 'prints');
      url.searchParams.set('order', 'name');
      url.searchParams.set('page', '1');

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'MTGProxyPrint/0.1 (+https://github.com/mtgproxyprint; contact: dev@mtgproxyprint.local)',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json() as { data: any[] };
        if (data.data && data.data.length > 0) {
          allResults = allResults.concat(data.data);
          
          // If we got good results from exact match (first two strategies), prioritize those
          if ((searchQuery.includes('name:"') || searchQuery.includes(`"${query}"`)) && data.data.length > 0) {
            // But continue searching to get more results if we have few
            if (data.data.length >= 5) {
              break;
            }
          }
        }
      }
    }
    
    // Remove duplicates and fetch all printings for each unique card
    const uniqueCards = new Map<string, any>();
    const cardsByOracleId = new Map<string, any[]>();
    
    allResults.forEach(card => {
      if (!uniqueCards.has(card.id)) {
        uniqueCards.set(card.id, card);
        
        // Group cards by oracle_id to get all printings
        const oracleId = card.oracle_id;
        if (oracleId) {
          if (!cardsByOracleId.has(oracleId)) {
            cardsByOracleId.set(oracleId, []);
          }
          cardsByOracleId.get(oracleId)!.push(card);
        }
      }
    });
    
    // For each unique card, fetch all its printings
    const enrichedCards = await Promise.all(
      Array.from(uniqueCards.values()).slice(0, limit).map(async (card) => {
        let allPrintings = [];
        
        if (card.oracle_id) {
          try {
            // Fetch all printings of this card including all languages
            const printingsUrl = new URL('https://api.scryfall.com/cards/search');
            printingsUrl.searchParams.set('q', `oracleid:${card.oracle_id} game:paper lang:any`);
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
              let fetchedPrintings = printingsData.data || [];
              
              // Make sure the original found card is included in the printings
              // This is important for non-English cards that might not appear in oracle_id searches
              const originalCardExists = fetchedPrintings.some((p: any) => p.id === card.id);
              
              if (!originalCardExists) {
                // Add the original card to the beginning of the list
                allPrintings = [card, ...fetchedPrintings];
              } else {
                allPrintings = fetchedPrintings;
              }
            } else {
              allPrintings = [card]; // Fallback to just this card
            }
          } catch (error) {
            console.error('Failed to fetch printings for card:', card.name, error);
            allPrintings = [card]; // Fallback to just this card
          }
        } else {
          allPrintings = [card]; // No oracle_id, just use this card
        }
        
        return { ...card, allPrintings };
      })
    );
    
    const results: SearchResult[] = enrichedCards
      .map(card => {
        // Handle double-sided cards - clean up the display name
        let displayName = card.name;
        
        // For non-English cards, prefer the printed name if it matches the search query
        if (card.printed_name && card.lang !== 'en') {
          const printedName = card.printed_name;
          // If the printed name contains our search query, use it for display
          if (printedName.toLowerCase().includes(query.toLowerCase())) {
            displayName = printedName;
          }
        }
        
        // If it's a double-sided card (contains //), show just the front face for cleaner display
        if (displayName.includes(' // ')) {
          const faces = displayName.split(' // ');
          displayName = faces[0]; // Use front face name
        }
        
        return {
          id: card.id,
          name: displayName,
          set: card.set.toUpperCase(),
          collector_number: card.collector_number,
          image: card.image_uris?.png || card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.png || card.card_faces?.[0]?.image_uris?.normal || '',
          lang: card.lang,
          fullCard: card, // Include full card data for double-sided cards
          allPrintings: card.allPrintings || [card] // Include all printings
        };
      })
      .filter(result => result.image); // Only include cards with images

    res.json({ results });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

export default router;