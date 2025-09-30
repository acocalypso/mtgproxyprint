async function testEnglishCard() {
  try {
    const response = await fetch('http://localhost:3000/api/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        decklist: '1 Lightning Bolt (2XM) 123'
      })
    });
    
    const result = await response.json();
    console.log('English card response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testEnglishCard();