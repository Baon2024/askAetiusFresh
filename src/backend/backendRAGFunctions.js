const { CohereClient } = require('cohere-ai');
const { Pinecone, PineconeClient } = require("@pinecone-database/pinecone");
const OpenAI = require("openai");
const apiKey = process.env.OPENAI_API_KEY;
const apiKeyPC = process.env.PC_API_KEY
require('dotenv').config();
const natural = require('natural');

const pc = new Pinecone({
    apiKey: apiKeyPC
  });

  const cohere = new CohereClient({ apiKey: process.env.CO_API_KEY });

  const openai = new OpenAI({
    apiKey: apiKey  // Replace with your OpenAI API key
  });

  const indexName = 'phd4';

index = pc.Index(indexName);





async function generateVectors(data) {

    // Convert the text into numerical vectors that Pinecone can index
const model = 'multilingual-e5-large';


console.log("this is what data looks like:", data);

/*const embeddings = await pc.inference.embed(
  model,
  data.map(d => d.text),
  { inputType: 'passage', truncate: 'END' }
);

console.log(embeddings);

const records = data.map((d, i) => ({
    id: d.id,
    values: embeddings[i].values,
    metadata: { text: d.text }
  }));
  
  // Upsert the vectors into the index
  await index.namespace('example-namespace').upsert(records);

  const stats = await index.describeIndexStats();

  console.log("these are the stats:", stats);*/

  //////UPDATED BATCH VERSPON TO REMOVE SIZE CONTRAINT
  function tokenizeAndChunk(inputText, chunkSize) {
    // Tokenize inputText using tokenize-text (basic word-level tokenization)
    console.log("inputText i:", inputText);
    
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(inputText);

    console.log("tokens after tokenisation are:", tokens);
    
    if (!Array.isArray(tokens)) {
        console.error("Expected tokens to be an array, but got:", tokens);
        return [];
    }


    // Create chunks by grouping tokens
    const chunks = [];
    for (let i = 0; i < tokens.length; i += chunkSize) {
        chunks.push(tokens.slice(i, i + chunkSize).join(' '));  // Join the tokens back into a string
    }
    
    return chunks;
}


  const maxTokensPerRequest = 96;  // Pinecone token limit per request
  const maxBatchSizeBytes = 4194304;  // 4MB max size in bytes
  const chunkSize = 70;  // Define the chunk size for tokenization (adjust as needed)

  // Prepare embeddings
  const embeddings = [];

  // Helper function to create batches with token and byte size checks
  function createBatches(data, maxTokensPerRequest, maxBatchSizeBytes) {
      let currentBatch = [];
      let currentBatchTokenCount = 0;
      let currentBatchByteSize = 0;
      const batches = [];

      for (let i = 0; i < data.length; i++) {
          const text = data[i].text;
          const textTokens = tokenizeAndChunk(text, chunkSize);  // Tokenize into smaller chunks

          textTokens.forEach((chunk) => {
              const chunkTokenCount = chunk.split(' ').length;  // Count tokens in this chunk
              const chunkByteSize = Buffer.byteLength(chunk, 'utf8');  // Get byte size of the chunk

              // Logging each chunk's token count and byte size
              console.log(`Processing chunk ${i}, Token Count: ${chunkTokenCount}, Byte Size: ${chunkByteSize}`);

              // Check if adding this chunk exceeds the max token count or byte size
              if (currentBatchTokenCount + chunkTokenCount <= maxTokensPerRequest && currentBatchByteSize + chunkByteSize <= maxBatchSizeBytes) {
                  currentBatch.push({ text: chunk, id: data[i].id });
                  currentBatchTokenCount += chunkTokenCount;
                  currentBatchByteSize += chunkByteSize;
              } else {
                  // If the batch exceeds limits, push the current batch and start a new one
                  batches.push(currentBatch);
                  console.log(`Batch pushed with ${currentBatch.length} chunks. Batch Token Count: ${currentBatchTokenCount}, Batch Byte Size: ${currentBatchByteSize}`);
                  currentBatch = [{ text: chunk, id: data[i].id }];
                  currentBatchTokenCount = chunkTokenCount;
                  currentBatchByteSize = chunkByteSize;
              }
          });
      }

      // Add the last batch if there are any remaining chunks
      if (currentBatch.length > 0) {
          batches.push(currentBatch);
          console.log(`Final batch pushed with ${currentBatch.length} chunks. Batch Token Count: ${currentBatchTokenCount}, Batch Byte Size: ${currentBatchByteSize}`);
      }

      return batches;
  }

  // Split the data into batches, ensuring we don't exceed Pinecone limits
  const batches = createBatches(data, maxTokensPerRequest, maxBatchSizeBytes);


     // Process each batch
  try {
      for (const batch of batches) {
          const batchText = batch.map(chunk => chunk.text);  // Get all texts in the batch

          // Logging the batch size and the number of chunks before making the embedding request
          console.log(`Processing batch with ${batch.length} chunks. Total token count: ${batchText.join(' ').split(' ').length}`);

          // Request embeddings from Pinecone for this batch
          const batchEmbeddings = await pc.inference.embed(
              model,
              batchText,
              { inputType: 'passage', truncate: 'END' }
          );

          // Store the embeddings and their associated metadata
          batch.forEach((chunk, i) => {
              embeddings.push({
                  id: chunk.id,
                  values: batchEmbeddings[i].values,
                  metadata: { text: chunk.text }
              });
          });

          console.log(`Batch processed with ${batch.length} chunks`);
      }

      // Upsert the vectors into Pinecone
      await index.namespace('example-namespace').upsert(embeddings);

      // Get index stats after upsert
      const stats = await index.describeIndexStats();
      console.log("Index stats:", stats);

  } catch (error) {
      console.error("Error generating vectors:", error);
  }

}


async function searchTheIndex(query) {

    const model = 'multilingual-e5-large';
    const modelMaxTokens = 4000; // Cohere's max tokens limit, change or remove this dynamic calculation if causes problems
    

// Helper function to count tokens in a text (example implementation)
function countTokens(text) {
  // Rough estimate: Each word is typically 1 token (approximation, depending on the model)
  // For better precision, you might want to use a library like `gpt-tokenizer` for accurate token counting.
  return text.split(/\s+/).length;
}

    /*const query = [
        'can you provide a general overview of Apple inc?',
      ];*/
      
      // Convert the query into a numerical vector that Pinecone can search with
      const queryEmbedding = await pc.inference.embed(
        model,
        query,
        { inputType: 'query' }
      );
      
      // Search the index for the three most similar vectors
      const queryResponse = await index.namespace("example-namespace").query({
        topK: 100, //seems to work fine changing from 10 to 100 
        vector: queryEmbedding[0].values,
        includeValues: false,
        includeMetadata: true
      });
      
      console.log(queryResponse);

      const matches = queryResponse.matches;
    console.log("Search results:");
    
    matches.forEach(match => {
      const { id, score, metadata } = match;
      console.log(`ID: ${id}`);
      console.log(`Score: ${score}`);
      console.log(`Metadata: `, metadata);
      console.log('---');
    });

    // Step 2: Extract relevant metadata (text) from the matches
    const relevantTexts = matches.map(match => match.metadata.text).join("\n");

    // Step 3: Combine the relevant texts and query for the language model
   
    
    

    //const prompt = `Given the following context, answer the question at the end. Reference named scholars if you've used their work:\n${relevantTexts}\nQuestion: ${query}`;

   //console.log("prompt is:", prompt);

   // Step 3: Calculate the input tokens
   const prompt = `Given the following context, answer the question at the end. Reference named scholars if you've used their work:\n${relevantTexts}\nQuestion: ${query}`;
   const inputTokens = countTokens(prompt); // Function to count the number of tokens in the input

   console.log(`Input tokens: ${inputTokens}`);

   // Step 4: Calculate available tokens for the output
   const availableTokensForOutput = modelMaxTokens - inputTokens;
   //const outputTokenLimit = Math.min(availableTokensForOutput, 600); // Ensure max tokens doesn't exceed the limit

   //console.log(`Output tokens limit: ${outputTokenLimit}`);

    const response = await cohere.chat({
        model: 'command-r7b-12-2024',  // Choose your preferred model
        message: prompt,
        max_tokens: availableTokensForOutput, //the number of tokens that make up the response, so proxy for length
      });

      //console.log("this is the response from cohere:", response);
      
      console.log('Generated Answer:', response.text);
      return response;
}



module.exports = { generateVectors, searchTheIndex };