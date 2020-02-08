import { PointCloudData } from '../data/point-cloud-data';
import { NodeSubgrid } from './node-subgrid';
import { LodNode } from './lod-node';

/**
 * Octree node that allows adding new points to grow the tree.
 */
export interface OctreeNode {

    nodeInfo: OctreeNodeInfo;

    addPoint(data: PointCloudData, pointIndex: number): boolean;

    computeLOD(subgrid: NodeSubgrid): LodNode;

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
