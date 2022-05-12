const https = require('https');
const http = require('http');
const fs = require('fs');
const crypto = require("crypto");

// used to send metrics to datadog
const StatsD = require('hot-shots');
const dogstatsd = new StatsD;

const port = process.env.port || 3000;

// a regular expression that matches a room url
const matchRoomUrl = /^\/room\/[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;

// a regular expression that a guess url
const matchGuessUrl = /^\/guess\/[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}\?a=[0-7]&b=[0-7]&c=[0-7]&d=[0-7]$/;

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
    let uuid = req.url.split('/')[2]; 

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
    // if curl is being used to play this game just return the api endpoint
    if(req.headers['user-agent'].includes('curl')) {
        res.writeHead(200, {"Content-Type": "text/html"});
        let txtRes = 'Welcome to the game!\n'
        txtRes += `Use this endpoint to make your guesses: /guess/${uuid}\n`;
        txtRes += 'To submit a guess of 1, 1, 1, 1 make a request to the endpoint like this: '
        txtRes += `/guess/${uuid}?a=1&b=1&c=1&d=1\n`;
        res.end(txtRes);
    } else {
        // serve static index.html file
        fs.readFile(__dirname + "/public/index.html", "UTF-8", (err, html) => {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(html);
        });
    }

}


function handleGuessUrl(req, res) {
    const [url, query] = req.url.split('?');
    const uuid = url.split('/')[2]
    // What should we do if we don't have a set of random Numbers generated for this room url?
    try {
        const gameState = uuidToGeneratedNumber.get(uuid);  
        const randomNumbers = gameState[0].slice();
        const attempts = ++gameState[1];

        const queryParams = query.split('&');
        const userGuess = queryParams.map(param => {
            const [key, value] = param.split('=');
            return Number(value);
        });

        let numsInPosition = 0;
        let numsNotInPosition = 0;

        console.log(userGuess);


        // find numbers in the correct position
        for(let i = 0; i < randomNumbers.length; i++) {
            if(randomNumbers[i] === userGuess[i]) {
                numsInPosition++;
                // mark these numbers as counted so that we don't double count
                userGuess[i] = 'y';
                randomNumbers[i] = 'x';
            }
        }

        console.log(userGuess);
        // find numbers not in the correct position
        for(let i = 0; i < randomNumbers.length; i++) {
            for(let j = 0; j < userGuess.length; j++) {
                if(randomNumbers[i] === userGuess[j]) {
                    userGuess[j] = 'y';
                    randomNumbers[i] = 'x';
                    numsNotInPosition++;
                }
            }
        }
        console.log(userGuess);

        if(attempts > 10) {
            res.writeHead(400, {"Content-Type": "text/html"});
            res.end('This game has ended. Please start a new game.\n');
            // log this to data dog since this shouldn't happen
        } else if (numsInPosition === 4) {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end('You Won!\n');
            // we want to make sure that they don't keep playing this same game
            gameState[1] = 10;
            // log this to data dog as well.
        } else {
            console.log('the uuid is:', uuid, 'and the random numbes generated for this uuid is', randomNumbers);
            res.writeHead(200, {"Content-Type": "text/html"});
            // if this is the last attempt and the user did not guess correctly, then they lost.
            if(attempts === 10 && numsInPosition !== 4) {
                res.end(`You lost this game. Please start a new game.\n`);
            } else {
                res.end(`${numsNotInPosition} number(s) guessed is/are correct, but in the wrong position. ${numsInPosition} number(s) guessed is/are in the right position. You have ${10 - gameState[1]} attempt(s) left.\n`);
            }
        }
    } catch (err) {
        // send error to data dog
        console.error(err);
        res.writeHead(500, {"Content-Type": "text/html"});
        res.end("There has been error. Please try again at a later time.\n");
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
    } else if(req.url === "/index.js") {
        // serving static js client code
        const filestream = fs.createReadStream(__dirname + "/public/index.js", "UTF-8");
        res.writeHead(200, {"Content-Type": "text/javascript"});
        filestream.pipe(res);
    } else if(matchGuessUrl.test(req.url)) {
        console.log('making a guess. We hit this endpoint');
        handleGuessUrl(req, res);
    } else {
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end("No Page Found");
        // log the url requested to datadog
    }
});

server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
