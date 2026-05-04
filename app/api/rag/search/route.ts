import searchService from './services/searchService';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    const { results, searchType } = await searchService.search(query);

    return Response.json({
      query,
      searchType,
      results, //: reranked.choices[0].message.content,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
