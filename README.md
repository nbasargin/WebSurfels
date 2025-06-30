# WebSurfels

WebSurfels is an library for high-quality point cloud rendering on the Web.
The implementation uses EWA splatting and renders normal-aligned splats to reconstruct the sampled surfaces. 

This work is part of my Master's thesis at TUM and is mainly experimental.

There are three npm packages in this repository:
- `web-surfels` is the core library
- `example-server` contains examples how to run the code on the server, see another `README` in the subfolder for details
- `example-ui` contains an Angular project with a few visual demos, see another `README` in the subfolder for details

### Running locally

Currently, no packages are published on npm.
Therefore, the dependencies need to be linked locally.

First, set up the core library. Run following in the `web-surfels` folder:
- `npm install` to get third-party dependencies
- `npm run build` to build the code (TypeScript to JavaScript)
- `npm link` to register package locally
- optionally: `npm run test` to run tests (but there are not many of them)

When you change the library code or run `npm install`, you might need to re-build the library and re-link it.

After the core library is ready, you can run server-side and browser code examples. 
See additional `README` files in the `example-server` and `example-ui` subfolders. 
