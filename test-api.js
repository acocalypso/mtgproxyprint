async function testSearch() {
  try {
    console.log('Testing search for "Llanowarelfen" (German)...');
    const response = await fetch('http://localhost:3000/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Llanowarelfen', limit: 10 })
    });
    
    const data = await response.json();
    
    if (data.length > 0) {
      const firstResult = data[0];
      console.log('First result:');
      console.log('- Name:', firstResult.name);
      console.log('- Lang:', firstResult.lang);
      console.log('- Set:', firstResult.set);
      console.log('- ID:', firstResult.id);
      console.log('- Oracle ID:', firstResult.fullCard?.oracle_id);
      console.log('- All printings count:', firstResult.allPrintings?.length || 0);
      
      if (firstResult.allPrintings?.length > 0) {
        console.log('\nAll printings:');
        firstResult.allPrintings.forEach((printing, index) => {
          if (index < 10) { // Show first 10 only
            console.log(`  ${index + 1}. ${printing.name} - ${printing.set_name} (${printing.set.toUpperCase()}) #${printing.collector_number} - Lang: ${printing.lang}`);
          }
        });
        
        // Check how many German printings there are
        const germanPrintings = firstResult.allPrintings.filter(p => p.lang === 'de');
        console.log(`\nGerman printings: ${germanPrintings.length} out of ${firstResult.allPrintings.length} total`);
        
        if (germanPrintings.length > 0) {
          console.log('German printings:');
          germanPrintings.forEach((printing, index) => {
            console.log(`  ${index + 1}. ${printing.set_name} (${printing.set.toUpperCase()}) #${printing.collector_number}`);
          });
        }
      }
    }
  } catch (error) {
    console.error('Error testing search:', error.message);
  }
}

testSearch();