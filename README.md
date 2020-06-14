# WebSurfels

WebSurfels is a library for high-quality point cloud rendering on the Web.
The implementation uses EWA splatting and renders normal-aligned splats to reconstruct the sampled surfaces. 

There are three npm packages in this repository:
- `web-surfels` is the core library
- `example-server` contains examples how to run the code on the server
- `example-ui` contains an Angular project with a few visual demos

Work is still in progress, expect changes in public interfaces and the overall structure.

### Running locally

Currently, no packages are published on npm.
Therefore, the dependencies need to be linked locally.

First, set up the core library. Run following in the `web-surfels` folder:
- `npm install` to get third-party dependencies
- `npm run build` to build the code (TypeScript to JavaScript)
- `npm link` to register package locally
- optionally: `npm run test` to run tests (but there are not many of them)


When you change the library code or run `npm install`, you might need to re-build the library and re-link it.

After the core library is ready, you can run server-side code examples. 
Run following in the `example-server` folder:
- `npm install` to get third-party dependencies
- `npm link web-surfels` to link to local library

Currently, there are following server-side demos:
- `npm run crawl-gsv` crawls data from the Street View API and save it locally
- `npm run gen-lod` generates LOD representations for a large point cloud (data not part of this repository)
- `npm run serve-data` runs a local server to access the data from the browser

To compile and run the UI in the browser, run following in the `example-ui` folder:
- `npm install` to get third-party dependencies
- `npm link web-surfels` to link to local library
- install Angular CLI (if missing) with `npm install -g @angular/cli`
- `ng serve` to run the Angular app

