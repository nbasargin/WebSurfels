/**
 * Level of detail node optimized for rendering.
 * Does not allow adding new points.
 */
import { WeightedPointCloudData } from '../data/point-cloud-data';
import { BoundingSphere } from '../utils/geometry';

export interface LodNode extends WeightedPointCloudData {

    boundingSphere: BoundingSphere;

    positions: Float32Array;
    sizes: Float32Array;
    colors: Float32Array;
    normals: Float32Array;
    weights: Float32Array;

    children: Array<LodNode>;

}
