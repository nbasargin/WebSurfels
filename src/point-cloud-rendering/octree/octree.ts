import { PointCloudData } from '../data/point-cloud-data';
import { DynamicOctreeNode } from './dynamic-octree-node';
import { LevelOfDetail } from './level-of-detail';
import { StaticOctreeNode } from './static-octree-node';

export class Octree {

    root: StaticOctreeNode;

    constructor(data: PointCloudData, pointsLimitPerNode: number, maxDepth: number, leafNodePointSize: number) {
        const bb = this.getBoundingBox(data.positions);
        const min = Math.min(bb.minX, bb.minY, bb.minZ);
        const max = Math.max(bb.maxX, bb.maxY, bb.maxZ);
        const size = max - min;

        // build a dynamic octree
        const dynamicRoot = new DynamicOctreeNode([min, min, min], size, pointsLimitPerNode, maxDepth);
        for (let i = 0; i < data.positions.length / 3; i++) {
            dynamicRoot.addPoint(i, data.positions, data.colors, data.normals);
        }
        // convert dynamic into static and generate LoD levels
        this.root = this.createStaticTree(dynamicRoot, leafNodePointSize);

        console.log('Created octree. Nodes:', dynamicRoot.getNumberOfNodes(),
            ' Points:', dynamicRoot.getNumberOfPoints(), ' Depth:', dynamicRoot.getDepth());
    }

    getBoundingBox(positions: Float32Array) {
        let minX = Number.MAX_VALUE, minY = Number.MAX_VALUE, minZ = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE, maxY = Number.MIN_VALUE, maxZ = Number.MIN_VALUE;

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i], y = positions[i + 1], z = positions[i + 2];
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
        }
        return {minX, minY, minZ, maxX, maxY, maxZ}
    }

    /**
     * Convert a dynamic octree into a static one.
     * Leaf nodes of the static tree contain original points, internal nodes are LoD approximations of the children.
     * @param dynamicNode
     * @param leafNodePointSize
     */
    private createStaticTree(dynamicNode: DynamicOctreeNode, leafNodePointSize: number): StaticOctreeNode {
        if (!dynamicNode.hasChildren()) {
            // single node
            const positions = dynamicNode.pointPositions.slice(0, dynamicNode.nodePointNumber * 3);
            const sizes = new Float32Array(dynamicNode.nodePointNumber);
            const colors = dynamicNode.pointColors.slice(0, dynamicNode.nodePointNumber * 3);
            const normals = dynamicNode.pointNormals.slice(0, dynamicNode.nodePointNumber * 3);
            const weights = new Float32Array(dynamicNode.nodePointNumber);

            sizes.fill(leafNodePointSize);
            weights.fill(1);

            return new StaticOctreeNode(
                dynamicNode.nodePosition,
                dynamicNode.nodeSize,
                dynamicNode.nodePointNumber,
                positions,
                sizes,
                colors,
                normals,
                weights,
                []
            )
        }

        const children: Array<StaticOctreeNode> = [];
        let numPointsInChildren = 0;
        for (const child of dynamicNode.children) {
            const staticNode = this.createStaticTree(child, leafNodePointSize);
            numPointsInChildren += staticNode.pointPositions.length / 3;
            children.push(staticNode);
        }

        return this.createLodFromChildren2(children, dynamicNode);
    }

    createLodFromChildren2(children: Array<StaticOctreeNode>, dynamicNode: DynamicOctreeNode): StaticOctreeNode {
        // merge all children into a new node
        let totalPointNumber = 0;
        let totalRepresentedPointNumber = 0; // how many original points are represented by all children
        for (const child of children) {
            totalPointNumber += child.pointSizes.length;
            totalRepresentedPointNumber += child.representedPointNumber;
        }

        const mergedPositions = new Float32Array(totalPointNumber * 3);
        const mergedSizes = new Float32Array(totalPointNumber);
        const mergedColors = new Float32Array(totalPointNumber * 3);
        const mergedNormals = new Float32Array(totalPointNumber * 3);
        const mergedWeights = new Float32Array(totalPointNumber);

        let writePos = 0;
        for (const child of children) {
            mergedPositions.set(child.pointPositions, writePos * 3);
            mergedSizes.set(child.pointSizes, writePos);
            mergedColors.set(child.pointColors, writePos * 3);
            mergedNormals.set(child.pointNormals, writePos * 3);
            mergedWeights.set(child.pointWeights, writePos);
            writePos += child.pointSizes.length;
        }

        const mergedNode = new StaticOctreeNode(
            dynamicNode.nodePosition,
            dynamicNode.nodeSize,
            totalRepresentedPointNumber,
            mergedPositions,
            mergedSizes,
            mergedColors,
            mergedNormals,
            mergedWeights,
            children
        );

        // reduce resolution of that node
        const { positions, sizes, colors, normals, weights } = LevelOfDetail.mergeToMany(mergedNode);

        return new StaticOctreeNode(
            dynamicNode.nodePosition,
            dynamicNode.nodeSize,
            totalRepresentedPointNumber,
            positions,
            sizes,
            colors,
            normals,
            weights,
            children
        );
    }

}
