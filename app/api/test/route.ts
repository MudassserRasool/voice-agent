// import clientPromise from '@/lib/mongodb';
import clientPromise from '@/lib/rag/mongodb';

export async function GET() {
  const client = await clientPromise;
  const db = client.db('mydb');

  const data = await db.collection('test').find({}).toArray();

  return Response.json({ data });
}
