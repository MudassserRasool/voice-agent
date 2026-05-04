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

  console.log('Connecting to:', uri.replace(/(mongodb\+srv:\/\/[^:]+):[^@]+@/, '$1:****@'));

  const client = new MongoClient(uri, { connectTimeoutMS: 10000 });
  try {
    await client.connect();
    console.log('Connected.');

    const admin = client.db().admin();
    try {
      const res = await admin.listDatabases();
      console.log('Databases (via admin.listDatabases):');
      for (const dbInfo of res.databases) {
        console.log(`- ${dbInfo.name} (sizeOnDisk: ${dbInfo.sizeOnDisk}, empty: ${dbInfo.empty})`);
        try {
          const db = client.db(dbInfo.name);
          const cols = await db.listCollections().toArray();
          if (cols.length === 0) {
            console.log('  (no collections)');
            continue;
          }
          for (const c of cols) {
            try {
              const count = await db.collection(c.name).countDocuments();
              console.log(`  - ${c.name}: ${count} documents`);
            } catch (e) {
              console.log(`  - ${c.name}: (count failed: ${e.message})`);
            }
          }
        } catch (e) {
          console.log('  (could not list collections:', e.message, ')');
        }
      }
    } catch (err) {
      console.warn('Could not run admin.listDatabases():', err.message);
      console.log('Falling back to checking candidate DBs: voice-agent, mydb, test');
      const candidates = ['voice-agent', 'mydb', 'test'];
      for (const name of candidates) {
        try {
          const db = client.db(name);
          const cols = await db.listCollections().toArray();
          if (cols.length === 0) {
            console.log(`- ${name}: no collections`);
            continue;
          }
          console.log(`- ${name}: collections:`);
          for (const c of cols) {
            try {
              const count = await db.collection(c.name).countDocuments();
              console.log(`  - ${c.name}: ${count} documents`);
            } catch (e) {
              console.log(`  - ${c.name}: (count failed: ${e.message})`);
            }
          }
        } catch (e) {
          console.log(`- ${name}: access error (${e.message})`);
        }
      }
    }
  } catch (e) {
    console.error('Connection error:', e.message);
    process.exitCode = 2;
  } finally {
    await client.close();
    console.log('Disconnected.');
  }
})();
