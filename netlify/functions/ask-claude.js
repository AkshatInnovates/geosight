exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { type, prompt } = JSON.parse(event.body);

    let newsContext = '';

    // Fetch real news based on type
    if (type === 'overview') {
      const [ukraineRes, iranRes, worldRes] = await Promise.all([
        fetch(`https://gnews.io/api/v4/search?q=Russia+Ukraine+war&lang=en&max=3&sortby=publishedAt&token=${process.env.GNEWS_API_KEY}`),
        fetch(`https://gnews.io/api/v4/search?q=Iran+Israel+USA+war&lang=en&max=3&sortby=publishedAt&token=${process.env.GNEWS_API_KEY}`),
        fetch(`https://gnews.io/api/v4/search?q=war+conflict+geopolitics&lang=en&max=4&sortby=publishedAt&token=${process.env.GNEWS_API_KEY}`)
      ]);

      const [ukraineData, iranData, worldData] = await Promise.all([
        ukraineRes.json(),
        iranRes.json(),
        worldRes.json()
      ]);

      const allArticles = [
        ...(ukraineData.articles || []),
        ...(iranData.articles || []),
        ...(worldData.articles || [])
      ];

      newsContext = allArticles.map(a =>
        `TITLE: ${a.title}\nDATE: ${a.publishedAt}\nDESCRIPTION: ${a.description || ''}\nSOURCE: ${a.source?.name || ''}`
      ).join('\n\n---\n\n');

    } else if (type === 'wars') {
      const [ukraineRes, iranRes] = await Promise.all([
        fetch(`https://gnews.io/api/v4/search?q=Russia+Ukraine+war+missile+attack&lang=en&max=5&sortby=publishedAt&token=${process.env.GNEWS_API_KEY}`),
        fetch(`https://gnews.io/api/v4/search?q=Iran+Israel+USA+military+strike&lang=en&max=5&sortby=publishedAt&token=${process.env.GNEWS_API_KEY}`)
      ]);

      const [ukraineData, iranData] = await Promise.all([
        ukraineRes.json(),
        iranRes.json()
      ]);

      const ukraineArticles = (ukraineData.articles || []).map(a =>
        `TITLE: ${a.title}\nDATE: ${a.publishedAt}\nDESCRIPTION: ${a.description || ''}`
      ).join('\n\n');

      const iranArticles = (iranData.articles || []).map(a =>
        `TITLE: ${a.title}\nDATE: ${a.publishedAt}\nDESCRIPTION: ${a.description || ''}`
      ).join('\n\n');

      newsContext = `UKRAINE-RUSSIA NEWS:\n${ukraineArticles}\n\nIRAN-ISRAEL-USA NEWS:\n${iranArticles}`;
    }

    // Now send to Groq with real news context
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `You are a geopolitics intelligence analyst for GEOSIGHT dashboard.
You will be given REAL news articles. Use ONLY the information from these articles.
Do NOT make up any facts, dates, or events not mentioned in the articles.
Return ONLY valid JSON with no markdown, no backticks, no preamble.`
          },
          {
            role: 'user',
            content: `REAL NEWS ARTICLES FETCHED RIGHT NOW:\n\n${newsContext}\n\n${prompt}`
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

    if (!groqData.choices || !groqData.choices[0] || !groqData.choices[0].message) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Invalid response from Groq' })
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