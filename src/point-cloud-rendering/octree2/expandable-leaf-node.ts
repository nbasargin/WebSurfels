import { LodNode } from './lod-node';
import { OctreeNode, OctreeNodeInfo } from './octree-node';

/**
 * A leaf node that can be expanded to an inner node.
 * Expansion happens when more than one point falls into the same sub-cell.
 * A bit field tracks what sub-cells are already occupied.
 */
export class ExpandableLeafNode implements OctreeNode {

    // arrays to store currently inserted points
    // bit field to store occupied sub-cells

    constructor(
        public readonly nodeInfo: OctreeNodeInfo,
        public readonly maxDepth: number,
        public readonly parent?: OctreeNode,
    ) {
    }

    addPoint() {
    }

    computeLOD(): LodNode {
        return undefined as any;
    }

}
