import { PointCloudData, WeightedPointCloudData } from '../../../point-cloud-data';
import { Geometry } from '../../../../utils/geometry';
import { UidGenerator } from '../../../../utils/uid-generator';
import { WeightedLodNode } from '../../lod-node';
import { LeafDataNode } from './leaf-data-node';
import { Subgrid } from '../../subgrid';
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

    computeLOD(subgrid: Subgrid): WeightedLodNode {
        const childLoDs = this.children.map(child => child.computeLOD(subgrid)).filter(lod => lod.data.positions.length > 0);
        this.children = []; // free space

        const mergedLoD: WeightedPointCloudData = Geometry.mergeLodNodes(childLoDs);
        const minX = this.nodeInfo.centerX - this.nodeInfo.size / 2;
        const minY = this.nodeInfo.centerY - this.nodeInfo.size / 2;
        const minZ = this.nodeInfo.centerZ - this.nodeInfo.size / 2;
        const reduced = subgrid.reduce(mergedLoD, {minX, minY, minZ, size: this.nodeInfo.size});

        const boundingSphere = Geometry.getBoundingSphere(reduced.positions, reduced.sizes);
        // ensure that resulting bounding sphere contains children's bounding spheres
        // advantage: if parent is outside of frustum, children are guaranteed to be outside frustum as well
        for (const child of childLoDs) {
            const dist = Geometry.sphereDist(boundingSphere, child.boundingSphere);
            const minRadius = dist + child.boundingSphere.radius;
            if (boundingSphere.radius < minRadius) {
                boundingSphere.radius = minRadius;
            }
        }

        return {
            id: UidGenerator.genUID(),
            boundingSphere: boundingSphere,
            data: {
                positions: reduced.positions,
                sizes: reduced.sizes,
                colors: reduced.colors,
                normals: reduced.normals
            },
            childIDs: childLoDs.map(child => child.id),
            children: childLoDs,
            weights: reduced.weights,
        };
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
