import OpenAI from 'openai';
import clientPromise from '@/lib/rag/mongodb';
import { buildFallbackPatterns } from '../../utils/extract';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type SearchDoc = {
  _id: string;
  text: string;
  metadata?: Record<string, unknown>;
  score?: number;
};

class SearchService {
  async search(
    query: string
  ): Promise<{ results: SearchDoc[]; searchType: 'vector' | 'fallback-text' }> {
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

    return { results, searchType };
  }
}

export default new SearchService();
