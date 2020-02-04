import { LodNode } from './lod-node';
import { OctreeNode, OctreeNodeInfo } from './octree-node';

/**
 * Non-expandable leaf node. Accepts all inserted points.
 */
export class FinalLeafNode implements OctreeNode {

    private capacity: number;
    private pointCount: number;

    // arrays to store currently inserted points

    constructor(
        public readonly nodeInfo: OctreeNodeInfo
    ) {
        this.capacity = nodeInfo.resolution; // initial capacity
    }

    addPoint() {
        if (this.pointCount === this.capacity) {
            this.doubleCapacity();
        }
        this.pointCount++;

        // add actual point
    }

    computeLOD(): LodNode {
        return undefined as any;
    }

    private doubleCapacity() {
        this.capacity *= 2;

        // resize buffers
    }

}
