async function testImprovedSearch() {
  const testQueries = ['Rattenkolonie', 'Balamb Garden', 'Lightning Bolt'];
  
  for (const query of testQueries) {
    console.log(`\n=== Testing improved search for: ${query} ===`);
    
    // Simulate our improved search logic
    const searchStrategies = [
      `name:"${query}" game:paper`,        
      `"${query}" game:paper`,             
      `${query} lang:any`,                 
      `name:"${query}" lang:any`,          
      `${query} game:paper`                
    ];
    
    let allResults = [];
    
    for (const searchQuery of searchStrategies) {
      const url = new URL('https://api.scryfall.com/cards/search');
      url.searchParams.set('q', searchQuery);
      url.searchParams.set('unique', 'prints');
      url.searchParams.set('order', 'name');
      
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'MTGProxyPrint/0.1',
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          allResults = allResults.concat(data.data);
          
          if ((searchQuery.includes('name:"') || searchQuery.includes(`"${query}"`)) && data.data.length > 0) {
            if (data.data.length >= 5) {
              break;
            }
          }
        }
      }
    }
    
    // Remove duplicates and show results
    const uniqueCards = new Map();
    allResults.forEach(card => {
      if (!uniqueCards.has(card.id)) {
        uniqueCards.set(card.id, card);
      }
    });
    
    console.log(`Found ${uniqueCards.size} unique results:`);
    Array.from(uniqueCards.values()).slice(0, 3).forEach(card => {
      let displayName = card.name;
      if (card.printed_name && card.lang !== 'en') {
        if (card.printed_name.toLowerCase().includes(query.toLowerCase())) {
          displayName = card.printed_name;
        }
      }
      console.log(`- ${displayName} (${card.set}, ${card.lang})`);
    });
  }
}

testImprovedSearch().catch(console.error);