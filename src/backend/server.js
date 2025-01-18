const express = require('express');
//require('dotenv').config(); 
const app = express();
const cors = require('cors');
const { Pinecone, PineconeClient } = require("@pinecone-database/pinecone");
const OpenAI = require("openai");
const { CohereClient } = require('cohere-ai');
require('dotenv').config();
const apiKey = process.env.OPENAI_API_KEY;
const apiKeyPC = process.env.PC_API_KEY

const port = 5003;

//app.use(express.json());
// Increase limit for JSON payload
app.use(express.json({ limit: '10mb' })); // Default is '100kb'

app.use(cors());

let index;

const pc = new Pinecone({
    apiKey: apiKeyPC
  });

  const cohere = new CohereClient({ apiKey: process.env.CO_API_KEY });

  const openai = new OpenAI({
    apiKey: apiKey  // Replace with your OpenAI API key
  });


const indexName = 'phd4';

index = pc.Index(indexName);

//dotenv.config();

app.post('/generateVectors', (req, res, next) => {
  
    console.log("recieved sendToGenerateVectors request is:", req);
    console.log("req.body is:", req.body);
    
    const data = req.body;

    async function generateVectors() {

        // Convert the text into numerical vectors that Pinecone can index
    const model = 'multilingual-e5-large';


    console.log("this is what data looks like:", data);
    
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
    res.status(200).send("vectors generated successfully");


})

app.post('/searchTheIndex', (req, res, next) => {

    const data = req.body;
    console.log("data in searchTheIndex backend is:", data);

    //const query = req.body.query;
    const query = [data.query];
    console.log("alternative query in backend is:", query);

    async function searchTheIndex() {

        const model = 'multilingual-e5-large';

        
    
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
    
        const prompt = `Given the following context, answer the question at the end. Reference named scholars if you've used their work:\n${relevantTexts}\nQuestion: ${query}`;
    
       console.log("prompt is:", prompt);
    
        const response = await cohere.chat({
            model: 'command-r7b-12-2024',  // Choose your preferred model
            message: prompt,
            max_tokens: 500,
          });
    
          //console.log("this is the response from cohere:", response);
          
          console.log('Generated Answer:', response.text);
          res.status(200).send(response);
    }
    
    searchTheIndex();
    //res.status(200).send(response.text);
})



app.listen(port, () => console.log(`server is running on ${port}`));