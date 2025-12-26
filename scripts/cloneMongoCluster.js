'use strict';

const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

// Load env vars from default .env then allow .env.migration to override
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.migration'), override: true });

const SOURCE_URI = process.env.SOURCE_MONGO_URI || process.env.MONGO_URI;
const TARGET_URI = process.env.TARGET_MONGO_URI || process.env.NEW_MONGO_URI;

if (!SOURCE_URI || !TARGET_URI) {
  console.error('SOURCE_MONGO_URI و TARGET_MONGO_URI لازم يكونوا متوفرين في الـ env');
  process.exit(1);
}

const SYSTEM_DATABASES = new Set(['admin', 'local', 'config']);
const BATCH_SIZE = 1000;

async function copyCollection({ sourceDb, targetDb, collName }) {
  const sourceColl = sourceDb.collection(collName);
  const targetColl = targetDb.collection(collName);

  // Drop existing collection on target to keep run idempotent
  try {
    await targetColl.drop();
  } catch (err) {
    if (err.codeName !== 'NamespaceNotFound') {
      throw err;
    }
  }

  const cursor = sourceColl.find({}, { batchSize: BATCH_SIZE });
  const buffer = [];

  for await (const doc of cursor) {
    buffer.push(doc);
    if (buffer.length >= BATCH_SIZE) {
      await targetColl.insertMany(buffer, { ordered: false });
      buffer.length = 0;
    }
  }

  if (buffer.length) {
    await targetColl.insertMany(buffer, { ordered: false });
  }

  const indexes = await sourceColl.indexes();
  const secondaryIndexes = indexes.filter((idx) => idx.name !== '_id_');

  for (const idx of secondaryIndexes) {
    const { key, name, unique, sparse, expireAfterSeconds, partialFilterExpression } = idx;

    // Clean null/undefined fields; MongoDB rejects null sparse/unique
    const options = { name, unique, sparse, expireAfterSeconds, partialFilterExpression };
    Object.keys(options).forEach((k) => {
      if (options[k] === null || options[k] === undefined) delete options[k];
    });

    await targetColl.createIndex(key, options);
  }
}

async function cloneDatabase({ dbName, sourceClient, targetClient }) {
  const sourceDb = sourceClient.db(dbName);
  const targetDb = targetClient.db(dbName);

  // Keep target clean before copy
  await targetDb.dropDatabase();

  const collections = await sourceDb.listCollections().toArray();
  for (const { name: collName } of collections) {
    console.log(`Copying ${dbName}.${collName} ...`);
    await copyCollection({ sourceDb, targetDb, collName });
  }
}

async function main() {
  const sourceClient = new MongoClient(SOURCE_URI, { maxPoolSize: 10 });
  const targetClient = new MongoClient(TARGET_URI, { maxPoolSize: 10 });

  try {
    await sourceClient.connect();
    await targetClient.connect();

    const admin = sourceClient.db().admin();
    const { databases } = await admin.listDatabases();
    const dbNames = databases
      .map((db) => db.name)
      .filter((name) => !SYSTEM_DATABASES.has(name));

    if (!dbNames.length) {
      console.log('مفيش قواعد بيانات قابلة للنسخ');
      return;
    }

    for (const dbName of dbNames) {
      console.log(`\n===== Copying DB: ${dbName} =====`);
      await cloneDatabase({ dbName, sourceClient, targetClient });
    }

    console.log('\nتم النسخ بنجاح من غير ما نمس المصدر');
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

main().catch((err) => {
  console.error('حصل خطأ أثناء النسخ:', err);
  process.exit(1);
});
