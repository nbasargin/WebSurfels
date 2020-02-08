import { NodeSubgrid } from './node-subgrid';
import { StaticOctreeNode } from './static-octree-node';

export class LevelOfDetail {

    private static readonly spacing = 64;
    private static readonly subgrid = new NodeSubgrid(LevelOfDetail.spacing);

    /**
     * Merge multiple points into one
     */
    public static mergeToOne(positions: Array<number>, sizes: Array<number>, colors: Array<number>, normals: Array<number>, weights: Array<number>) {

        const numPoints = positions.length / 3;
        let x = 0, y = 0, z = 0;
        let r = 0, g = 0, b = 0;
        let nx = 0, ny = 0, nz = 0;
        let squaredSizeSum = 0;
        let weightSum = 0;
        for (let i = 0; i < numPoints; i++) {
            const weight = weights[i];
            const size = sizes[i];
            weightSum += weight;
            squaredSizeSum += size * size;

            x += positions[i * 3] * weight;
            y += positions[i * 3 + 1] * weight;
            z += positions[i * 3 + 2] * weight;

            r += colors[i * 3] * weight;
            g += colors[i * 3 + 1] * weight;
            b += colors[i * 3 + 2] * weight;

            nx += normals[i * 3] * weight;
            ny += normals[i * 3 + 1] * weight;
            nz += normals[i * 3 + 2] * weight;
        }

        x /= weightSum;
        y /= weightSum;
        z /= weightSum;

        r /= weightSum;
        g /= weightSum;
        b /= weightSum;

        const normalLength = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= normalLength;
        ny /= normalLength;
        nz /= normalLength;

        let constAreaSize = Math.sqrt(squaredSizeSum); // size resulting from keeping the total splat area constant

        // compute size of bounding sphere with position average as center
        let maxRadius = 0;
        for (let i = 0; i < numPoints; i++) {
            const dx = x - positions[i * 3];
            const dy = y - positions[i * 3 + 1];
            const dz = z - positions[i * 3 + 2];
            const radius = Math.sqrt(dx * dx + dy * dy + dz * dz) + sizes[i];
            maxRadius = Math.max(maxRadius, radius);
        }

        const size = Math.min(constAreaSize, maxRadius);

        return {
            x, y, z,
            r, g, b,
            nx, ny, nz,
            size,
            weight: weightSum
        }

    }

    public static mergeToMany(node: StaticOctreeNode): { positions: Float32Array, sizes: Float32Array, colors: Float32Array, normals: Float32Array, weights: Float32Array } {
        const numPoints = node.pointPositions.length / 3;

        LevelOfDetail.subgrid.clear();
        const [x, y, z] = node.nodePosition;
        const spacing = LevelOfDetail.spacing;

        const data = {
            positions: node.pointPositions,
            sizes: node.pointSizes,
            colors: node.pointColors,
            normals: node.pointNormals,
        };

        for (let i = 0; i < numPoints; i++) {
            // based on position, determine cell
            const px = Math.floor((node.pointPositions[i * 3] - x) / node.nodeSize * spacing);
            const py = Math.floor((node.pointPositions[i * 3 + 1] - y) / node.nodeSize * spacing);
            const pz = Math.floor((node.pointPositions[i * 3 + 2] - z) / node.nodeSize * spacing);
            const index = px + py * spacing + pz * spacing ** 2;

            // put point into cell
            const cell = LevelOfDetail.subgrid.grid[index];
            LevelOfDetail.subgrid.addToCell(index, data, i, node.pointWeights[i]);
        }

        // go over all (occupied) cells, merge points in them into one

        return LevelOfDetail.subgrid.mergeByCell(null as any);

    }

}
