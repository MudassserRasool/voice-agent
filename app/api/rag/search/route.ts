import OpenAI from 'openai';
import clientPromise from '@/lib/rag/mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type SearchDoc = {
  _id: string;
  text: string;
  metadata?: Record<string, unknown>;
  score?: number;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildFallbackPatterns(query: string) {
  const snippet = query.trim().slice(0, 180);
  const tokens = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 5)
    )
  ).slice(0, 8);

  const patterns = [];

  if (snippet.length >= 20) {
    patterns.push({ text: { $regex: escapeRegExp(snippet), $options: 'i' } });
  }

  for (const token of tokens) {
    patterns.push({ text: { $regex: `\\b${escapeRegExp(token)}\\b`, $options: 'i' } });
  }

  return patterns;
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    // 1. Convert query → embedding
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingRes.data[0].embedding;

    // 2. Connect DB
    const client = await clientPromise;
    const db = client.db('voice-agent');

    const collection = db.collection('documents');

    // 3. Vector search (MongoDB Atlas)
    const [vectorResults, keywordResults] = await Promise.all([
      collection
        .aggregate([
          {
            $vectorSearch: {
              index: 'default',
              path: 'embedding',
              queryVector: queryEmbedding,
              numCandidates: 200,
              limit: 10,
            },
          },
          {
            $project: {
              text: 1,
              metadata: 1,
              score: { $meta: 'vectorSearchScore' },
            },
          },
        ])
        .toArray(),

      collection
        .find({
          $text: { $search: query }, // enable Mongo text index
        })
        .limit(10)
        .toArray(),
    ]);

    let results = vectorResults as SearchDoc[];
    let searchType: 'vector' | 'fallback-text' = 'vector';

    if (results.length === 0) {
      const fallbackPatterns = buildFallbackPatterns(query);

      if (fallbackPatterns.length > 0) {
        const fallbackResults = (await collection
          .find({ $or: fallbackPatterns })
          .project({ text: 1, metadata: 1 })
          .limit(5)
          .toArray()) as SearchDoc[];

        if (fallbackResults.length > 0) {
          results = fallbackResults;
          searchType = 'fallback-text';
        }
      }
    }

    // const reranked: { choices: { message: { content: string } }[] } =
    //   await openai.chat.completions.create({
    //     model: 'gpt-4o-mini',
    //     messages: [
    //       {
    //         role: 'system',
    //         content: 'Rank passages by relevance to query. Return JSON array of indices.',
    //       },
    //       {
    //         role: 'user',
    //         content: JSON.stringify({ query, docs: results }),
    //       },
    //     ],
    //   }).choices[0].message.content


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
