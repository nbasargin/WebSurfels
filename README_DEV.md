There are three npm packages in this repository:
- `web-surfels-lib` contains the main codebase
- `web-surfels-ui` is an angular project demonstrating how to use the lib in the browser
- `web-surfels-server` is a node.js project showing how to use the lib on the server

Development setup:
- in `web-surfels-lib` run
  - `npm install`
  - `npm test` to run unit tests
  - `npm start` to compile typescript to javascript
  - `npm link` to register package locally
  
- in `web-surfels-ui` run
  - `npm install`
  - `npm link web-surfels` to link to local lib
  - `npm start` to compile an serve the angular app
  
- in `web-surfels-server` run
  - `npm install`
  - `npm test` to run unit tests
  - `npm start` to run the server code (compute LoD)
  - `npm run serve-lod` to serve static LoD locally 
