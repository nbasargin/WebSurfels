import { PointCloudData } from '../../../data/point-cloud-data';
import { LodTree } from '../../lod-tree';
import { LeafDataNode } from './leaf-data-node';
import { Subgrid } from '../subgrid/subgrid';
import { OctreeDataNode, OctreeNodeInfo } from './octree-data-node';

/**
 * Inner octree node. Does not store any points and redirects the data into child nodes.
 * Children are initialized to leaf nodes automatically when this node is created.
 * Whenever a child node overflows, it is expanded into another inner node.
 *
 * After a lod representation is computed, all the children are removed to free memory.
 */
export class InnerDataNode implements OctreeDataNode {

    public static readonly LOD_RANDOMNESS = 1;

    private children: Array<OctreeDataNode>;

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
                    this.children[index] = new LeafDataNode(childInfo, maxDepth - 1);
                }
            }
        }
    }

    addPoint(data: PointCloudData, pointIndex: number): boolean {
        const childIndex = this.getChildIndex(data.positions[pointIndex * 3], data.positions[pointIndex * 3 + 1], data.positions[pointIndex * 3 + 2]);
        const success = this.children[childIndex].addPoint(data, pointIndex);

        if (!success) {
            // child node did not succeed and has to be expanded
            const newInnerNode = new InnerDataNode(this.children[childIndex].nodeInfo, this.maxDepth - 1);
            const child = this.children[childIndex] as LeafDataNode;

            for (let i = 0; i < child.pointCount; i++) {
                newInnerNode.addPoint(child, i); // add existing points
            }
            newInnerNode.addPoint(data, pointIndex);  // add new point
            this.children[childIndex] = newInnerNode;
        }

        return true;
    }

    computeLOD(subgrid: Subgrid): LodTree {
        const childLODs = this.children.map(child => child.computeLOD(subgrid)).filter(lod => lod.positions.length > 0);
        this.children = []; // free space
        return subgrid.mergeLoD(childLODs, this.nodeInfo, InnerDataNode.LOD_RANDOMNESS);
    }

    private getChildIndex(x: number, y: number, z: number) {
        const dx = x > this.nodeInfo.centerX ? 1 : 0;
        const dy = y > this.nodeInfo.centerY ? 1 : 0;
        const dz = z > this.nodeInfo.centerZ ? 1 : 0;
        return dx + dy * 2 + dz * 4
    }

    getNumberOfNodes(): number {
        let childNodes = 0;
        for (const child of this.children) {
            childNodes += child.getNumberOfNodes();
        }
        return 1 + childNodes;
    }

    getDepth(): number {
        let childDepth = 0;
        for (const child of this.children) {
            childDepth = Math.max(childDepth, child.getDepth());
        }
        return 1 + childDepth;
    }

}