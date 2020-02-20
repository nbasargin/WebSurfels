import { WeightedPointCloudData } from '../data/point-cloud-data';

export type BoundingBox = { minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number };

export type BoundingSphere = { centerX: number, centerY: number, centerZ: number, radius: number };

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
        if (positions.length === 0) {
            return {minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0};
        }
        let minX = Number.POSITIVE_INFINITY, minY = Number.POSITIVE_INFINITY, minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY, maxZ = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i], y = positions[i + 1], z = positions[i + 2];
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
        }

        if (sizes) {
            let maxSize = 0;
            for (let i = 0; i < sizes.length; i++) {
                maxSize = Math.max(maxSize, sizes[i]);
            }
            minX -= maxSize / 2;
            minY -= maxSize / 2;
            minZ -= maxSize / 2;
            maxX += maxSize / 2;
            maxY += maxSize / 2;
            maxZ += maxSize / 2;
        }

        return {minX, minY, minZ, maxX, maxY, maxZ}
    }

    public static getBoundingSphere(positions: Float32Array, sizes?: Float32Array): BoundingSphere {
        let centerX = 0, centerY = 0, centerZ = 0;
        for (let i = 0; i < positions.length; i += 3) {
            centerX += positions[i];
            centerY += positions[i + 1];
            centerZ += positions[i + 2];
        }
        const numPoints = positions.length / 3;
        centerX /= numPoints;
        centerY /= numPoints;
        centerZ /= numPoints;

        let maxSqrRadius = 0;
        for (let i = 0; i < positions.length; i += 3) {
            const dx = centerX - positions[i];
            const dy = centerY - positions[i + 1];
            const dz = centerZ - positions[i + 2];
            const sqrRadius = dx * dx + dy * dy + dz * dz;
            maxSqrRadius = Math.max(maxSqrRadius, sqrRadius);
        }
        let radius = Math.sqrt(maxSqrRadius);

        if (sizes) {
            let maxSize = 0;
            for (let i = 0; i < sizes.length; i++) {
                maxSize = Math.max(maxSize, sizes[i]);
            }
            radius += maxSize;
        }

        return {centerX, centerY, centerZ, radius};
    }

}
