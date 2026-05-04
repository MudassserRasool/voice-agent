import OpenAI from 'openai';
import clientPromise from '@/lib/rag/mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { text, source } = await req.json();

    if (!text) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    // 1. create embedding
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    const embedding = embeddingRes.data[0].embedding;

    // 2. store in MongoDB
    const client = await clientPromise;
    const db = client.db('mydb');

    const result = await db.collection('documents').insertOne({
      text,
      embedding,
      metadata: {
        source: source || 'manual',
        createdAt: new Date(),
      },
    });

    return Response.json({
      insertedId: result.insertedId,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
