import { PointCloudData } from '../data/point-cloud-data';
import { LodTree } from '../level-of-detail/lod-tree';
import { Subgrid } from '../level-of-detail/subgrid';

/**
 * Octree node that allows adding new points to grow the tree.
 */
export interface OctreeNode {

    nodeInfo: OctreeNodeInfo;

    addPoint(data: PointCloudData, pointIndex: number): boolean;

    computeLOD(subgrid: Subgrid): LodTree;

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
