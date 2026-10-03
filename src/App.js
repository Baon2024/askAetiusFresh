import './App.css';
import { useState, useEffect, useRef } from 'react';
//import { supabase } from './supabase';
//import isEqual from 'lodash.isequal';
//import _ from 'lodash';

//import { generateVectors } from './rag.js';
//const generateVectors = require('./rag')
import { sendToSearchTheIndex } from './apiFunctions';

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
  const [ folderUploadText, setFolderUploadText ] = useState([]);
  const [ folderUpload, setFolderUpload ] = useState(false);
  const [ loading, setLoading ] = useState(false);
  const [ uploadProgress, setUploadProgress ] = useState(null);
  const [ uploadProgressMessage, setUploadProgressMessage ] = useState('');

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


  

  async function searchIndexDirectly() {

    setError('');
    if (query) {
      setLoading(true);
      try {
        console.log("existing data is:", existingData);
        const searchResponse = await sendToSearchTheIndex(query);
        console.log("response to searchTheIndex in frontend is:", searchResponse);
        const responseText = searchResponse.text;
        console.log("responseText is:", responseText);
        setResponse(responseText);
      } catch (err) {
        setError("Search failed. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleFolderUpload(e) {
    e.preventDefault();

    if (!folderFiles || folderFiles.length === 0) {
      setError("Please upload at least one PDF file.");
      return;
    }
    setLoading(true);
    setUploadProgress(0);
    setUploadProgressMessage('Preparing PDFs...');

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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalPayload = null;

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          const progress = JSON.parse(line);

          if (progress.phase === 'error') {
            throw new Error(progress.error || "Failed to process files");
          }

          setUploadProgress(progress.percent ?? 0);
          setUploadProgressMessage(progress.message || '');

          if (progress.phase === 'complete') {
            finalPayload = progress;
          }
        }
      }

      if (buffer.trim()) {
        const progress = JSON.parse(buffer);
        setUploadProgress(progress.percent ?? 0);
        setUploadProgressMessage(progress.message || '');

        if (progress.phase === 'complete') {
          finalPayload = progress;
        }
      }

      setFolderUploadText(finalPayload?.message || "New files added successfully");
      setFolderUpload(true);
      setError('');
      //setExistingData(data);
    } catch (err) {
      setError("Failed to translate the PDFs. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
      setUploadProgress(null);
      setUploadProgressMessage('');
    }

    
  }




  async function handleFileChange(e) {
    const selectedFiles = Array.from(e.target.files);
    setFolderFiles(selectedFiles);
    setFolderUpload(false);
    setUploadProgress(null);
    setUploadProgressMessage('');
    setError('');
  }
  

  return (
    <div className="App">
      <main className="app-shell">
        <section className="brand-lockup">
          <p className="eyebrow">RAG MVP</p>
          <h1>askAetius</h1>
        </section>

        <section className={`answer-panel ${response || loading ? "has-answer" : ""}`} aria-live="polite">
          {loading && uploadProgress !== null ? (
            <div className="upload-progress" role="status" aria-label="Upload progress">
              <div className="progress-meta">
                <span>{uploadProgressMessage || 'Indexing PDFs...'}</span>
                <strong>{uploadProgress}%</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : loading ? (
            <div className="answer-loading" role="status" aria-label="Loading response">
              <span className="spinner" aria-hidden="true"></span>
            </div>
          ) : response ? (
            <p className="answer-text">{response}</p>
          ) : (
            <p className="empty-state">
              Upload PDFs, ask a question, and Aetius will answer from the current index.
            </p>
          )}
        </section>

        <section className="search-dock" aria-label="Ask Aetius controls">
          <div className="dock-status">
            <span>{folderFiles ? `${folderFiles.length} PDF${folderFiles.length === 1 ? "" : "s"}` : "No PDFs selected"}</span>
            <span>{folderUpload ? "Uploaded" : "Static index ready"}</span>
          </div>

          <textarea
            id="query-input"
            className="query-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Aetius..."
            rows="2"
          />

          <div className="dock-actions">
            <label className="file-button">
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
              />
              <span>Choose PDFs</span>
            </label>
            <button className="secondary-action" onClick={handleFolderUpload}>
              {loading ? "Uploading..." : folderUpload ? "Uploaded" : "Upload"}
            </button>
            <button className="primary-action" disabled={!query || loading} onClick={searchIndexDirectly}>
              Search
            </button>

          </div>

          {error && <p className="error-message">{error}</p>}
        </section>
      </main>
    </div>
  );
}

export default App;
