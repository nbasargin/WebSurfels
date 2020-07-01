### This folder contains data for visualization and demos

Following sub-folders are required:
- `gsv`: locally cached Street View panoramas, use for development or as a backup in case the Street View API changes
- `lod`: serialized LOD trees, ready to be streamed to the client
- `point-clouds`: raw point cloud data, currently in PLY format

For local development, serve the whole data folder so the demos in the browser can access the data.
