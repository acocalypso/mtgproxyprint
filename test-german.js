async function testGermanCard() {
  try {
    const response = await fetch('http://localhost:3000/api/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        decklist: '1 Rattenkolonie (DOM) 101',
        lang: 'de'
      })
    });
    
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testGermanCard();