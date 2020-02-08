import { PointCloudData } from '../data/point-cloud-data';
import { LodNode } from './lod-node';
import { OctreeNodeInfo } from './octree-node';

export type SubgridCell = {positions: Array<number>, sizes: Array<number>, colors: Array<number>, normals: Array<number>, weights: Array<number>};

export class NodeSubgrid {

    public static getCellIndex(pos, min, size, resolution) {
        const index = Math.floor((pos - min) / size * resolution);
        return Math.max(0, Math.min(resolution - 1, index));
    }

    grid: Array<SubgridCell>;

    constructor(public readonly resolution: number = 64) {
        this.grid = [];
        const length = resolution ** 3;
        for (let i = 0; i < length; i++) {
            this.grid[i] = {
                positions: [],
                sizes: [],
                colors: [],
                normals: [],
                weights: []
            }
        }
    }

    addToCell(cellIndex: number, data: PointCloudData, pointIndex: number, weight: number) {
        const cell = this.grid[cellIndex];
        cell.positions.push(data.positions[pointIndex * 3]);
        cell.positions.push(data.positions[pointIndex * 3 + 1]);
        cell.positions.push(data.positions[pointIndex * 3 + 2]);

        cell.sizes.push(data.sizes[pointIndex]);

        cell.colors.push(data.colors[pointIndex * 3]);
        cell.colors.push(data.colors[pointIndex * 3 + 1]);
        cell.colors.push(data.colors[pointIndex * 3 + 2]);

        cell.normals.push(data.normals[pointIndex * 3]);
        cell.normals.push(data.normals[pointIndex * 3 + 1]);
        cell.normals.push(data.normals[pointIndex * 3 + 2]);

        cell.weights.push(weight);
    }

    mergeByCell(ni: OctreeNodeInfo, children: Array<LodNode>): LodNode {
        // merge every subgrid cell
        const mergedPos: Array<number> = [];
        const mergedSizes: Array<number> = [];
        const mergedColors: Array<number> = [];
        const mergedNormals: Array<number> = [];
        const mergedWeights: Array<number> = [];
        for (const cell of this.grid) {
            if (cell.positions.length === 0) {
                continue;
            }
            const {x, y, z, r, g, b, nx, ny, nz, size, weight} = this.mergePoints(cell, ni);
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
            children: children
        };
    }

    clear() {
        const length = this.resolution ** 3;
        for (let i = 0; i < length; i++) {
            if (this.grid[i].positions.length > 0) {
                this.grid[i].positions = [];
                this.grid[i].sizes = [];
                this.grid[i].colors = [];
                this.grid[i].normals = [];
                this.grid[i].weights = [];
            }
        }
    }

    /**
     * Merge multiple points into one
     */
    public mergePoints({positions, sizes, colors, normals, weights}: SubgridCell, ni: OctreeNodeInfo) {

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

        const cellSize = ni.size / ni.resolution * Math.sqrt(2);
        const size = Math.min(constAreaSize, maxRadius * Math.sqrt(2), cellSize);

        return {
            x, y, z,
            r, g, b,
            nx, ny, nz,
            size,
            weight: weightSum
        }
    }

}
