/**
 * Level of detail node optimized for rendering.
 * Does not allow adding new points.
 */
import { WeightedPointCloudData } from '../data/point-cloud-data';
import { BoundingSphere } from '../utils/geometry';
import { OctreeNodeInfo } from '../octree2/octree-node';

export interface LodNode extends WeightedPointCloudData {

    nodeInfo: OctreeNodeInfo;
    boundingSphere: BoundingSphere;

    positions: Float32Array;
    sizes: Float32Array;
    colors: Float32Array;
    normals: Float32Array;
    weights: Float32Array;

    children: Array<LodNode>;

}
