import { PointCloudData } from '../data/point-cloud-data';
import { Bitfield } from '../octree/bitfield';
import { FinalLeafNode } from './final-leaf-node';
import { InnerNode } from './inner-node';
import { OctreeNodeInfo } from './octree-node';

/**
 * A leaf node that can be expanded to an inner node.
 * Expansion happens when more than one point falls into the same sub-cell.
 * A bit field tracks what sub-cells are already occupied.
 *
 * This expandable leaf nodes are created by inner nodes and should not be created manually.
 */
export class ExpandableLeafNode extends FinalLeafNode {

    private readonly occupied: Bitfield;

    private readonly minX: number;
    private readonly minY: number;
    private readonly minZ: number;

    constructor(
        public readonly nodeInfo: OctreeNodeInfo,
        public readonly maxDepth: number,
        public readonly parent: InnerNode,
    ) {
        super(nodeInfo);
        this.occupied = new Bitfield(nodeInfo.resolution ** 3);
        this.minX = this.nodeInfo.centerX - this.nodeInfo.size / 2;
        this.minY = this.nodeInfo.centerY - this.nodeInfo.size / 2;
        this.minZ = this.nodeInfo.centerZ - this.nodeInfo.size / 2;
    }

    addPoint(data: PointCloudData, pointIndex: number) {
        const r = this.nodeInfo.resolution;
        const x = Math.floor((data.positions[pointIndex] - this.minX) / this.nodeInfo.resolution);
        const y = Math.floor((data.positions[pointIndex + 1] - this.minY) / this.nodeInfo.resolution);
        const z = Math.floor((data.positions[pointIndex + 2] - this.minZ) / this.nodeInfo.resolution);
        const subCellIndex = x + y * r + z * r * r;

        if (!this.occupied.getBit(subCellIndex)) {
            // insert to this
            super.addPoint(data, pointIndex);
            this.occupied.setBit(subCellIndex);
            return;
        }

        // expand node
        const newInnerNode = new InnerNode(this.nodeInfo, this.maxDepth);
        for (let i = 0; i < this.pointCount; i++) {
            newInnerNode.addPoint(this, i); // add existing points
        }
        newInnerNode.addPoint(data, pointIndex);  // add new point

        // replace this node in parent with the new node
        for (let i = 0; i < this.parent.children.length; i++) {
            if (this.parent.children[i] === this) {
                this.parent.children[i] = newInnerNode;
                return;
            }
        }
    }

}
