# WebSurfels - Browser UI demos

This folder contains an npm package with an example browser UI.
A deployed version is available here: https://nbasargin.github.io/WebSurfels-Demo/

## Installation
- make sure you installed and linked the `web-surfels` package locally (see main project README)
- `npm install` to get the third-party dependencies
- `npm link web-surfels` to link to the local `web-surfels` package
- install Angular CLI (if missing) with `npm install -g @angular/cli`

## Serve test data (optional)
- For some demos, the web UI requires data to be provided by a local server 
- Follow the steps in `example-server` to set up the server
- Then, download example data from `https://github.com/nbasargin/WebSurfels-Demo/tree/master` and save it in the `data` folder

## Run
- Run the local server to serve the test data (see README in `example-server`) 
- `ng serve` to run the Angular app
- The UI should be accessible at http://localhost:4200/
