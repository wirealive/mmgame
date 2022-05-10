const https = require('https');
const http = require('http');
const fs = require('fs');
const crypto = require("crypto");

const StatsD = require('hot-shots');
const dogstatsd = new StatsD;

const port = process.env.port || 3000;

// a regular expression that catches a uuid
const matchRoomUrl = /^\/room\/[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;


const matchGuessUrl = /^\/guess\/[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}\/\?a=[0-7]&b=[0-7]&c=[0-7]&d=[0-7]$/;

const baseUrl = "https://www.random.org/integers/";

const params = {
    num: 4,
    min: 0,
    max: 7,
    col: 1,
    base: 10,
    format: 'plain',
    rnd: 'new'
}

function buildUrl(baseUrl, params) {
    let paramsStr = "";
    for(const [param, paramValue] of Object.entries(params)) {
        paramsStr += param + '=' + paramValue + '&';    
    }
    return baseUrl + "?" + paramsStr;
}

const uuidToGeneratedNumber = new Map();

function handleRootUrl(req, res) {
        const uuid = crypto.randomUUID();
        // redirect to a room 
        res.writeHead(302, {
            location: `/room/${uuid}`
        }).end();
        dogstatsd.increment('page.views');
}

function handleRoomUrl(req, res) {
    // getting the uuid like this might break the api
    let uuid = req.url.split('/')[2]; 
    console.log(uuid);

    // if we don't have random numbers generated for this UUID then fetch some
    // otherwise reuse what is in the map object
    if(!uuidToGeneratedNumber.has(uuid)) {
        console.log('getting random numbers from random.org');
        // get random numbers from random.org api
        const url = buildUrl(baseUrl, params);
        console.log(url);
        https.get(url, (res) => {
            const { statusCode } = res

            let error;

            if (statusCode !== 200) {
                error = new Error(`Request Failed. Status Code: ${statusCode}`);
            }            

            if (error) {
                // send error to data dog here
                console.error(error.message);
                return;
            }

            let rawData = '';


            res.on('data', (chunk) => {
                console.log(chunk);
                rawData += chunk;
            });

            res.on('end', () => {
                try {
                    // remove white space from string
                    const randNumbersStr = rawData.replace(/\s+/g, "");
                    console.log(rawData);
                    console.log(randNumbersStr);
                    
                    // split the string of numbers into an array
                    const randomNumbers = randNumbersStr.split("").map(num => Number(num));
                    console.log(randomNumbers);
                    uuidToGeneratedNumber.set(uuid, [randomNumbers, 0]);
                } catch (e) {
                    console.error('There was an error parsing the response from the API');
                    console.error(e.message);
                    // log to datadog here
                }
            });
        }).on('error', (e) => {
            // send any errors here to datadog
            console.error(`Got error: ${e.message}`);
        });
    }

    // serve static index html file
    fs.readFile("./public/index.html", "UTF-8", (err, html) => {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(html);
    });
}


function handleGuessUrl(req, res) {
    // this could fail
    const uuid = req.url.split('/')[2];
    // What should we do if we don't have a set of random Numbers generated for this room url?
    try {
        const guessInfo = uuidToGeneratedNumber.get(uuid);  
        console.log(guessInfo);
        const randomNumbers = guessInfo[0];
        let attempts = guessInfo[1];

        userGuesses = req.url.split('?')[1].split('&');
        guesses = [];
        guessesInDict = {};
        for(let guess of userGuesses) {
            const numberGuess = Number(guess[guess.length - 1]);
            guesses.push(numberGuess);
            if(guessesInDict[numberGuess]) {
                guessesInDict[numberGuess]++;
            } else {
                guessesInDict[numberGuess] = 1;
            }
        }

        let correctNumsInPosition = 0;
        let correctNumsNotInPosition = 0;

        for(let i = 0; i < randomNumbers.length; i++) {
            if(randomNumbers[i] === guesses[i]) {
                correctNumsInPosition++;
                // mark this number as counted so that we don't double count
                guesses[i] = 'x';
            }
        }

        for(let i = 0; i < randomNumbers.length; i++) {
            for(let j = 0; j < guesses.length; j++) {
                if(randomNumbers[i] === guesses[j]) correctNumsNotInPosition++;
            }
        }

        // This shouldn't be the case unless the user was messing with the client side code
        if(correctNumsInPosition === 4) {
            res.writeHead(400, {"Content-Type": "text/html"});
            res.end('Game has ended. Please start a new game.');
            // log this to data dog
        } else if (attempts === 10) {
            res.writeHead(400, {"Content-Type": "text/html"});
            res.end('Max attempts reached. Please start a new game.');
            // log this to data dog as well.
        } else {
            ++guessInfo[1];
        }

        console.log('the uuid is:', uuid, 'and the random numbes generated for this uuid is', randomNumbers);

        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(correctNumsNotInPosition + " " + correctNumsInPosition);
    } catch (err) {
        // send error to data dog
        console.error(err);
        res.writeHead(500, {"Content-Type": "text/html"});
        res.end("There has been error. Please try again at a later time.");
    }
}

// consider serving static files fron Nginx and logging that data to data dog
const server = http.createServer((req, res) => {
    console.log(req.url);
    if(req.method !== 'GET') {
        // we don't want to handle any other HTTP method besides GET
        res.writeHead(405, {"Content-Type": "text/html"});
        res.end(`{"error": "${http.STATUS_CODES[405]}"}`);
    } else if(req.url === "/") {
        handleRootUrl(req, res);
    } else if(matchRoomUrl.test(req.url)) {
        handleRoomUrl(req, res);
    } else if(req.url === "/room/index.js") {
        // serving static js client code
        const filestream = fs.createReadStream("./public/index.js", "UTF-8");
        res.writeHead(200, {"Content-Type": "text/javascript"});
        filestream.pipe(res);
    } else if(matchGuessUrl.test(req.url)) {
        console.log('making a guess. We hit this endpoint');
        handleGuessUrl(req, res);
    } else {
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end("No Page Found");
        // log the url to datadog
    }
});

server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
