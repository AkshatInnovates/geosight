exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt } = JSON.parse(event.body);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: `You are a geopolitics intelligence briefing system for GEOSIGHT. Today: ${new Date().toDateString()}. Return ONLY valid JSON with no markdown, no backticks, no preamble. Be concise and factual.`
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    // Log for debugging
    console.log('Groq response:', JSON.stringify(data));

    // Check for errors from Groq
    if (data.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error.message })
      };
    }

    // Check response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Invalid response from Groq', raw: data })
      };
    }

    const text = data.choices[0].message.content;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ text }] })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
```

---

Then push to GitHub in the terminal:
```
git add .
```
```
git commit -m "fix groq error handling"
```
```
git push