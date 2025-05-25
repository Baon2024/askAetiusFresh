const { Pinecone, PineconeClient } = require("@pinecone-database/pinecone");
const apiKeyPC = process.env.PC_API_KEY

console.log("apiKey is:", apiKeyPC);

const listIndexes = async () => {
  
    const pc = new Pinecone({
        apiKey: 'pcsk_4rQ67R_DFsr9oAKQRTnJDfZz2YFYG4EtSHqQbT9Ekmq4QWXMqfYynHuyzFMNJ83QDaDf87'
      });

  const indexes = await pc.listIndexes();
  console.log('Available indexes:', indexes);
};

listIndexes();

const inspectIndex = async () => {
   
    const pc = new Pinecone({
        apiKey: 'pcsk_4rQ67R_DFsr9oAKQRTnJDfZz2YFYG4EtSHqQbT9Ekmq4QWXMqfYynHuyzFMNJ83QDaDf87'
      });
  
    const index = pc.Index('phd4'); // Replace with your index name
  
    // Retrieve up to 100 vector IDs from the index
    const vectorIDs = await index.describeIndexStats({});
  
    console.log("Vector IDs in the index:");
    console.log(vectorIDs);
  };
  
inspectIndex();