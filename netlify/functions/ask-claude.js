const https = require('https');

function fetchRSS(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', () => resolve(''));
    }).on('error', () => resolve(''));
  });
}

function parseRSS(xml) {
  const items = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  itemMatches.slice(0, 5).forEach(item => {
    const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                   item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
    const desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
                  item.match(/<description>(.*?)<\/description>/) || [])[1] || '';
    const date = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
    if (title) items.push({ title, desc: desc.replace(/<[^>]*>/g, '').slice(0, 200), date });
  });
  return items;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { type, prompt } = JSON.parse(event.body);

    let newsContext = '';

    if (type === 'overview' || type === 'wars') {
      // Fetch from multiple free RSS feeds simultaneously
      const feeds = type === 'wars' ? [
  'https://feeds.bbci.co.uk/news/world/europe/rss.xml',
  'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
  'https://www.aljazeera.com/xml/rss/all.xml',
  'https://rss.dw.com/rdf/rss-en-world',
] : [
  'https://feeds.bbci.co.uk/news/world/rss.xml',
  'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
  'https://www.aljazeera.com/xml/rss/all.xml',
  'https://rss.dw.com/rdf/rss-en-world',
];

      const rssResults = await Promise.all(feeds.map(fetchRSS));
      const allArticles = [];

      rssResults.forEach(xml => {
        if (xml) {
          const items = parseRSS(xml);
          allArticles.push(...items);
        }
      });

      if (allArticles.length > 0) {
        newsContext = allArticles.slice(0, 12).map(a =>
          `TITLE: ${a.title}\nDATE: ${a.date}\nSUMMARY: ${a.desc}`
        ).join('\n---\n');
      }
    }

    // Build efficient prompt
    let finalPrompt = '';

    if (type === 'overview') {
      finalPrompt = newsContext
        ? `Based on these REAL fresh news articles from today:\n${newsContext}\n\nReturn JSON array of 6 geopolitical highlights. Focus on war and conflict news. Each: {"id":number,"headline":"max 10 words","region":"country","category":"WAR|DIPLOMACY|SANCTIONS|CRISIS|ELECTION","severity":"HIGH|MEDIUM|LOW","summary":"2 sentences based on real news","casualty":"if mentioned else empty","since":"date from article"}`
        : `Return JSON array of 6 current geopolitical highlights about Russia-Ukraine, Iran-Israel, and other conflicts. Each: {"id":number,"headline":"max 10 words","region":"country","category":"WAR|DIPLOMACY|SANCTIONS|CRISIS|ELECTION","severity":"HIGH|MEDIUM|LOW","summary":"2 sentences","casualty":"","since":""}`;

    } else if (type === 'wars') {
      finalPrompt = newsContext
        ? `Based on these REAL fresh news articles from today:\n${newsContext}\n\nReturn JSON array of 2 war briefings for: 1. Russia-Ukraine war 2. Iran-Israel-USA tensions. Each: {"name":"war name","location":"places","status":"CRITICAL|HIGH|MEDIUM","parties":"vs","duration":"Since X","overview":"2 sentences","latest":"2 sentences from the real news articles","frontlines":"cities from news","casualties":"estimate","international":"countries","outlook":"ESCALATING|DE-ESCALATING|STALEMATED"}`
        : `Return JSON array of 2 detailed war briefings: 1. Russia-Ukraine 2. Iran-Israel-USA. Each: {"name":"war name","location":"places","status":"CRITICAL|HIGH|MEDIUM","parties":"vs","duration":"Since X","overview":"2 sentences","latest":"2 sentences","frontlines":"cities","casualties":"estimate","international":"countries","outlook":"ESCALATING|DE-ESCALATING|STALEMATED"}`;

    } else {
      finalPrompt = prompt;
    }

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