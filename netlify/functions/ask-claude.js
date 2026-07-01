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

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: `You are a geopolitics intelligence analyst for GEOSIGHT live dashboard.
Use ONLY the real news articles provided. Do NOT make up facts or dates.
Return ONLY valid JSON with no markdown, no backticks, no preamble whatsoever.`
          },
          {
            role: 'user',
            content: newsContext
              ? `REAL NEWS ARTICLES FETCHED RIGHT NOW:\n\n${newsContext}\n\n${prompt}`
              : prompt
          }
        ]
      })
    });

    const groqData = await groqRes.json();

    if (groqData.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: groqData.error.message })
      };
    }

    if (!groqData.choices?.[0]?.message?.content) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No response from Groq', raw: groqData })
      };
    }

    const text = groqData.choices[0].message.content;

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