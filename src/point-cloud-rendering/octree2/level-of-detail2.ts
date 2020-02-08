import { NodeSubgrid, SubgridCell } from '../octree/node-subgrid';
import { LeafNode } from './leaf-node';
import { LodNode } from './lod-node';

export class LevelOfDetail2 {

    private static subgrid = new NodeSubgrid(64);

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

    public static leafToLod(leaf: LeafNode): LodNode {
        // todo: do more efficient conversion if node could have been split but is not
        // in that case, every subcell is guaranteed to contain at most one point

        const ni = leaf.nodeInfo;
        // todo make this object oriented
        if (LevelOfDetail2.subgrid.resolution !== ni.resolution) {
            LevelOfDetail2.subgrid = new NodeSubgrid(ni.resolution);
        } else {
            LevelOfDetail2.subgrid.clear();
        }

        // sort all the points into subgrid
        for (let i = 0; i < leaf.pointCount; i++) {
            // based on position, determine cell
            const px = LevelOfDetail2.getCellIndex(leaf.positions[i * 3], leaf.minX, ni.size, ni.resolution);
            const py = LevelOfDetail2.getCellIndex(leaf.positions[i * 3 + 1], leaf.minY, ni.size, ni.resolution);
            const pz = LevelOfDetail2.getCellIndex(leaf.positions[i * 3 + 2], leaf.minZ, ni.size, ni.resolution);
            const index = px + py * ni.resolution + (pz * ni.resolution ** 2);

            if (px < 0 || py < 0 || pz < 0) {
                console.log('invalid index', px, py, pz)
            }
            if (px >= ni.resolution || py >= ni.resolution || pz >= ni.resolution) {
                console.log('invalid index', px, py, pz);
                console.log('without floor', (leaf.positions[i * 3] - leaf.minX) / ni.size * ni.resolution)
            }

            // put point into cell
            const cell = LevelOfDetail2.subgrid.grid[index];
            cell.positions.push(leaf.positions[i * 3]);
            cell.positions.push(leaf.positions[i * 3 + 1]);
            cell.positions.push(leaf.positions[i * 3 + 2]);

            cell.sizes.push(leaf.sizes[i]);

            cell.colors.push(leaf.colors[i * 3]);
            cell.colors.push(leaf.colors[i * 3 + 1]);
            cell.colors.push(leaf.colors[i * 3 + 2]);

            cell.normals.push(leaf.normals[i * 3]);
            cell.normals.push(leaf.normals[i * 3 + 1]);
            cell.normals.push(leaf.normals[i * 3 + 2]);

            cell.weights.push(1);
        }

        // merge every subgrid cell
        const mergedPos: Array<number> = [];
        const mergedSizes: Array<number> = [];
        const mergedColors: Array<number> = [];
        const mergedNormals: Array<number> = [];
        const mergedWeights: Array<number> = [];
        for (const cell of LevelOfDetail2.subgrid.grid) {
            if (cell.positions.length === 0) {
                continue;
            }
            const {x, y, z, r, g, b, nx, ny, nz, size, weight} = LevelOfDetail2.subcellToPoint(cell);
            mergedPos.push(x, y, z);
            mergedSizes.push(size);
            mergedColors.push(r, g, b);
            mergedNormals.push(nx, ny, nz);
            mergedWeights.push(weight);
        }

        return {
            nodeInfo: ni,
            positions: new Float32Array(mergedPos),
            sizes: new Float32Array(mergedSizes),
            colors: new Float32Array(mergedColors),
            normals: new Float32Array(mergedNormals),
            weights: new Float32Array(mergedWeights),
            children: []
        };
    }

    public static getCellIndex(pos, min, size, resolution) {
        const index = Math.floor((pos - min) / size * resolution);
        return Math.max(0, Math.min(resolution - 1, index));
    }


}
