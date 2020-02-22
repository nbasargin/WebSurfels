import { PointCloudData } from '../data/point-cloud-data';
import { LodNode } from '../level-of-detail/lod-node';
import { Subgrid } from '../level-of-detail/subgrid';

/**
 * Octree node that allows adding new points to grow the tree.
 */
export interface OctreeNode {

    nodeInfo: OctreeNodeInfo;

    addPoint(data: PointCloudData, pointIndex: number): boolean;

    computeLOD(subgrid: Subgrid): LodNode;

    getNumberOfNodes(): number;

    getDepth(): number;

}

export interface OctreeNodeInfo {
    centerX: number;
    centerY: number;
    centerZ: number;
    size: number;
    resolution: number;
}
