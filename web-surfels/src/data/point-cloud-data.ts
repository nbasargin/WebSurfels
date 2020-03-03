export interface PointCloudData {
    positions: Float32Array;
    sizes: Float32Array;
    colors: Float32Array;
    normals: Float32Array;
}

export interface WeightedPointCloudData {
    positions: Float32Array;
    sizes: Float32Array;
    colors: Float32Array;
    normals: Float32Array;
    weights: Float32Array;
}
