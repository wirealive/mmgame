const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.port || 3000;
let randomNumbers;

const server = http.createServer((req, res) => {
    if(req.method !== 'GET') {
        res.end(`{"error": "${http.STATUS_CODES[405]}"}`);
    } else if(req.url === "/"){
        fs.readFile("./public/index.html", "UTF-8", (err, html) => {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(html);
        });
    } else if(req.url === "/index.js") {
        const filestream = fs.createReadStream("./public/index.js", "UTF-8");
        res.writeHead(200, {"Content-Type": "text/javascript"});
        filestream.pipe(res);

    } else if(req.url.includes("/guess")) {
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


let baseUrl = "https://www.random.org/integers/";

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
        console.log(randomNumbers);
    });
});
