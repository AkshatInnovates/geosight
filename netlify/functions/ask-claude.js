exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { type, prompt } = JSON.parse(event.body);

    let newsContext = '';

    // Fetch real news — only 1 request per call to save quota
    if (type === 'overview' || type === 'wars') {
      const today = new Date().toISOString().slice(0, 10);
      const query = type === 'wars'
       ? 'Russia Ukraine attack missile frontline'
       : 'Russia Ukraine Iran Israel war attack';

      try {
        const newsRes = await fetch(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&from=${today}&apiKey=${process.env.NEWS_API_KEY}`
        );
        const newsData = await newsRes.json();
        const articles = newsData.articles || [];

        if (articles.length > 0) {
          newsContext = articles.map(a =>
            `TITLE: ${a.title}\nDATE: ${a.publishedAt?.slice(0, 10)}\nSUMMARY: ${a.description || 'N/A'}`
          ).join('\n---\n');
        }
      } catch (newsErr) {
        console.log('News fetch failed, using AI knowledge:', newsErr.message);
      }
    }

    // Build short efficient prompt to save Groq tokens
    let finalPrompt = '';

    if (type === 'overview') {
      finalPrompt = newsContext
        ? `Based on these real news articles:\n${newsContext}\n\nReturn JSON array of 6 geopolitical highlights. Each: {"id":number,"headline":"max 10 words","region":"country","category":"WAR|DIPLOMACY|SANCTIONS|CRISIS|ELECTION","severity":"HIGH|MEDIUM|LOW","summary":"2 sentences max","casualty":"if mentioned else empty","since":"date from article"}`
        : `Return JSON array of 6 current geopolitical highlights focusing on Russia-Ukraine, Iran-Israel, and other conflicts. Each: {"id":number,"headline":"max 10 words","region":"country","category":"WAR|DIPLOMACY|SANCTIONS|CRISIS|ELECTION","severity":"HIGH|MEDIUM|LOW","summary":"2 sentences","casualty":"","since":""}`;

    } else if (type === 'wars') {
      finalPrompt = newsContext
        ? `Based on these real news articles:\n${newsContext}\n\nReturn JSON array of 2 war briefings for Russia-Ukraine and Iran-Israel-USA. Each: {"name":"war name","location":"places","status":"CRITICAL|HIGH|MEDIUM","parties":"vs","duration":"Since X","overview":"2 sentences","latest":"2 sentences from news","frontlines":"cities","casualties":"estimate","international":"countries involved","outlook":"ESCALATING|DE-ESCALATING|STALEMATED"}`
        : `Return JSON array of 2 detailed war briefings: 1. Russia-Ukraine war 2. Iran-Israel-USA tensions. Each: {"name":"war name","location":"places","status":"CRITICAL|HIGH|MEDIUM","parties":"vs","duration":"Since X","overview":"2 sentences","latest":"2 sentences","frontlines":"cities","casualties":"estimate","international":"countries","outlook":"ESCALATING|DE-ESCALATING|STALEMATED"}`;

    } else {
      finalPrompt = prompt;
    }

    // Call Groq with smallest efficient model
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'You are a geopolitics analyst. Return ONLY valid JSON. No markdown, no backticks, no extra text.'
          },
          {
            role: 'user',
            content: finalPrompt
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

    const text = groqData.choices?.[0]?.message?.content;

    if (!text) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No response from Groq' })
      };
    }

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