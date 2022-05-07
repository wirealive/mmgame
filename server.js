const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require("crypto");

const StatsD = require('hot-shots');
const dogstatsd = new StatsD;

const port = process.env.port || 3000;

// a regular expression that catches a uuid
const matchRoomUrl = /^\/room\/[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
const matchGuessUrl = /^\/guess\/[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;

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


const server = http.createServer((req, res) => {
    console.log(req.url);

    if(req.method !== 'GET') {
        res.end(`{"error": "${http.STATUS_CODES[405]}"}`);
    } else if(req.url === "/") {
        const uuid = crypto.randomUUID();
        // redirect to a room 
        res.writeHead(302, {
            location: `/room/${uuid}`
        }).end();
        dogstatsd.increment('page.views');
    } else if(matchRoomUrl.test(req.url)) {
        let uuid = req.url.split('/')[2]; 
        // if we don't have random numbers generated for this UUID then fetch some
        // otherwise reuse what is in the map object
        if(uuidToGeneratedNumber.has(uuid)) {
            fs.readFile("./public/index.html", "UTF-8", (err, html) => {
                res.writeHead(200, {"Content-Type": "text/html"});
                res.end(html);
            });
        } else {

            https.get(buildUrl(baseUrl, params), (resp) => {
                let data = '';

                resp.on('data', (chunk) => {
                    data += chunk;
                });

                resp.on('end', () => {
                    let numberStr = "";
                    // remove new lines
                    for(const letter of data) {
                        if(letter !== '\n') {
                            numberStr += letter;
                        }
                    }
                    // split the string of numbers into an array
                    randomNumbers = numberStr.split("").map(num => Number(num));
                    console.log(randomNumbers)
                    uuidToGeneratedNumber.set(uuid, randomNumbers);
                });
            });

            fs.readFile("./public/index.html", "UTF-8", (err, html) => {
                res.writeHead(200, {"Content-Type": "text/html"});
                res.end(html);
            });
        }
    } else if(req.url === "/room/index.js") {
        const filestream = fs.createReadStream("./public/index.js", "UTF-8");
        res.writeHead(200, {"Content-Type": "text/javascript"});
        filestream.pipe(res);
    } else if(req.url.includes('/guess')) {
        const uuid = req.url.split('/')[2];
        // if the random numbers are not here we need to regenerate random numbers
        const randomNumbers = uuidToGeneratedNumber.get(uuid) || [8, 8, 8, 8];  
        console.log('the uuid is:', uuid, 'and the random numbes generated for this uuid is', randomNumbers);
        
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
        let correctNumbersInGuess = 0;
        let correctNumbersInPosition = 0;

        for(let x of randomNumbers) {
            if(x in guessesInDict) {
                correctNumbersInGuess++;
            }
        }
        for(let i = 0; i < randomNumbers.length; i++) {
            if(randomNumbers[i] === guesses[i]) correctNumbersInPosition++;
        }
        // deleting the uuid from the map object will force a new set of random numbers
        if(correctNumbersInPosition === 4) uuidToGeneratedNumber.delete(uuid);

        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(correctNumbersInGuess + " " + correctNumbersInPosition);
    } else {
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end("No Page Found");
    }
});

server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});


