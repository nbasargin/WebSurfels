import { PointCloudData } from '../data/point-cloud-data';
import { LodNode } from './lod-node';
import { OctreeNode, OctreeNodeInfo } from './octree-node';

/**
 * Inner octree node. Does not store any points but has children.
 */
export class InnerNode implements OctreeNode {

    constructor(
        public readonly nodeInfo: OctreeNodeInfo,
        public readonly children: Array<OctreeNode>,
    ) {
    }

    addPoint(data: PointCloudData, pointIndex: number) {
        const x = data.positions[pointIndex] > this.nodeInfo.centerX ? 1 : 0;
        const y = data.positions[pointIndex + 1] > this.nodeInfo.centerX ? 1 : 0;
        const z = data.positions[pointIndex + 2] > this.nodeInfo.centerX ? 1 : 0;
        this.children[x + y * 2 + z * 4].addPoint(data, pointIndex);
    }

    computeLOD(): LodNode {
        return undefined as any;
    }
}
