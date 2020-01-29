import { PointCloudData } from '../data/point-cloud-data';
import { DynamicOctreeNode } from './dynamic-octree-node';
import { StaticOctreeNode } from './static-octree-node';

export class Octree {

    root: StaticOctreeNode;

    constructor(data: PointCloudData, pointsLimitPerNode: number, maxDepth: number) {
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
        this.root = this.createStaticTree(dynamicRoot);
    }

    getBoundingBox(positions: Float32Array) {
        let minX = Number.MAX_VALUE, minY = Number.MAX_VALUE, minZ = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE, maxY = Number.MIN_VALUE, maxZ = Number.MIN_VALUE;
        
        for (let i = 0; i < positions.length; i+=3) {
            const x = positions[i], y = positions[i+1], z = positions[i+2];
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
        }
        return { minX, minY, minZ, maxX, maxY, maxZ }
    }

    /**
     * Convert a dynamic octree into a static one.
     * Leaf nodes of the static tree contain original points, internal nodes are LoD approximations of the children.
     * @param dynamicNode
     */
    private createStaticTree(dynamicNode: DynamicOctreeNode): StaticOctreeNode {
        if (!dynamicNode.hasChildren()) {
            // single node
            const positions = dynamicNode.pointPositions.slice(0, dynamicNode.nodePointNumber * 3);
            const colors = dynamicNode.pointColors.slice(0, dynamicNode.nodePointNumber * 3);
            const normals = dynamicNode.pointNormals.slice(0, dynamicNode.nodePointNumber * 3);

            return new StaticOctreeNode(
                dynamicNode.nodePosition,
                dynamicNode.nodeSize,
                dynamicNode.nodePointNumber,
                positions,
                colors,
                normals,
                []
            )
        }

        const children: Array<StaticOctreeNode> = [];
        let numPointsInChildren = 0;
        for (const child of dynamicNode.children) {
            const staticNode = this.createStaticTree(child);
            numPointsInChildren += staticNode.pointPositions.length / 3;
            children.push(staticNode);
        }

        return this.createLodFromChildren(children, dynamicNode);
    }

    /**
     * Generates a static node from 8 static child nodes.
     * The new static node will have dynamicNode.pointLimit points (+/- 1)
     * @param children
     * @param dynamicNode
     */
    createLodFromChildren(children: Array<StaticOctreeNode>, dynamicNode: DynamicOctreeNode): StaticOctreeNode {
        // children are weighted by representedPointNumber
        let totalRepresentedPointNumber = 0; // how many original points are represented by all children
        for (const child of children) {
            totalRepresentedPointNumber += child.representedPointNumber;
        }

        // actual point number cannot be less then max, otherwise node would not be expanded
        const pointLimit = dynamicNode.pointLimit;

        // node_contribution: node.representedNumber / totalRepresentedPointNumber
        // the child node gets represented by max_points * node_contribution points

        const pointsPerChildren: Array<number> = [];
        let lodPointsNumber: number = 0;
        for (const child of children) {
            const pointsPerChild = Math.round(child.representedPointNumber / totalRepresentedPointNumber * pointLimit);
            const pointsInChild = child.pointPositions.length / 3;
            const points = Math.min(pointsPerChild, pointsInChild);
            pointsPerChildren.push(points);
            lodPointsNumber += points;
        }


        // reduce points per node and write them to the merged array
        const mergedPositions = new Float32Array(lodPointsNumber * 3);
        const mergedColors = new Float32Array(lodPointsNumber * 3);
        const mergedNormals = new Float32Array(lodPointsNumber * 3);
        let writePos = 0;

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const points = pointsPerChildren[i];
            const {positions, colors, normals} = Octree.reducePointNumber(child, points);

            mergedPositions.set(positions, writePos);
            mergedColors.set(colors, writePos);
            mergedNormals.set(normals, writePos);
            writePos += positions.length;
        }
        return new StaticOctreeNode(
            dynamicNode.nodePosition,
            dynamicNode.nodeSize,
            totalRepresentedPointNumber,
            mergedPositions,
            mergedColors,
            mergedNormals,
            children
        )

    }

    /**
     * Reduce all points in a single node to target number of points
     * @param node
     * @param points
     */
    private static reducePointNumber(node: StaticOctreeNode, points: number): {positions: Float32Array, colors: Float32Array, normals: Float32Array}  {
        const positions = new Float32Array(points * 3);
        const colors = new Float32Array(points * 3);
        const normals = new Float32Array(points * 3);

        const pointsInNode = node.pointPositions.length / 3;
        const keepRatio = points / pointsInNode;
        if (keepRatio > 1) {
            throw new Error('keep ratio is larger than 1'); // todo add a test and remove this check
        }
        for (let i = 0; i < points; i++) {
            const readOffset = Math.floor(i / keepRatio) * 3;
            const writeOffset = i * 3;
            for (let elm = 0; elm < 3; elm++) {
                if (readOffset + elm >= node.pointPositions.length) {
                    throw new Error('invalid index in reducePointNumber'); // todo add a test and remove this check
                }
                positions[writeOffset + elm] = node.pointPositions[readOffset + elm];
                colors[writeOffset + elm] = node.pointColors[readOffset + elm];
                normals[writeOffset + elm] = node.pointNormals[readOffset + elm];
            }
        }
        return {positions, colors, normals};
    }

}
