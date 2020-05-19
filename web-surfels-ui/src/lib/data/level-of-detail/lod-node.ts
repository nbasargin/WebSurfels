import { PointCloudData } from '../point-cloud-data';
import { BoundingSphere } from '../../utils/bounding-geometry';

export interface LodNode {
    id: number;
    boundingSphere: BoundingSphere;
    data: PointCloudData;
    childIDs: Array<number>;
    children: Array<LodNode>;
}

export interface WeightedLodNode extends LodNode {
    weights: Float32Array;
}
