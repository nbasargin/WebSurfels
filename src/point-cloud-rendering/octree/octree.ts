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

        const dynamicRoot = new DynamicOctreeNode([min, min, min], size, pointsLimitPerNode, maxDepth);
        for (let i = 0; i < data.positions.length / 3; i++) {
            dynamicRoot.addPoint(i, data.positions, data.colors, data.normals);
        }
        this.root = this.createStaticNode(dynamicRoot);
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

    private createStaticNode(dynamicNode: DynamicOctreeNode): StaticOctreeNode {
        if (!dynamicNode.hasChildren()) {
            // single node
            const positions = dynamicNode.pointPositions.slice(0, dynamicNode.nodePointNumber * 3);
            const colors = dynamicNode.pointColors.slice(0, dynamicNode.nodePointNumber * 3);
            const normals = dynamicNode.pointNormals.slice(0, dynamicNode.nodePointNumber * 3);

            return new StaticOctreeNode(
                dynamicNode.nodePosition,
                dynamicNode.nodeSize,
                positions,
                colors,
                normals,
                []
            )
        }

        const children: Array<StaticOctreeNode> = [];
        let numPointsInChildren = 0;
        for (const child of dynamicNode.children) {
            const staticNode = this.createStaticNode(child);
            numPointsInChildren += staticNode.pointPositions.length / 3;
            children.push(staticNode);
        }

        // merge all points from children to compute LOD
        const mergedPositions = new Float32Array(numPointsInChildren * 3);
        const mergedColors = new Float32Array(numPointsInChildren * 3);
        const mergedNormals = new Float32Array(numPointsInChildren * 3);
        let writePos = 0;
        for (const staticChild of children) {
            mergedPositions.set(staticChild.pointPositions, writePos);
            mergedColors.set(staticChild.pointColors, writePos);
            mergedNormals.set(staticChild.pointNormals, writePos);
            writePos += staticChild.pointPositions.length;
        }

        // compute LOD representation and return new static node with children
        const {positions, colors, normals} = this.createLodRepresentation(mergedPositions, mergedColors, mergedNormals);
        return new StaticOctreeNode(
            dynamicNode.nodePosition,
            dynamicNode.nodeSize,
            positions,
            colors,
            normals,
            children
        )

    }

    createLodRepresentation(mergedPositions: Float32Array, mergedColors: Float32Array, mergedNormals: Float32Array): {positions: Float32Array, colors: Float32Array, normals: Float32Array} {
        // take every nth point for now
        const numLodPoints = Math.floor(mergedPositions.length / 3 / 8);
        const positions = new Float32Array(numLodPoints * 3);
        const colors = new Float32Array(numLodPoints * 3);
        const normals = new Float32Array(numLodPoints * 3);

        for (let i = 0; i < numLodPoints; i++) {
            const readOffset = i * 3 * 8;
            const writeOffset = i * 3;
            for (let elm = 0; elm < 3; elm++) {
                positions[writeOffset + elm] = mergedPositions[readOffset + elm];
                colors[writeOffset + elm] = mergedColors[readOffset + elm];
                normals[writeOffset + elm] = mergedNormals[readOffset + elm];
            }
        }
        return {positions, colors, normals};
    }

}
