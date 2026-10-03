const crypto = require('crypto');
const { CohereClient } = require('cohere-ai');
const { Pinecone } = require("@pinecone-database/pinecone");
require('dotenv').config();
const natural = require('natural');

const apiKeyPC = process.env.PC_API_KEY;
const indexName = 'ampleforth';
const namespaceName = 'example-namespace';
const embeddingModel = 'multilingual-e5-large';

const pc = new Pinecone({
  apiKey: apiKeyPC
});

const cohere = new CohereClient({ apiKey: process.env.CO_API_KEY });
const index = pc.Index(indexName);
const namespace = index.namespace(namespaceName);

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 24);
}

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function chunkText(inputText, chunkSize) {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(inputText);

  if (!Array.isArray(tokens) || tokens.length === 0) {
    return [];
  }

  const overlap = 25;
  const chunks = [];

  for (let i = 0; i < tokens.length; i += (chunkSize - overlap)) {
    chunks.push(tokens.slice(i, i + chunkSize).join(' '));
  }

  return chunks;
}

function buildChunkRecords(data, chunkSize) {
  const records = [];

  data.forEach((item, documentIndex) => {
    const documentText = normalizeText(item.text);

    if (!documentText) {
      return;
    }

    const documentHash = hashText(documentText);
    const chunks = chunkText(documentText, chunkSize);

    chunks.forEach((chunk, chunkIndex) => {
      const chunkHash = hashText(chunk);

      records.push({
        id: `doc-${documentHash}-chunk-${chunkIndex}-${chunkHash}`,
        text: chunk,
        metadata: {
          text: chunk,
          documentHash,
          documentIndex,
          chunkIndex,
          chunkHash
        }
      });
    });
  });

  return records;
}

function createBatches(records, maxTokensPerRequest, maxBatchSizeBytes) {
  let currentBatch = [];
  let currentBatchTokenCount = 0;
  let currentBatchByteSize = 0;
  const batches = [];

  records.forEach((record) => {
    const chunkTokenCount = record.text.split(' ').length;
    const chunkByteSize = Buffer.byteLength(record.text, 'utf8');
    const wouldExceedBatch =
      currentBatch.length > 0 &&
      (
        currentBatchTokenCount + chunkTokenCount > maxTokensPerRequest ||
        currentBatchByteSize + chunkByteSize > maxBatchSizeBytes
      );

    if (wouldExceedBatch) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchTokenCount = 0;
      currentBatchByteSize = 0;
    }

    currentBatch.push(record);
    currentBatchTokenCount += chunkTokenCount;
    currentBatchByteSize += chunkByteSize;
  });

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

async function getExistingIds(ids) {
  const existingIds = new Set();
  const fetchBatchSize = 100;

  for (let i = 0; i < ids.length; i += fetchBatchSize) {
    const idBatch = ids.slice(i, i + fetchBatchSize);
    const response = await namespace.fetch(idBatch);

    Object.keys(response.records || {}).forEach((id) => {
      existingIds.add(id);
    });
  }

  return existingIds;
}

async function generateVectors(data, onProgress) {
  const maxTokensPerRequest = 96;
  const maxBatchSizeBytes = 4194304;
  const chunkSize = 70;

  if (!Array.isArray(data)) {
    throw new Error('generateVectors expected an array of { text } items.');
  }

  console.log(`generateVectors received ${data.length} document(s).`);

  const chunkRecords = buildChunkRecords(data, chunkSize);
  console.log(`Prepared ${chunkRecords.length} stable chunk id(s).`);

  if (chunkRecords.length === 0) {
    return { totalChunks: 0, skippedExisting: 0, embedded: 0, upserted: 0 };
  }

  const existingIds = await getExistingIds(chunkRecords.map(record => record.id));
  const newChunkRecords = chunkRecords.filter(record => !existingIds.has(record.id));

  console.log(`Skipping ${existingIds.size} existing chunk(s). Embedding ${newChunkRecords.length} new chunk(s).`);

  if (newChunkRecords.length === 0) {
    return {
      totalChunks: chunkRecords.length,
      skippedExisting: existingIds.size,
      embedded: 0,
      upserted: 0
    };
  }

  const embeddings = [];
  const batches = createBatches(newChunkRecords, maxTokensPerRequest, maxBatchSizeBytes);
  const totalBatches = batches.length;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchText = batch.map(record => record.text);

    console.log(`Embedding batch ${i + 1}/${totalBatches} (${batch.length} chunk(s)).`);

    const batchEmbeddings = await pc.inference.embed(
      embeddingModel,
      batchText,
      { inputType: 'passage', truncate: 'NONE' }
    );

    batch.forEach((record, recordIndex) => {
      embeddings.push({
        id: record.id,
        values: batchEmbeddings[recordIndex].values,
        metadata: record.metadata
      });
    });

    if (onProgress) {
      onProgress({
        phase: 'embedding',
        currentBatch: i + 1,
        totalBatches,
        percent: Math.round(((i + 1) / totalBatches) * 100)
      });
    }
  }

  for (let i = 0; i < embeddings.length; i += 100) {
    const currentEmbed = embeddings.slice(i, i + 100);
    console.log(`Upserting vectors ${i + 1}-${i + currentEmbed.length} of ${embeddings.length}.`);
    await namespace.upsert(currentEmbed);
  }

  const stats = await index.describeIndexStats();
  console.log("Index stats after incremental upsert:", stats);

  return {
    totalChunks: chunkRecords.length,
    skippedExisting: existingIds.size,
    embedded: embeddings.length,
    upserted: embeddings.length
  };
}

async function searchTheIndex(query) {
  const modelMaxTokens = 8192;

  function countTokens(text) {
    return text.split(/\s+/).length;
  }

  console.log("Embedding query.");

  const queryEmbedding = await pc.inference.embed(
    embeddingModel,
    query,
    { inputType: 'query' }
  );

  console.log("Querying Pinecone.");

  const queryResponse = await namespace.query({
    topK: 100,
    vector: queryEmbedding[0].values,
    includeValues: false,
    includeMetadata: true
  });

  const matches = queryResponse.matches || [];
  console.log(`Retrieved ${matches.length} match(es).`);

  const relevantTexts = matches.map(match => match.metadata.text).join("\n");
  const prompt = `Given the following context, answer the question at the end. Reference named scholars if you've used their work:\n${relevantTexts}\nQuestion: ${query}`;
  const inputTokens = countTokens(prompt);
  const availableTokensForOutput = modelMaxTokens - inputTokens;

  console.log(`Calling Cohere with ${inputTokens} input token(s).`);

  const response = await cohere.chat({
    model: 'command-r7b-12-2024',
    message: prompt,
    max_tokens: availableTokensForOutput
  });

  console.log('Generated Answer:', response.text);
  return response;
}


   


module.exports = { generateVectors, searchTheIndex };
