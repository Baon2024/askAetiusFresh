




export async function sendToGenerateVectors(existingData) {

    const url = `http://localhost:5003/generateVectors`;
   
    const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(existingData),
    })

    console.log("response is:", response);
    //const responseJsoned = await response.json();
    //console.log("responseJsoned is:", responseJsoned);
    return response;

}

export async function sendToSearchTheIndex(query) {

    const url = `http://localhost:5003/searchTheIndex`;

    console.log("searchTheIndex has been called");
   
    const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({query}),
    })

    console.log("response is:", response);
    const responseJsoned = await response.json();
    console.log("responseJsoned is:", responseJsoned);
    //const responseJsonedText = responseJsoned.text;
    //console.log("responseJsoned.text is:", responseJsonedText);
    return responseJsoned;

}