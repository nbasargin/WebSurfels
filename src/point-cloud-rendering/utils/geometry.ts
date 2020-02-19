import { WeightedPointCloudData } from '../data/point-cloud-data';

export type BoundingBox = {minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number};

export class Geometry {

    public static mergeData(nodes: Array<WeightedPointCloudData>): WeightedPointCloudData {
        let points = 0;
        for (const node of nodes) {
            points += node.positions.length / 3;
        }
        const merged = {
            positions: new Float32Array(points * 3),
            sizes: new Float32Array(points),
            colors: new Float32Array(points * 3),
            normals: new Float32Array(points * 3),
            weights: new Float32Array(points),
        };
        let writePos = 0;
        for (const node of nodes) {
            merged.positions.set(node.positions, writePos * 3);
            merged.sizes.set(node.sizes, writePos);
            merged.colors.set(node.colors, writePos * 3);
            merged.normals.set(node.normals, writePos * 3);
            merged.weights.set(node.weights, writePos);
            writePos += node.positions.length / 3;
        }
        return merged;
    }

    public static getBoundingBox(positions: Float32Array, sizes?: Float32Array): BoundingBox {
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

        let maxSize = 0;
        if (sizes) {
            for (let i = 0; i < sizes.length; i++) {
                maxSize = Math.max(maxSize, sizes[i]);
            }
            minX -= maxSize;
            minY -= maxSize;
            minZ -= maxSize;
            maxX += maxSize;
            maxY += maxSize;
            maxZ += maxSize;
        }

        return {minX, minY, minZ, maxX, maxY, maxZ}
    }

}
