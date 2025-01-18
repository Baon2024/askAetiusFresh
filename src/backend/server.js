const express = require('express');
//require('dotenv').config(); 
const app = express();
const cors = require('cors');
const { Pinecone, PineconeClient } = require("@pinecone-database/pinecone");
const OpenAI = require("openai");
const { CohereClient } = require('cohere-ai');
const natural = require('natural');
require('dotenv').config();
const { generateVectors, searchTheIndex } = require('./backendRAGFunctions');
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

app.post('/generateVectors', async (req, res, next) => {
  
    console.log("recieved sendToGenerateVectors request is:", req);
    console.log("req.body is:", req.body);
    
    const data = req.body;
    
    const response = await generateVectors(data);
    console.log("response is:", response);
    
    res.status(200).send("vectors generated successfully");


})

app.post('/searchTheIndex', async (req, res, next) => {

    const data = req.body;
    console.log("data in searchTheIndex backend is:", data);

    //const query = req.body.query;
    const query = [data.query];
    console.log("alternative query in backend is:", query);

    
    const response = await searchTheIndex(query);
    console.log("response is:", response.text);

    res.status(200).send(response);
})



app.listen(port, () => console.log(`server is running on ${port}`));