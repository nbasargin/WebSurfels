import { SubgridCell } from '../octree/node-subgrid';

export class LevelOfDetail2 {

    public static subcellToPoint({positions, sizes, colors, normals, weights}: SubgridCell) {

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

        const size = Math.min(constAreaSize, maxRadius); // maxRadius * Math.sqrt(2)

        return {
            x, y, z,
            r, g, b,
            nx, ny, nz,
            size,
            weight: weightSum
        }
    }


    public static getCellIndex(pos, min, size, resolution) {
        const index = Math.floor((pos - min) / size * resolution);
        return Math.max(0, Math.min(resolution - 1, index));
    }


}
