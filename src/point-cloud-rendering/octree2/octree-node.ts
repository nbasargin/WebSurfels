import { PointCloudData } from '../data/point-cloud-data';
import { NodeSubgrid } from '../octree/node-subgrid';
import { LodNode } from './lod-node';

/**
 * Octree node that allows adding new points to grow the tree.
 */
export interface OctreeNode {

    nodeInfo: OctreeNodeInfo;

    addPoint(data: PointCloudData, pointIndex: number): boolean;

    computeLOD(subgrid: NodeSubgrid): LodNode;

    debugHierarchy(): string;

}

export interface OctreeNodeInfo {
    centerX: number;
    centerY: number;
    centerZ: number;
    size: number;
    resolution: number;
}
