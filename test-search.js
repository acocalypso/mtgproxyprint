async function testSearch() {
  try {
    const response = await fetch('http://localhost:3000/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'Lightning Bolt',
        limit: 5
      })
    });
    
    const result = await response.json();
    console.log('Search response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testSearch();