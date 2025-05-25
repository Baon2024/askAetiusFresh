//const cohere = require("cohere-ai");
const { CohereClient } = require('cohere-ai');
require('dotenv').config();

//cohere.init('vjYSOGW1eb5SG7D8Sqk8cZX4ecmxpdfJC0dhbLza');

const cohere = new CohereClient({ apiKey: process.env.CO_API_KEY });

(async () => {
  try {
    const response = await cohere.generate({
      model: "command",
      prompt: "Say hello",
      max_tokens: 10,
    });
    console.log(response);
  } catch (error) {
    console.error("Cohere API error:", error);
  }
})();
