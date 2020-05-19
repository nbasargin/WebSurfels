import { PointCloudData, WeightedPointCloudData } from '../data/point-cloud-data';

export type BoundingBox = { minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number };

export type BoundingCube = { minX: number, minY: number, minZ: number, size: number };

export type BoundingSphere = { centerX: number, centerY: number, centerZ: number, radius: number };

export class Geometry {

    public static getBoundingBox(positions: Float32Array, sizes?: Float32Array): BoundingBox {
        if (positions.length === 0) {
            return {minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0};
        }
        let minX = Number.POSITIVE_INFINITY, minY = Number.POSITIVE_INFINITY, minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY, maxZ = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i], y = positions[i + 1], z = positions[i + 2];
            const size = sizes ? sizes[i / 3] / 2 : 0;

            minX = Math.min(minX, x - size);
            minY = Math.min(minY, y - size);
            minZ = Math.min(minZ, z - size);
            maxX = Math.max(maxX, x + size);
            maxY = Math.max(maxY, y + size);
            maxZ = Math.max(maxZ, z + size);
        }

        return {minX, minY, minZ, maxX, maxY, maxZ}
    }

    public static getBoundingSphere(positions: Float32Array, sizes?: Float32Array): BoundingSphere {
        const {centerX, centerY, centerZ} = Geometry.boundingSphereCenterBox(positions, sizes);
        const radius = Geometry.boundingSphereRadiusPerPointSize({centerX, centerY, centerZ}, positions, sizes);
        return {centerX, centerY, centerZ, radius};
    }

    public static sphereDist(s1: BoundingSphere, s2: BoundingSphere) {
        const dx = s1.centerX - s2.centerX;
        const dy = s1.centerY - s2.centerY;
        const dz = s1.centerZ - s2.centerZ;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Bounding sphere center computation: use average of all point positions as center
     */
    private static boundingSphereCenterAveraged(positions: Float32Array) {
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
        return {centerX, centerY, centerZ};
    }

    /**
     * Bounding sphere center computation: use bounding box center as sphere center
     * Usually better than average of all point positions as center.
     */
    private static boundingSphereCenterBox(positions: Float32Array, sizes?: Float32Array) {
        const bb = Geometry.getBoundingBox(positions, sizes);
        const sizeX = bb.maxX - bb.minX;
        const sizeY = bb.maxY - bb.minY;
        const sizeZ = bb.maxZ - bb.minZ;
        const centerX = sizeX / 2 + bb.minX;
        const centerY = sizeY / 2 + bb.minY;
        const centerZ = sizeZ / 2 + bb.minZ;
        return {centerX, centerY, centerZ};
    }

    /**
     * Bounding sphere radius computation: (max of per point distance to center) + (max of point sizes).
     */
    private static boundingSphereRadiusMaxSize({centerX, centerY, centerZ}: {centerX, centerY, centerZ}, positions: Float32Array, sizes?: Float32Array) {
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
            radius += maxSize / 2;
        }
        return radius;
    }

    /**
     * Bounding sphere radius computation: max of (per point distance to center + per point point size).
     * Always better that boundingSphereRadiusMaxSize but a bit slower.
     */
    private static boundingSphereRadiusPerPointSize({centerX, centerY, centerZ}: {centerX, centerY, centerZ}, positions: Float32Array, sizes?: Float32Array) {
        let radius = 0;
        for (let i = 0; i < positions.length; i += 3) {
            const dx = centerX - positions[i];
            const dy = centerY - positions[i + 1];
            const dz = centerZ - positions[i + 2];
            let r = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (sizes) {
                r += sizes[i / 3] / 2;
            }
            radius = Math.max(radius, r);
        }
        return radius;
    }

}
