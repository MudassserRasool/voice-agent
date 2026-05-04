const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

function readEnvFile(envPath) {
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    const lines = raw.split(/\r?\n/);
    const env = {};
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
      if (m) {
        env[m[1]] = m[2].trim();
      }
    }
    return env;
  } catch (e) {
    return {};
  }
}

function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const envPath = path.join(__dirname, '..', '.env.local');
  const env = readEnvFile(envPath);
  return env.MONGODB_URI || null;
}

(async () => {
  const uri = getMongoUri();
  if (!uri) {
    console.error('No MONGODB_URI found in environment or frontend/.env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri, { connectTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db('voice-agent');
    const col = db.collection('documents');
    const res = await col.insertOne({ test: 'hello-from-script', createdAt: new Date() });
    console.log('Inserted id:', res.insertedId);
  } catch (e) {
    console.error('Insert error:', e.message);
  } finally {
    await client.close();
  }
})();
