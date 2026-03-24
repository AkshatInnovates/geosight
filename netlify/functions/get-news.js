 exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { query } = JSON.parse(event.body);

    // Fetch real news from World News API
    const newsRes = await fetch(
      `https://api.worldnewsapi.com/search-news?text=${encodeURIComponent(query)}&number=5&language=en&sort=publish-time&sort-direction=DESC`,
      {
        headers: {
          'x-api-key': process.env.WORLD_NEWS_API_KEY
        }
      }
    );

    const newsData = await newsRes.json();

    if (!newsData.news || newsData.news.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: [] })
      };
    }

    // Format articles
    const articles = newsData.news.map(article => ({
      title: article.title,
      summary: article.text ? article.text.slice(0, 300) : '',
      date: article.publish_date,
      source: article.source_country || 'International',
      url: article.url
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
