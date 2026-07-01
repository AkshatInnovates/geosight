exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { type, prompt } = JSON.parse(event.body);

    let newsContext = '';

    if (type === 'overview') {
      const [r1, r2, r3] = await Promise.all([
        fetch(`https://gnews.io/api/v4/search?q=Russia+Ukraine+war&lang=en&max=3&sortby=publishedAt&token=${process.env.GNEWS_API_KEY}`),
        fetch(`https://gnews.io/api/v4/search?q=Iran+Israel+USA+military&lang=en&max=3&sortby=publishedAt&token=${process.env.GNEWS_API_KEY}`),
        fetch(`https://gnews.io/api/v4/search?q=war+conflict+geopolitics&lang=en&max=3&sortby=publishedAt&token=${process.env.GNEWS_API_KEY}`)
      ]);

      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);

      const all = [
        ...(d1.articles || []),
        ...(d2.articles || []),
        ...(d3.articles || [])
      ];

      newsContext = all.map(a =>
        `TITLE: ${a.title}\nDATE: ${a.publishedAt}\nDESCRIPTION: ${a.description || 'N/A'}`
      ).join('\n\n---\n\n');

    } else if (type === 'wars') {
      const [r1, r2] = await Promise.all([
        fetch(`https://gnews.io/api/v4/search?q=Russia+Ukraine+war+missile+frontline&lang=en&max=5&sortby=publishedAt&token=${process.env.GNEWS_API_KEY}`),
        fetch(`https://gnews.io/api/v4/search?q=Iran+Israel+USA+strike+military&lang=en&max=5&sortby=publishedAt&token=${process.env.GNEWS_API_KEY}`)
      ]);

      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);

      const ukraine = (d1.articles || []).map(a =>
        `TITLE: ${a.title}\nDATE: ${a.publishedAt}\nDESCRIPTION: ${a.description || 'N/A'}`
      ).join('\n\n');

      const iran = (d2.articles || []).map(a =>
        `TITLE: ${a.title}\nDATE: ${a.publishedAt}\nDESCRIPTION: ${a.description || 'N/A'}`
      ).join('\n\n');

      newsContext = `=== RUSSIA-UKRAINE NEWS ===\n${ukraine}\n\n=== IRAN-ISRAEL-USA NEWS ===\n${iran}`;
    }

    // Build the full message
    const fullPrompt = newsContext
      ? `REAL NEWS ARTICLES FETCHED RIGHT NOW:\n\n${newsContext}\n\n${prompt}`
      : prompt;

    // Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a geopolitics intelligence analyst for GEOSIGHT live dashboard.
Use ONLY the real news articles provided. Do NOT make up facts or dates.
Return ONLY valid JSON with no markdown, no backticks, no preamble whatsoever.

${fullPrompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000
          }
        })
      }
    );

    const geminiData = await geminiRes.json();

    if (geminiData.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: geminiData.error.message })
      };
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No response from Gemini', raw: geminiData })
      };
    }

    // Clean any accidental backticks
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ text: cleaned }] })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};