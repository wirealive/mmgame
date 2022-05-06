# mmgame

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


