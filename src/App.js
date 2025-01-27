import logo from './logo.svg';
import './App.css';
import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import isEqual from 'lodash.isequal';
import _ from 'lodash';

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
  const [ folderFiles, setFolderFiles ] = useState(null);
  const [ error, setError ] = useState('');
  const [loading, setLoading] = useState(false); // State to show a loading spinner
  const [ folderUploadText, setFolderUploadText ] = useState([]);

  const [existingData, setExistingData] = useState([])

  const prevExistingDataRef = useRef();

  /*useEffect(() => {
    async function getData() {
      const { data: existingData } = await supabase.from('dataForRAG').select()
      //console.log("value of data: todos is:", todos);

      //if (todos.length > 1) {
        setExistingData(existingData)
      //}
    }

    getData()
  }, [newText])*/

  /*useEffect(() => {
    // On mount, store the initial existingData in the ref
    prevExistingDataRef.current = existingData;
  }, [existingData]); // Runs every time existingData changes*/

  useEffect(() => {
    // Detect changes before updating the ref
    const hasChanged = hasExistingDataChanged();
    console.log("Data has changed:", hasChanged);
  
    // After detecting changes, update the ref
    /*if (hasChanged) {
    prevExistingDataRef.current = existingData;
    console.log("Updated prevExistingDataRef:", prevExistingDataRef.current);
    }*/
  }, [existingData]);

  function updatePrevExistingData() {
    prevExistingDataRef.current = folderUploadText;
  }

  useEffect(() => {
    console.log("existing data is:", existingData);
    console.log("the value of folderUploadText is:", folderUploadText);
    console.log("query is:", query);
  },[existingData, folderUploadText, query])

  useEffect(() => {
    console.log("value of indexName is:", indexName);
    console.log("vaklye of prevExistingDataRef is:", prevExistingDataRef);
  },[indexName])
  
  
  /*async function addData() {
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
  }*/

  // New deep comparison check function
  /*const hasExistingDataChanged = () => {
    const prevData = prevExistingDataRef.current;
    return !isEqual(prevData, existingData); // Check deep equality with lodash
  };*/

  const hasExistingDataChanged = () => {
    const prevData = prevExistingDataRef.current || []; // Ensure it's always an array
    console.log("previousData within hasExistingDataChanged function:", prevData);
    const currentData = existingData || []; // Ensure it's always an array
    console.log("foldertextUpload within haseXistingDataChanged function:", folderUploadText);
  
    

      if (prevData.length !== folderUploadText.length) {
        console.log("Array lengths are different:", prevData.length, existingData.length);
        return true; // Data has changed
      }
    return false
  
    // Return true if the data has changed
  };


  async function handleRAG() {

    //will need some condition, to decide whether indexName is different, and therefore if need to create new index
    console.log("existing data is:", existingData);

    if (/*indexName && existingData &&*/ query) {

      const existingDataChanged = hasExistingDataChanged();
      console.log("hasExistingDataChanged before dynamic function is:", existingDataChanged);
      console.log("prevEistingData ref in handleRAG function is:", prevExistingDataRef);
      console.log("existingData in handleRAG function is:", existingData);

      //really, need to make sendToGenerateVectors optional, only if existingData has changed
      //blocking out the line below, and conditional triggering of sendToSearchTheIndex, allows me to search straight away
      //so just need a way to make it conditional on whether existingData has changed
      if (existingDataChanged) {
        console.log("will re/generate vectors, because data has changed");
        const response = await sendToGenerateVectors(existingData);
      if (response.ok === true && query) {
        const response = await sendToSearchTheIndex(query)
        console.log("response to searchTheIndex in frontend is:", response);
        const responseText = response.text;
        console.log("responseText is:", responseText);
        setResponse(/*responseText*/ responseText);
        updatePrevExistingData();
      }
      } else {
        console.log("data hasn't changed, calling sendToSearchTheIndex");
      const searchResponse = await sendToSearchTheIndex(query);
        console.log("response to searchTheIndex in frontend is:", searchResponse);
        const responseText = searchResponse.text;
        console.log("responseText is:", responseText);
        setResponse(responseText);
      }
    }
    //searchTheIndex(query);


  }

  async function handleFolderUpload(e) {
    e.preventDefault();

    if (folderFiles.length === 0) {
      setError("Please upload at least one PDF file.");
      return;
    }
    setLoading(true);

    try {
      // Create a FormData object to send the files
      const formData = new FormData();
      folderFiles.forEach((file, index) => {
        formData.append(`pdf_${index}`, file); // Append each file to FormData
      });

      // Make a POST request to your backend
      const response = await fetch("http://localhost:5004/convert-folderpdfs-text", {
        method: "POST",
        body: formData, // Pass the FormData directly
      });

      if (!response.ok) {
        throw new Error("Failed to translate the PDFs");
      }

      // Parse the response as JSON
      const data = await response.json();
      console.log("data returned to frontend is:", data);

      // Update the translated text state
      setFolderUploadText(data || "Translation successful. Check backend for full results.");
      //setExistingData(data);
    } catch (err) {
      setError("Failed to translate the PDFs. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }

    
  }




  async function handleFileChange(e) {
    const selectedFiles = Array.from(e.target.files);
    setFolderFiles(selectedFiles);
  }
  

  return (
    <div className="App">
      <header className="App-header">
        <h2>ask aetius</h2>
        <input
          type="file"
          accept=".pdf"
          multiple // Allow multiple files to be selected
          onChange={handleFileChange}
        />
        <button onClick={handleFolderUpload}>{loading ? "uploading..." : "upload"}</button>
        <h3>add Query</h3>
        <label>enter query</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
        <button onClick={handleRAG}>search</button>
        {/*{folderUploadText.length > 0 && folderUploadText.map((item) => (
          <p>{item.text}</p> 
        ))}*/}
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
        {/*{existingData && existingData.map((dat) => (
          <>
            <p>{dat.id}</p>
            <p>{dat.text}</p>
          </>
        ))}*/}
         
      </div>
    </div>
  );
}

export default App;