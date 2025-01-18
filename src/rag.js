const { Pinecone, PineconeClient } = require("@pinecone-database/pinecone");
//const { OpenAIApi } = require("openai");
//const OpenAI = require("openai");
//const data = require('./data');
const OpenAI = require("openai");
const { CohereClient } = require('cohere-ai');




//okay, so we need to import an indexName, query and data from the frontend.

//every time indexName changes, need to call createNewIndex()
//every time data changes, need to call generateVectors()
//and every time query changes, need to call generateAnswer(query)

//then need to return response.text to the frontend, to display

//for this version, data used will be title (indexName) and text (data) inputted by user manually;

//can work up to being able to upload a folder, and query it. 

let index;

const cohere = new CohereClient({ apiKey: process.env.CO_API_KEY });



    /*const pc = new Pinecone({
        apiKey: 'pcsk_4rQ67R_DFsr9oAKQRTnJDfZz2YFYG4EtSHqQbT9Ekmq4QWXMqfYynHuyzFMNJ83QDaDf87'
      });*/

    const indexName = 'phd4';

    //const client = 

    //const pinecone = new Pinecone

async function createNewIndex() {
    await pc.createIndex({
        name: indexName,
        dimension: 1024, // Replace with your model dimensions
        metric: 'cosine', // Replace with your model metric
        spec: { 
          serverless: { 
            cloud: 'aws', 
            region: 'us-east-1' 
          }
        } 
      });

     

   
    index = pc.Index("phd1");
    console.log("Pinecone initialized");
    }
createNewIndex();

//initPinecone().catch(console.error);
//const index = pinecone.Index("PhD");

index = pc.Index(indexName);

/*async function generateVectors() {

    // Convert the text into numerical vectors that Pinecone can index
const model = 'multilingual-e5-large';

const embeddings = await pc.inference.embed(
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

  console.log("these are the stats:", stats);

}

generateVectors();


async function searchTheIndex() {

    const model = 'multilingual-e5-large';

    const query = [
        'can you provide a general overview of Apple inc?',
      ];
      
      // Convert the query into a numerical vector that Pinecone can search with
      const queryEmbedding = await pc.inference.embed(
        model,
        query,
        { inputType: 'query' }
      );
      
      // Search the index for the three most similar vectors
      const queryResponse = await index.namespace("example-namespace").query({
        topK: 5,
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
   
    
    //console.log("prompt is:", prompt);

    const prompt = `Given the following context, answer the question at the end:\n${relevantTexts}\nQuestion: ${query}`;

   

    const response = await cohere.chat({
        model: 'command-r7b-12-2024',  // Choose your preferred model
        message: prompt,
        max_tokens: 150,
      });

      //console.log("this is the response from cohere:", response);
      
      console.log('Generated Answer:', response.text);

}

searchTheIndex();*/


//modules.export = generateVectors; 