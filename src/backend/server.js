const express = require('express');
//require('dotenv').config(); 
const app = express();
const cors = require('cors');
const { Pinecone, PineconeClient } = require("@pinecone-database/pinecone");
const { CohereClient } = require('cohere-ai');
const natural = require('natural');
require('dotenv').config();
const { generateVectors, searchTheIndex } = require('./backendRAGFunctions');
const apiKey = process.env.OPENAI_API_KEY;
const apiKeyPC = process.env.PC_API_KEY
const multer = require('multer');
const pdfParse = require("pdf-parse"); // Library to parse PDF text

const port = 5004;

//app.use(express.json());
// Increase limit for JSON payload
app.use(express.json({ limit: '10mb' })); // Default is '100kb'

app.use(cors());

let index;

const pc = new Pinecone({
    apiKey: apiKeyPC
  });

  const cohere = new CohereClient({ apiKey: process.env.CO_API_KEY });

  

const indexName = 'ampleforth';

index = pc.Index(indexName);

//dotenv.config();
const upload = multer({ dest: "uploads/" });

app.post('/convert-folderpdfs-text', upload.any(), async (req, res, next) => {

  function sendProgress(payload) {
    res.write(`${JSON.stringify(payload)}\n`);
  }

  function handleEmbeddingProgress(progress) {
    sendProgress({
      ...progress,
      percent: 10 + Math.round(progress.percent * 0.85),
      message: `Embedding batch ${progress.currentBatch}/${progress.totalBatches}`
    });
  }

  try {
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    const files = req.files; // Uploaded files
    console.log(`received ${files ? files.length : 0} uploaded file(s)`);

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    
    const processedData = [];
    sendProgress({ phase: 'extracting', percent: 0, message: 'Extracting PDF text' });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const pdfBuffer = require("fs").readFileSync(file.path);

      // Extract text from the PDF
      const pdfText = await pdfParse(pdfBuffer);
      //const vectorId = `vec${i}`;

      //this is the bit where it's going wrong, by assigning a id by pdf
      //when id needs to be for each chunk (or not at all??)

      // Format the data
      const dataToAdd = { /*id: vectorId,*/ text: pdfText.text };
      processedData.push(dataToAdd);

      console.log(`processed ${file.originalname || file.filename}: ${pdfText.text.length} character(s) extracted`);
      sendProgress({
        phase: 'extracting',
        percent: Math.round(((i + 1) / files.length) * 10),
        file: file.originalname || file.filename,
        message: `Extracted ${i + 1}/${files.length} PDF(s)`
      });

      
      
    }

    const response = await generateVectors(processedData, handleEmbeddingProgress);

    console.log("generateVectors response is:", response);
    
      sendProgress({
        phase: 'complete',
        percent: 100,
        message: "New files added successfully",
        ...response
      });
      res.end();

  } catch (err) {
    console.error("Error processing files:", err);
    if (!res.headersSent) {
      res.status(500);
    }
    sendProgress({ phase: 'error', percent: 0, error: "Failed to process files" });
    res.end();
  }
})







app.post('/searchTheIndex', async (req, res, next) => {
  try {

    const data = req.body;
    console.log("data in searchTheIndex backend is:", data);

    //const query = req.body.query;
    const query = [data.query];
    console.log("query in backend is:", query);

    
    const response = await searchTheIndex(query);
    console.log("response is:", response.text);

    res.status(200).send(response);
  } catch (err) {
    console.error("Error searching index:", err);
    res.status(500).json({ error: "Failed to search index" });
  }
})



app.listen(port, () => console.log(`server is running on ${port}`));
