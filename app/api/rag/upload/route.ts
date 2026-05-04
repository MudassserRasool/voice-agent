import OpenAI from 'openai';
import clientPromise from '@/lib/rag/mongodb';
import { chunkText } from '../utils/chunk';
import { extractPDFText } from '../utils/extract';

// const pdf = pdfParse;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// simple chunking (important for RAG)

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 1. convert file → buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 2. extract text from PDF
    const text = await extractPDFText(buffer);

    // 3. chunk text
    const chunks = chunkText(text);

    const client = await clientPromise;
    const db = client.db('voice-agent');

    const collection = db.collection('documents');

    // 4. process each chunk
    const inserted = [];

    for (const chunk of chunks) {
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
      });

      const embedding = embeddingRes.data[0].embedding;

      const result = await collection.insertOne({
        text: chunk,
        embedding,
        metadata: {
          fileName: file.name,
          createdAt: new Date(),
          chunkSize: chunk.length,
        },
      });

      inserted.push(result.insertedId);
    }

    return Response.json({
      message: 'PDF processed successfully',
      chunks: chunks.length,
      inserted,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
