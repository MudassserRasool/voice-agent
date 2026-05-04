import OpenAI from 'openai';
import clientPromise from '@/lib/rag/mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
    const results = await collection
      .aggregate([
        {
          $vectorSearch: {
            index: 'default', // your index name
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: 5,
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
      .toArray();

    return Response.json({
      query,
      results,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
