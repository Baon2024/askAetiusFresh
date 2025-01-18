import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
//import { generateVectors } from './rag.js';
//const generateVectors = require('./rag')
import { sendToGenerateVectors, sendToSearchTheIndex } from './apiFunctions';

/*const data = [
  {"id": "vec1", "text": "Apple is a popular fruit known for its sweetness and crisp texture."},
  {"id": "vec2", "text": "The tech company Apple is known for its innovative products like the iPhone."},
  {"id": "vec3", "text": "Many people enjoy eating apples as a healthy snack."},
  {"id": "vec4", "text": "Apple Inc. has revolutionized the tech industry with its sleek designs and user-friendly interfaces."},
  {"id": "vec5", "text": "An apple a day keeps the doctor away, as the saying goes."},
  {"id": "vec6", "text": "Apple Computer Company was founded on April 1, 1976, by Steve Jobs, Steve Wozniak, and Ronald Wayne as a partnership."},
  {"id": "vec7", "text": "Apple Inc. is an American multinational corporation and technology company headquartered in Cupertino, California, in Silicon Valley. It is best known for its consumer electronics, software, and services. Founded in 1976 as Apple Computer Company by Steve Jobs, Steve Wozniak and Ronald Wayne, the company was incorporated by Jobs and Wozniak as Apple Computer, Inc. the following year. It was renamed Apple Inc. in 2007 as the company had expanded its focus from computers to consumer electronics. Apple is the largest technology company by revenue, with US$391.04 billion in the 2024 fiscal year."}
]*/



function App() {

  const [ newText, setNewText ] = useState('');
  const [ indexName, setIndexName ] = useState('');
  const [ response, setResponse ] = useState('');
  const [ query, setQuery ] = useState('');

  const [existingData, setExistingData] = useState([])

  useEffect(() => {
    async function getData() {
      const { data: existingData } = await supabase.from('dataForRAG').select()
      //console.log("value of data: todos is:", todos);

      //if (todos.length > 1) {
        setExistingData(existingData)
      //}
    }

    getData()
  }, [])

  useEffect(() => {
    console.log("value of data is:", existingData);
  },[existingData])

  useEffect(() => {
    console.log("value of indexName is:", indexName);
  },[indexName])
  
  
  async function addData() {
    if (existingData) {
    console.log("newText is:", newText);

    const dataToAdd = {
      "id": `vec${existingData.length + 1}`,
      "text": newText
    }

    console.log("dataToAdd is:", dataToAdd);

    //data.push(dataToAdd);
    //need to replace this with adding the data to the supbase database. 
    //console.log("now the value of data is:", data);

    
    const { data, error } = await supabase
    .from('dataForRAG')
    .insert([
      { id: `vec${existingData.length + 1}`, text: newText },
      ])
      .select()
        
    }
    setNewText('');
  }

  async function handleRAG() {

    //will need some condition, to decide whether indexName is different, and therefore if need to create new index


    if (indexName && existingData) {
      const response = await sendToGenerateVectors(existingData);
      if (response.ok === true && query) {
        const response = await sendToSearchTheIndex(query)
        console.log("response to searchTheIndex in frontend is:", response);
        const responseText = response.text;
        console.log("responseText is:", responseText);
        setResponse(responseText);
      }
    }
    //searchTheIndex(query);


  }
  

  return (
    <div className="App">
      <header className="App-header">
        <h2>ask aetius</h2>
        <label>Enter knowledge</label>
        <textarea value={newText} type="text" onChange={(e) => setNewText(e.target.value)} />
        <button onClick={addData}>add knowledge to system</button>
        <h3>add Query</h3>
        <label>enter query</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
        <button onClick={handleRAG}>search</button>
        {response && (
          <>
          <h3>aetius says:</h3>
          <p>{response}</p>
          </>
        )}
      </header>
      <div>
        <h3>add indexName</h3>
        <label>enter indexName</label>
        <input value={indexName} onChange={(e) => setIndexName(e.target.value)} />
      </div>
      <div>
        {indexName && (
          <p>{indexName}</p>
        )}
        {existingData && existingData.map((dat) => (
          <>
            <p>{dat.id}</p>
            <p>{dat.text}</p>
          </>
        ))}
         
      </div>
    </div>
  );
}

export default App;