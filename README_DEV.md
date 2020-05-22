Currently, all code is in one single package for simplicity.
Later, three packages might be created: library, ui and server.


### Experimental setup with three npm packages

This structure is currently not available

There are three npm packages in this repository:
- `web-surfels` contains the main codebase
- `examples/web-surfels-ui` is an angular project demonstrating how to use the lib in the browser
- `examples/web-surfels-server` is a node.js project showing how to use the lib on the server

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
  - `npm link web-surfels` to link to local lib
  - `npm test` to run unit tests
  - `npm start` to run the server code (compute LoD)
  - `npm run serve-lod` to serve static LoD locally 

Every time code in `web-surfels-lib` is changed, run `npm start` to recompile.

Every time `npm install` is executed in ui or server, run `npm link web-surfels` to re-link lib.
