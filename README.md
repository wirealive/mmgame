# MasterMind game

## How To Play With Curl
    - Use the -L flag, this will ensure that you follow the redirects. Since I am using nginx on the server as a reverse proxy this flag is needed.
    - Also, make sure that your url is in quotes, otherwise you will get errors.
    - Keep in mind that if there is a slight typo in the url your request will be rejected.
    - To start a game with curl type in `curl "games.computerlinuxstuff.com"` and your game will start :)

![An example of playing this game with curl](https://i.imgur.com/V2TtzBd.png)


## How To Play With Your Browser
    - Visit https://games.computerlinuxstuff.com/


## How To Run Locally

    - I am using Node 16.5.0 on the server and my development machine. I use nvm to get the exact node version I want for a project and I recommend the same.
    - run `npm install` inside the project directory
    - I am using nodemon to restart the server everytime I make changes. `./nodemodules/nodemon/bin/nodemon.js server.js` but you can just run with node normally `node server.js`.
    - That's it! the server runs on localhost:3000/

## Cool Things
    - All the game logic and validation is done at the server. This means you can't cheat by inspecting the code on the client side.
    - This game can be played with Curl!
    - The game can also be played at https://games.computerlinuxstuff.com
    - The infra is being monitored using Datadog. Datadog is monitoring the Linode Ubuntu server, Nginx (used as a reverse proxy), and Node.js.
    - The entire project runs on the node runtime and uses no external libraries on the server or the client side, just plain vanilla javascript. I do however use Datadogs library to send logs.
    - SSL certificate provided by letsencrypt

## Server Side Todos

    ### Logging
        - Errors from our 3rd party API (not returning anything or other errors, rate limiting, etc)
        - Errors in serving any static files (Nginx)
        - Any server crashes (If PM2 needs to restart the nodejs service)
        - Any runtime errors
        - User-driven logs (server requests, etc)
        - Performance related logs (time between responses)
        - Log any unhandled uncaught exception or promise rejection
        - Use DataDog to get insights from the logs.
    ### Misc
        - rate limiting users to prevent a dos attack (Express makes this easy)

## Client Side
    - Graphics should mimic the real game's graphics


