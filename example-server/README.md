# WebSurfels - Server-side code examples

This folder contains an npm package with code examples to run on the server.

## Installation
- make sure you installed and linked the `web-surfels` package locally (see main project README)
- `npm install` to get the third-party dependencies
- `npm link web-surfels` to link to the local `web-surfels` package

## `gen-lod` demo

The demo generates a level-of-detail (LOD) tree from a PLY file. 
Useful as a preprocessing step to visualize large point clouds and progressively load more detailed representations as the camera moves closer.

Before running the demo, select a PLY file and adjust the local path to the PLY file in the `src/server-lod-generator.ts` script.
An example PLY file is available here: https://github.com/nbasargin/WebSurfels-Demo/tree/master/point-clouds

Run the demo with `npm run gen-lod`.

## `crawl-gsv` demo

This demo used to collect data from the public Google Street View browser endpoints.
The endpoints have changed since 2020, so the demo is not functional anymore.

An example of a crawl with 5000 Street View panoramas is available here: 
https://github.com/nbasargin/WebSurfels-Demo/tree/master/gsv/paris5k

## `serve-data` helper

Serves all content (e.g. generated LOD files) from the `data` folder. 
Mainly used to test the example UI demo (`example-ui` folder) locally.

Run with `npm run serve-data`.
