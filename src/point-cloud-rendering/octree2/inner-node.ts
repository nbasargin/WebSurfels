import { PointCloudData } from '../data/point-cloud-data';
import { NodeSubgrid } from './node-subgrid';
import { LeafNode } from './leaf-node';
import { LodNode } from './lod-node';
import { OctreeNode, OctreeNodeInfo } from './octree-node';

/**
 * Inner octree node. Does not store any points but has exactly 8 children.
 * Children are initialized to leaf nodes automatically when this node is created.
 * Whenever a child node overflows, it is expanded into another inner node.
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
                    this.children[index] = new LeafNode(childInfo, maxDepth - 1);
                }
            }
        }
    }

    addPoint(data: PointCloudData, pointIndex: number): boolean {
        const childIndex = this.getChildIndex(data.positions[pointIndex * 3], data.positions[pointIndex * 3 + 1], data.positions[pointIndex * 3 + 2]);
        const success = this.children[childIndex].addPoint(data, pointIndex);

        if (!success) {
            // child node did not succeed and has to be expanded
            const newInnerNode = new InnerNode(this.children[childIndex].nodeInfo, this.maxDepth - 1);
            const child = this.children[childIndex] as LeafNode;

            for (let i = 0; i < child.pointCount; i++) {
                newInnerNode.addPoint(child, i); // add existing points
            }
            newInnerNode.addPoint(data, pointIndex);  // add new point
            this.children[childIndex] = newInnerNode;
        }

        return true;
    }

    computeLOD(subgrid: NodeSubgrid): LodNode {

        const childLODs = this.children.map(child => child.computeLOD(subgrid)).filter(lod => lod.positions.length > 0);

        const ni = this.nodeInfo;
        if (subgrid.resolution !== ni.resolution) {
            subgrid = new NodeSubgrid(ni.resolution);
        } else {
            subgrid.clear();
        }

        const minX = this.nodeInfo.centerX - this.nodeInfo.size / 2;
        const minY = this.nodeInfo.centerY - this.nodeInfo.size / 2;
        const minZ = this.nodeInfo.centerZ - this.nodeInfo.size / 2;
        for (const lod of childLODs) {
            for (let i = 0; i < lod.positions.length / 3; i++) {
                // based on position, determine cell
                const px = NodeSubgrid.getCellIndex(lod.positions[i * 3], minX, ni.size, ni.resolution);
                const py = NodeSubgrid.getCellIndex(lod.positions[i * 3 + 1], minY, ni.size, ni.resolution);
                const pz = NodeSubgrid.getCellIndex(lod.positions[i * 3 + 2], minZ, ni.size, ni.resolution);
                const subcellIndex = px + py * ni.resolution + (pz * ni.resolution ** 2);
                const weight = lod.weights[i];
                // put point into cell
                subgrid.addToCell(subcellIndex, lod, i, weight);
            }
        }

        return subgrid.mergeByCell(ni, childLODs);
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
