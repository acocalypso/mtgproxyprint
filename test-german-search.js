async function testGermanSearch() {
  const searches = [
    'Rat Colony lang:de game:paper',
    'Rat Colony lang:german game:paper', 
    'Rattenkolonie lang:any',
    'name:Rattenkolonie lang:de',
    'printed_name:Rattenkolonie'
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
      if (data.data && data.data.length > 0) {
        data.data.slice(0, 3).forEach(card => {
          console.log('- ' + card.name + ' (' + card.set + ', ' + card.lang + ')');
          if (card.printed_name) {
            console.log('  Printed as: ' + card.printed_name);
          }
        });
      }
    } else {
      console.log('Status:', response.status);
      if (response.status === 404) {
        console.log('No results found');
      }
    }
  }
}

testGermanSearch().catch(console.error);