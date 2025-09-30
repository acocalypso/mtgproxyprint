async function testBetterSearch() {
  // Try different search strategies
  const searches = [
    'name:"Balamb Garden" game:paper',  // Exact name match
    '"Balamb Garden, SeeD Academy" game:paper',  // Full exact name
    'Balamb Garden game:paper',  // Current approach
    'name:/Balamb.*Garden/ game:paper'  // Regex approach
  ];
  
  for (const query of searches) {
    console.log('\n=== Testing query:', query, '===');
    const url = new URL('https://api.scryfall.com/cards/search');
    url.searchParams.set('q', query);
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
      console.log('Results found:', data.data?.length || 0);
      data.data?.slice(0, 3).forEach(card => console.log('- ' + card.name));
    } else {
      console.log('Status:', response.status);
    }
  }
}

testBetterSearch().catch(console.error);