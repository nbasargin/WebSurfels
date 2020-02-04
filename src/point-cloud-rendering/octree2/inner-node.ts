import { PointCloudData } from '../data/point-cloud-data';
import { ExpandableLeafNode } from './expandable-leaf-node';
import { FinalLeafNode } from './final-leaf-node';
import { LodNode } from './lod-node';
import { OctreeNode, OctreeNodeInfo } from './octree-node';

/**
 * Inner octree node. Does not store any points but has children.
 */
export class InnerNode implements OctreeNode {

    public readonly children: Array<OctreeNode>;

    constructor(
        public readonly nodeInfo: OctreeNodeInfo,
        public readonly maxDepth: number,
    ) {
        this.children = [];
        const centerOffset = nodeInfo.size / 4;
        const size = nodeInfo.size / 2;
        const resolution = nodeInfo.resolution;
        for (const centerZ of [nodeInfo.centerZ - centerOffset, nodeInfo.centerZ + centerOffset]) {
            for (const centerY of [nodeInfo.centerY - centerOffset, nodeInfo.centerY + centerOffset]) {
                for (const centerX of [nodeInfo.centerX - centerOffset, nodeInfo.centerX + centerOffset]) {
                    const childInfo: OctreeNodeInfo = {size, resolution, centerX, centerY, centerZ};
                    const index = this.getChildIndex(centerX, centerY, centerZ);
                    if (maxDepth > 1) {
                        this.children[index] = new ExpandableLeafNode(childInfo, maxDepth - 1, this);
                    } else {
                        this.children[index] = new FinalLeafNode(childInfo);
                    }
                }
            }
        }
    }

    addPoint(data: PointCloudData, pointIndex: number) {
        const child = this.getChildIndex(data.positions[pointIndex], data.positions[pointIndex + 1], data.positions[pointIndex + 2]);
        this.children[child].addPoint(data, pointIndex);
    }

    computeLOD(): LodNode {
        return undefined as any;
    }

    private getChildIndex(x: number, y: number, z: number) {
        const dx = x > this.nodeInfo.centerX ? 1 : 0;
        const dy = y > this.nodeInfo.centerY ? 1 : 0;
        const dz = z > this.nodeInfo.centerZ ? 1 : 0;
        return dx + dy * 2 + dz * 4
    }
}
