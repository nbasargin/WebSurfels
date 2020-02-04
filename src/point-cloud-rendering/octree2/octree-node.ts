import { LodNode } from './lod-node';

/**
 * Octree node that allows adding new points to grow the tree.
 */
export interface OctreeNode {

    nodeInfo: OctreeNodeInfo;

    addPoint();

    computeLOD(): LodNode;

}

export interface OctreeNodeInfo {
    centerX: number;
    centerY: number;
    centerZ: number;
    size: number;
    resolution: number;
}
